export const POSIX_PYTHON_MANIFEST = String.raw`
import re

GIT_OID = re.compile(r'^[0-9a-f]{40}$')
LFS_POINTER = re.compile(
    rb'version https://git-lfs.github.com/spec/v1\n'
    rb'oid sha256:([0-9a-f]{64})\n'
    rb'size ([1-9][0-9]*)\n\Z'
)
MAX_POINTER_BYTES = 512
MAX_SAFE_INTEGER = 9007199254740991
# Resource policy for descriptor-streamed hydrated LFS objects; ordinary reads retain MAX.
MAX_LFS_OBJECT_BYTES = 1024 * 1024 * 1024

def validate_manifest_spec(spec):
    if not isinstance(spec, dict) or set(spec) != {'path', 'mode', 'type', 'object', 'size'}:
        fail('SOURCE_ENVELOPE_POSIX_PROTOCOL', 'invalid manifest entry')
    rel_parts(spec['path'])
    if spec['type'] == 'blob':
        if spec['mode'] not in ('100644', '100755', '120000'):
            fail('SOURCE_ENVELOPE_POSIX_PROTOCOL', 'invalid blob mode')
        if not isinstance(spec['size'], int) or isinstance(spec['size'], bool) or not 0 <= spec['size'] <= MAX_SAFE_INTEGER:
            fail('SOURCE_ENVELOPE_POSIX_PROTOCOL', 'invalid blob size')
    elif spec['type'] == 'commit':
        if spec['mode'] != '160000' or spec['size'] is not None:
            fail('SOURCE_ENVELOPE_POSIX_PROTOCOL', 'invalid gitlink entry')
    else:
        fail('SOURCE_ENVELOPE_POSIX_PROTOCOL', 'invalid manifest type')
    if not isinstance(spec['object'], str) or not GIT_OID.fullmatch(spec['object']):
        fail('SOURCE_ENVELOPE_POSIX_PROTOCOL', 'invalid Git object')
    return dict(spec)

def checked_git_output(source, config, argv, input_bytes):
    [result] = git_batch(source, config, {'commands': [{
        'argv': argv,
        'input': base64.b64encode(input_bytes).decode('ascii'),
        'disable_hooks': True,
    }]})
    if result['status'] != 0:
        detail = base64.b64decode(result['stderr']).decode('utf-8', 'replace').strip()
        fail('SOURCE_ENVELOPE_GIT_CHECK_FAILED', detail or argv[0])
    return base64.b64decode(result['stdout'])

def parse_attributes(output, specs):
    fields = output.split(b'\0')
    if not fields or fields[-1] != b'' or len(fields) != len(specs) * 3 + 1:
        fail('SOURCE_ENVELOPE_GIT_ATTRIBUTE', 'invalid check-attr framing')
    values = {}
    for index, spec in enumerate(specs):
        path_raw, attribute, value = fields[index * 3:index * 3 + 3]
        if path_raw != spec['path'].encode('utf-8') or attribute != b'filter':
            fail('SOURCE_ENVELOPE_GIT_ATTRIBUTE', spec['path'])
        if value not in (b'unspecified', b'unset', b'lfs'):
            fail('SOURCE_ENVELOPE_GIT_FILTER', spec['path'])
        values[spec['path']] = value
    return values

def parse_batch_check(output, specs):
    lines = output.splitlines()
    if len(lines) != len(specs):
        fail('SOURCE_ENVELOPE_LFS_POINTER', 'invalid batch-check framing')
    for line, spec in zip(lines, specs):
        fields = line.split(b' ')
        expected = [spec['object'].encode('ascii'), b'blob', str(spec['size']).encode('ascii')]
        if fields != expected or spec['size'] > MAX_POINTER_BYTES:
            fail('SOURCE_ENVELOPE_LFS_POINTER', spec['path'])

def parse_pointer_batch(output, specs):
    cursor = 0
    pointers = {}
    for spec in specs:
        end = output.find(b'\n', cursor)
        if end < 0:
            fail('SOURCE_ENVELOPE_LFS_POINTER', 'missing cat-file header')
        expected = f"{spec['object']} blob {spec['size']}".encode('ascii')
        if output[cursor:end] != expected:
            fail('SOURCE_ENVELOPE_LFS_POINTER', spec['path'])
        cursor = end + 1
        pointer = output[cursor:cursor + spec['size']]
        cursor += spec['size']
        if len(pointer) != spec['size'] or output[cursor:cursor + 1] != b'\n':
            fail('SOURCE_ENVELOPE_LFS_POINTER', 'invalid cat-file framing')
        cursor += 1
        git_hash = hashlib.sha1(b'blob ' + str(len(pointer)).encode() + b'\x00' + pointer).hexdigest()
        if git_hash != spec['object']:
            fail('SOURCE_ENVELOPE_LFS_POINTER', spec['path'])
        match = LFS_POINTER.fullmatch(pointer)
        if match is None:
            fail('SOURCE_ENVELOPE_LFS_POINTER', spec['path'])
        size = int(match.group(2))
        if size > MAX_SAFE_INTEGER:
            fail('SOURCE_ENVELOPE_LFS_POINTER', spec['path'])
        if size > MAX_LFS_OBJECT_BYTES:
            fail('SOURCE_ENVELOPE_LFS_SIZE_LIMIT', spec['path'])
        pointers[spec['path']] = {
            'version': 'https://git-lfs.github.com/spec/v1',
            'oid_sha256': match.group(1).decode('ascii'),
            'size': size,
            'pointer_bytes': len(pointer),
            'pointer_git_blob_sha1': git_hash,
            'pointer_sha256': hashlib.sha256(pointer).hexdigest(),
        }
    if cursor != len(output):
        fail('SOURCE_ENVELOPE_LFS_POINTER', 'trailing cat-file data')
    return pointers

def prepare_manifest_specs(source, config, raw_specs):
    specs = [validate_manifest_spec(spec) for spec in raw_specs]
    attributes = parse_attributes(checked_git_output(
        source, config, ['check-attr', '--cached', '-z', '--stdin', 'filter'],
        b''.join(spec['path'].encode('utf-8') + b'\0' for spec in specs),
    ), specs)
    lfs_specs = []
    for spec in specs:
        if attributes[spec['path']] == b'lfs':
            if spec['type'] != 'blob' or spec['mode'] not in ('100644', '100755'):
                fail('SOURCE_ENVELOPE_LFS_POINTER', spec['path'])
            lfs_specs.append(spec)
    if lfs_specs:
        objects = b''.join(spec['object'].encode('ascii') + b'\n' for spec in lfs_specs)
        checks = checked_git_output(
            source, config, ['cat-file', '--batch-check=%(objectname) %(objecttype) %(objectsize)'], objects,
        )
        parse_batch_check(checks, lfs_specs)
        pointers = parse_pointer_batch(
            checked_git_output(source, config, ['cat-file', '--batch'], objects), lfs_specs,
        )
        for spec in specs:
            if spec['path'] in pointers:
                spec['lfs'] = pointers[spec['path']]
    return specs

def stream_regular_manifest(parent, name, spec, initial):
    fd = open_regular(parent, name)
    try:
        before = idstat(os.fstat(fd))
        require_identity(before, initial, 'SOURCE_ENVELOPE_ENTRY_CHANGED', FULL_KEYS)
        lfs = spec.get('lfs')
        expected_size = lfs['size'] if lfs is not None else spec['size']
        mismatch_code = 'SOURCE_ENVELOPE_LFS_OBJECT_MISMATCH' if lfs is not None else 'SOURCE_ENVELOPE_TRACKED_CONTENT'
        if int(before['size']) != expected_size:
            fail(mismatch_code, spec['path'])
        digest = hashlib.sha256()
        git_digest = None if lfs is not None else hashlib.sha1(b'blob ' + str(expected_size).encode() + b'\x00')
        total = 0
        while True:
            chunk = os.read(fd, 65536)
            if not chunk:
                break
            total += len(chunk)
            if total > expected_size:
                fail(mismatch_code, spec['path'])
            digest.update(chunk)
            if git_digest is not None:
                git_digest.update(chunk)
        after = idstat(os.fstat(fd))
        require_identity(after, before, 'SOURCE_ENVELOPE_ENTRY_CHANGED', FULL_KEYS)
        require_identity(idstat(os.stat(name, dir_fd=parent, follow_symlinks=False)), after, 'SOURCE_ENVELOPE_ENTRY_CHANGED', FULL_KEYS)
        if total != expected_size:
            fail(mismatch_code, spec['path'])
        sha256 = digest.hexdigest()
        if lfs is not None:
            if sha256 != lfs['oid_sha256']:
                fail(mismatch_code, spec['path'])
            git_blob_sha1 = lfs['pointer_git_blob_sha1']
        else:
            git_blob_sha1 = git_digest.hexdigest()
            if git_blob_sha1 != spec['object']:
                fail(mismatch_code, spec['path'])
        result = {
            'path': spec['path'], 'type': 'blob',
            'mode': '100755' if after['mode'] & 0o111 else '100644',
            'bytes': total, 'sha256': sha256, 'git_blob_sha1': git_blob_sha1,
        }
        if lfs is not None:
            result['lfs'] = lfs
        return result
    finally:
        os.close(fd)

def inspect_manifest_entry(source, spec):
    parent, name = walk_rel_parent(source, spec['path'])
    try:
        initial = idstat(os.stat(name, dir_fd=parent, follow_symlinks=False))
        if initial['type'] == 'file':
            return stream_regular_manifest(parent, name, spec, initial)
        if initial['type'] == 'symlink':
            data = os.fsencode(os.readlink(name, dir_fd=parent))
            final = idstat(os.stat(name, dir_fd=parent, follow_symlinks=False))
            require_identity(final, initial, 'SOURCE_ENVELOPE_ENTRY_CHANGED', FULL_KEYS)
            git_hash = hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\x00' + data).hexdigest()
            if spec.get('lfs') is not None or spec['mode'] != '120000' or len(data) != spec['size'] or git_hash != spec['object']:
                fail('SOURCE_ENVELOPE_TRACKED_CONTENT', spec['path'])
            return {'path': spec['path'], 'type': 'symlink', 'mode': '120000', 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(), 'git_blob_sha1': git_hash}
        if initial['type'] == 'dir' and spec['type'] == 'commit' and spec['mode'] == '160000':
            final = idstat(os.stat(name, dir_fd=parent, follow_symlinks=False))
            require_identity(final, initial, 'SOURCE_ENVELOPE_ENTRY_CHANGED', FULL_KEYS)
            return {'path': spec['path'], 'type': 'gitlink', 'mode': '160000', 'bytes': 0, 'sha256': None, 'git_blob_sha1': None}
        fail('SOURCE_ENVELOPE_TRACKED_CONTENT', spec['path'])
    finally:
        os.close(parent)
`;
