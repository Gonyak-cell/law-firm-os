export const POSIX_PYTHON_BASE = String.raw`
import base64, hashlib, json, os, stat, subprocess, sys

ROOT = 3
MAX = 256 * 1024 * 1024
ROOT_KEYS = ('dev', 'ino', 'uid', 'gid', 'mode', 'type')
FULL_KEYS = ROOT_KEYS + ('nlink', 'size', 'mtime_ns', 'ctime_ns')

class Failure(Exception):
    def __init__(self, code, detail):
        super().__init__(detail)
        self.code = code
        self.detail = detail

def fail(code, detail):
    raise Failure(code, detail)

def emit(value):
    sys.stdout.write(json.dumps(value, separators=(',', ':')) + '\n')
    sys.stdout.flush()

def decode_config():
    try:
        return json.loads(base64.b64decode(sys.argv[2]).decode('utf-8'))
    except Exception as error:
        fail('SOURCE_ENVELOPE_POSIX_PROTOCOL', type(error).__name__)

def abs_parts(raw, allow_root=False):
    if not isinstance(raw, str) or not raw.startswith('/') or '\x00' in raw or '\\' in raw:
        fail('SOURCE_ENVELOPE_PATH', 'absolute path required')
    if raw == '/':
        if allow_root:
            return []
        fail('SOURCE_ENVELOPE_PATH', 'filesystem root is not a leaf path')
    parts = raw[1:].split('/')
    if any(part in ('', '.', '..') for part in parts):
        fail('SOURCE_ENVELOPE_PATH', 'invalid absolute path component')
    return parts

def rel_parts(raw):
    if not isinstance(raw, str) or not raw or raw.startswith('/') or '\x00' in raw or '\\' in raw:
        fail('SOURCE_ENVELOPE_PATH', 'relative path required')
    parts = raw.split('/')
    if any(part in ('', '.', '..') for part in parts):
        fail('SOURCE_ENVELOPE_PATH', 'invalid relative path component')
    return parts

def idstat(value):
    kind = 'file' if stat.S_ISREG(value.st_mode) else 'dir' if stat.S_ISDIR(value.st_mode) else 'symlink' if stat.S_ISLNK(value.st_mode) else 'other'
    return {
        'dev': str(value.st_dev), 'ino': str(value.st_ino),
        'uid': str(value.st_uid), 'gid': str(value.st_gid),
        'mode': value.st_mode & 0o777, 'type': kind,
        'nlink': value.st_nlink, 'size': str(value.st_size),
        'mtime_ns': str(getattr(value, 'st_mtime_ns', int(value.st_mtime * 1e9))),
        'ctime_ns': str(getattr(value, 'st_ctime_ns', int(value.st_ctime * 1e9))),
    }

def projection(value, keys=ROOT_KEYS):
    return {key: value.get(key) for key in keys}

def require_identity(current, expected, code, keys=ROOT_KEYS):
    if projection(current, keys) != projection(expected, keys):
        fail(code, 'descriptor identity changed')

def opendir(parent, name):
    return os.open(name, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW | os.O_CLOEXEC, dir_fd=parent)

def walk_abs_dir(raw):
    fd = os.dup(ROOT)
    try:
        for component in abs_parts(raw, allow_root=True):
            next_fd = opendir(fd, component)
            os.close(fd)
            fd = next_fd
        return fd
    except Exception:
        os.close(fd)
        raise

def walk_rel_parent(root, raw):
    parts = rel_parts(raw)
    fd = os.dup(root)
    try:
        for component in parts[:-1]:
            next_fd = opendir(fd, component)
            os.close(fd)
            fd = next_fd
        return fd, parts[-1]
    except Exception:
        os.close(fd)
        raise

def walk_abs_parent(raw):
    parts = abs_parts(raw)
    fd = os.dup(ROOT)
    try:
        for component in parts[:-1]:
            next_fd = opendir(fd, component)
            os.close(fd)
            fd = next_fd
        return fd, parts[-1]
    except Exception:
        os.close(fd)
        raise

def open_source(config, require_expected=True):
    fd = walk_abs_dir(config['source_path'])
    current = idstat(os.fstat(fd))
    if current['type'] != 'dir':
        os.close(fd)
        fail('SOURCE_ENVELOPE_SOURCE_ROOT_CHANGED', 'source root is not a directory')
    if require_expected:
        require_identity(current, config['source_identity'], 'SOURCE_ENVELOPE_SOURCE_ROOT_CHANGED')
    return fd

def revalidate_source(config, held):
    current = walk_abs_dir(config['source_path'])
    try:
        require_identity(idstat(os.fstat(current)), idstat(os.fstat(held)), 'SOURCE_ENVELOPE_SOURCE_ROOT_CHANGED')
    finally:
        os.close(current)

def open_evidence(source, config, create=False, secure_final=False):
    parts = rel_parts(config['evidence_relative'])
    fd = os.dup(source)
    try:
        for index, component in enumerate(parts):
            try:
                next_fd = opendir(fd, component)
            except FileNotFoundError:
                if not create:
                    raise
                os.mkdir(component, 0o700, dir_fd=fd)
                next_fd = opendir(fd, component)
            os.close(fd)
            fd = next_fd
            current = idstat(os.fstat(fd))
            if current['type'] != 'dir' or current['uid'] not in (str(os.getuid()), '0') or current['mode'] & 0o022:
                fail('SOURCE_ENVELOPE_EVIDENCE_ROOT_UNSAFE', 'unsafe evidence ancestor')
            if index == len(parts) - 1 and secure_final:
                if current['uid'] != str(os.getuid()):
                    fail('SOURCE_ENVELOPE_EVIDENCE_ROOT_UNSAFE', 'evidence root owner mismatch')
                os.fchmod(fd, 0o700)
        current = idstat(os.fstat(fd))
        if current['uid'] != str(os.getuid()) or current['mode'] != 0o700 or current['type'] != 'dir':
            fail('SOURCE_ENVELOPE_EVIDENCE_ROOT_UNSAFE', 'evidence root must be owner-only')
        if config.get('evidence_identity') is not None:
            require_identity(current, config['evidence_identity'], 'SOURCE_ENVELOPE_EVIDENCE_ROOT_CHANGED')
        return fd
    except Exception:
        os.close(fd)
        raise

def revalidate_evidence(source, held, config):
    current = open_evidence(source, config)
    try:
        require_identity(idstat(os.fstat(current)), idstat(os.fstat(held)), 'SOURCE_ENVELOPE_EVIDENCE_ROOT_CHANGED')
    finally:
        os.close(current)

def read_all(fd):
    chunks = []
    total = 0
    while True:
        chunk = os.read(fd, 65536)
        if not chunk:
            break
        total += len(chunk)
        if total > MAX:
            fail('SOURCE_ENVELOPE_SIZE_LIMIT', 'entry exceeds limit')
        chunks.append(chunk)
    return b''.join(chunks)

def open_regular(parent, name):
    fd = os.open(name, os.O_RDONLY | os.O_NOFOLLOW | os.O_CLOEXEC, dir_fd=parent)
    current = idstat(os.fstat(fd))
    if current['type'] != 'file':
        os.close(fd)
        fail('SOURCE_ENVELOPE_SOURCE_CONTENT', 'regular file required')
    return fd

def stable_read(parent, name):
    fd = open_regular(parent, name)
    try:
        before = idstat(os.fstat(fd))
        data = read_all(fd)
        after = idstat(os.fstat(fd))
        require_identity(after, before, 'SOURCE_ENVELOPE_ENTRY_CHANGED', FULL_KEYS)
        return fd, after, data
    except Exception:
        os.close(fd)
        raise

def inspect_name(parent, name, include_bytes=False):
    initial = idstat(os.stat(name, dir_fd=parent, follow_symlinks=False))
    if initial['type'] == 'file':
        fd, current, data = stable_read(parent, name)
        os.close(fd)
        result = {'identity': current, 'sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data)}
        if include_bytes:
            result['data'] = base64.b64encode(data).decode('ascii')
    elif initial['type'] == 'symlink':
        target = os.readlink(name, dir_fd=parent)
        after = idstat(os.stat(name, dir_fd=parent, follow_symlinks=False))
        require_identity(after, initial, 'SOURCE_ENVELOPE_ENTRY_CHANGED', FULL_KEYS)
        data = os.fsencode(target)
        result = {'identity': after, 'target': base64.b64encode(data).decode('ascii'), 'bytes': len(data)}
    else:
        result = {'identity': initial}
    final = idstat(os.stat(name, dir_fd=parent, follow_symlinks=False))
    require_identity(final, initial, 'SOURCE_ENVELOPE_ENTRY_CHANGED', FULL_KEYS)
    return result

def inspect_entry(root, raw, include_bytes=False):
    parent, name = walk_rel_parent(root, raw)
    try:
        return inspect_name(parent, name, include_bytes)
    finally:
        os.close(parent)

`;
