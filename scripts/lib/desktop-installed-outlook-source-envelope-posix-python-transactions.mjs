export const POSIX_PYTHON_TRANSACTIONS = String.raw`
import fcntl, secrets

LEAF_KEYS = ('dev', 'ino', 'uid', 'gid', 'mode', 'type', 'nlink', 'size')

def leaf_name(raw):
    if not isinstance(raw, str) or not raw or len(raw.encode('utf-8')) > 96 or raw in ('.', '..') or '/' in raw or '\\' in raw or '\x00' in raw:
        fail('SOURCE_ENVELOPE_EVIDENCE_NAME', 'invalid fixed evidence basename')
    return raw

def transaction_names(config):
    return {key: leaf_name(config[key]) for key in ('payload_name', 'completion_name', 'journal_name', 'lock_name')}

def require_leaf(current, code='SOURCE_ENVELOPE_OUTPUT_INTEGRITY'):
    if current['type'] != 'file' or current['uid'] != str(os.getuid()) or current['mode'] != 0o600 or current['nlink'] != 1:
        fail(code, 'evidence leaf identity is unsafe')

def ensure_absent(directory, name):
    try:
        current = idstat(os.stat(name, dir_fd=directory, follow_symlinks=False))
    except FileNotFoundError:
        return
    fail('SOURCE_ENVELOPE_OUTPUT_EXISTS', name + ':' + current['type'])

def require_journal_absent(directory, name):
    try:
        current = idstat(os.stat(name, dir_fd=directory, follow_symlinks=False))
    except FileNotFoundError:
        return
    if current['type'] != 'file' or current['uid'] != str(os.getuid()) or current['mode'] != 0o600 or current['nlink'] != 1:
        fail('SOURCE_ENVELOPE_JOURNAL_INVALID', 'publication journal identity is unsafe')
    fail('SOURCE_ENVELOPE_PUBLISHING', 'durable publication journal exists')

def open_lock(directory, name, create):
    flags = os.O_RDWR | os.O_NOFOLLOW | os.O_CLOEXEC
    if create:
        try:
            fd = os.open(name, flags | os.O_CREAT | os.O_EXCL, 0o600, dir_fd=directory)
        except FileExistsError:
            fd = os.open(name, flags, dir_fd=directory)
    else:
        try:
            fd = os.open(name, flags, dir_fd=directory)
        except FileNotFoundError:
            fail('SOURCE_ENVELOPE_INCOMPLETE', 'publication lock is absent')
    current = idstat(os.fstat(fd))
    require_leaf(current, 'SOURCE_ENVELOPE_LOCK_INVALID')
    path_current = idstat(os.stat(name, dir_fd=directory, follow_symlinks=False))
    require_identity(path_current, current, 'SOURCE_ENVELOPE_LOCK_INVALID', FULL_KEYS)
    return fd

def write_all(fd, data):
    offset = 0
    while offset < len(data):
        written = os.write(fd, data[offset:])
        if written <= 0:
            fail('SOURCE_ENVELOPE_POSIX_FAILED', 'short evidence write')
        offset += written

def create_held(directory, name, data):
    fd = os.open(name, os.O_RDWR | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW | os.O_CLOEXEC, 0o600, dir_fd=directory)
    try:
        write_all(fd, data)
        os.fchmod(fd, 0o600)
        os.fsync(fd)
        os.lseek(fd, 0, os.SEEK_SET)
        observed = read_all(fd)
        current = idstat(os.fstat(fd))
        require_leaf(current)
        if observed != data:
            fail('SOURCE_ENVELOPE_OUTPUT_INTEGRITY', 'evidence re-read mismatch')
        path_current = idstat(os.stat(name, dir_fd=directory, follow_symlinks=False))
        require_identity(path_current, current, 'SOURCE_ENVELOPE_OUTPUT_INTEGRITY', FULL_KEYS)
        return fd, current
    except Exception:
        os.close(fd)
        raise

def held_read(directory, name):
    fd, current, data = stable_read(directory, name)
    require_leaf(current)
    path_current = idstat(os.stat(name, dir_fd=directory, follow_symlinks=False))
    require_identity(path_current, current, 'SOURCE_ENVELOPE_OUTPUT_INTEGRITY', FULL_KEYS)
    return fd, current, data

def unlink_owned(directory, name, held):
    try:
        current = idstat(os.stat(name, dir_fd=directory, follow_symlinks=False))
    except FileNotFoundError:
        return
    held_identity = idstat(os.fstat(held))
    require_identity(current, held_identity, 'SOURCE_ENVELOPE_OUTPUT_INTEGRITY', ('dev', 'ino', 'type'))
    os.unlink(name, dir_fd=directory)

def require_owned_path(directory, name, held, code='SOURCE_ENVELOPE_OUTPUT_INTEGRITY'):
    current = idstat(os.stat(name, dir_fd=directory, follow_symlinks=False))
    require_identity(current, idstat(os.fstat(held)), code, FULL_KEYS)

def read_exact(length):
    if not isinstance(length, int) or length < 0 or length > MAX:
        fail('SOURCE_ENVELOPE_SIZE_LIMIT', 'invalid framed payload length')
    chunks = []
    remaining = length
    while remaining:
        chunk = sys.stdin.buffer.read(remaining)
        if not chunk:
            fail('SOURCE_ENVELOPE_POSIX_PROTOCOL', 'truncated framed payload')
        chunks.append(chunk)
        remaining -= len(chunk)
    return b''.join(chunks)

def read_control():
    line = sys.stdin.buffer.readline(MAX + 1)
    if not line or len(line) > MAX:
        fail('SOURCE_ENVELOPE_POSIX_PROTOCOL', 'missing or oversized control message')
    try:
        return json.loads(line.decode('utf-8'))
    except Exception as error:
        fail('SOURCE_ENVELOPE_POSIX_PROTOCOL', type(error).__name__)

def restore_journal(directory, name, data):
    try:
        fd, _ = create_held(directory, name, data)
        os.close(fd)
        os.fsync(directory)
    except Exception:
        pass

def publication_transaction(config):
    names = transaction_names(config)
    payload = read_exact(config.get('payload_length'))
    if hashlib.sha256(payload).hexdigest() != config.get('payload_sha256'):
        fail('SOURCE_ENVELOPE_OUTPUT_INTEGRITY', 'payload frame hash mismatch')
    source = open_source(config)
    evidence = lock_fd = journal_fd = payload_fd = completion_fd = None
    payload_candidate = completion_candidate = None
    journal_bytes = None
    journal_removed = False
    try:
        evidence = open_evidence(source, config)
        lock_fd = open_lock(evidence, names['lock_name'], create=True)
        fcntl.flock(lock_fd, fcntl.LOCK_EX)
        require_owned_path(evidence, names['lock_name'], lock_fd, 'SOURCE_ENVELOPE_LOCK_INVALID')
        require_journal_absent(evidence, names['journal_name'])
        ensure_absent(evidence, names['payload_name'])
        ensure_absent(evidence, names['completion_name'])

        transaction_id = secrets.token_hex(16)
        journal_bytes = (transaction_id + '\n').encode('ascii')
        journal_fd, _ = create_held(evidence, names['journal_name'], journal_bytes)
        os.fsync(evidence)
        payload_candidate = '.' + names['payload_name'] + '.' + transaction_id + '.candidate'
        payload_fd, payload_identity = create_held(evidence, payload_candidate, payload)
        revalidate_source(config, source)
        revalidate_evidence(source, evidence, config)
        emit({'ok': True, 'phase': 'READY', 'payload_identity': projection(payload_identity, LEAF_KEYS), 'evidence_identity': projection(idstat(os.fstat(evidence)), ROOT_KEYS)})

        control = read_control()
        if control.get('command') != 'COMMIT':
            fail('SOURCE_ENVELOPE_PUBLICATION_ABORTED', 'publisher verification did not authorize completion')
        try:
            marker = base64.b64decode(control.get('completion', ''), validate=True)
        except Exception:
            fail('SOURCE_ENVELOPE_POSIX_PROTOCOL', 'invalid completion frame')
        if len(marker) > MAX:
            fail('SOURCE_ENVELOPE_SIZE_LIMIT', 'completion exceeds limit')
        completion_candidate = '.' + names['completion_name'] + '.' + transaction_id + '.candidate'
        completion_fd, _ = create_held(evidence, completion_candidate, marker)

        revalidate_source(config, source)
        revalidate_evidence(source, evidence, config)
        ensure_absent(evidence, names['payload_name'])
        ensure_absent(evidence, names['completion_name'])
        require_owned_path(evidence, payload_candidate, payload_fd)
        os.link(payload_candidate, names['payload_name'], src_dir_fd=evidence, dst_dir_fd=evidence, follow_symlinks=False)
        unlink_owned(evidence, payload_candidate, payload_fd)
        final_payload = idstat(os.stat(names['payload_name'], dir_fd=evidence, follow_symlinks=False))
        require_leaf(final_payload)
        require_identity(final_payload, idstat(os.fstat(payload_fd)), 'SOURCE_ENVELOPE_OUTPUT_INTEGRITY', LEAF_KEYS)
        require_owned_path(evidence, completion_candidate, completion_fd)
        os.link(completion_candidate, names['completion_name'], src_dir_fd=evidence, dst_dir_fd=evidence, follow_symlinks=False)
        unlink_owned(evidence, completion_candidate, completion_fd)
        final_completion = idstat(os.stat(names['completion_name'], dir_fd=evidence, follow_symlinks=False))
        require_leaf(final_completion)
        require_identity(final_completion, idstat(os.fstat(completion_fd)), 'SOURCE_ENVELOPE_OUTPUT_INTEGRITY', LEAF_KEYS)
        os.fsync(evidence)
        revalidate_source(config, source)
        revalidate_evidence(source, evidence, config)

        unlink_owned(evidence, names['journal_name'], journal_fd)
        journal_removed = True
        os.fsync(evidence)
        require_journal_absent(evidence, names['journal_name'])
        require_owned_path(evidence, names['lock_name'], lock_fd, 'SOURCE_ENVELOPE_LOCK_INVALID')
        revalidate_source(config, source)
        revalidate_evidence(source, evidence, config)
        emit({'ok': True, 'phase': 'DONE', 'payload_identity': projection(final_payload, LEAF_KEYS), 'completion_identity': projection(final_completion, LEAF_KEYS)})
    except Exception:
        if evidence is not None:
            if payload_candidate and payload_fd is not None:
                try: unlink_owned(evidence, payload_candidate, payload_fd)
                except Exception: pass
            if completion_candidate and completion_fd is not None:
                try: unlink_owned(evidence, completion_candidate, completion_fd)
                except Exception: pass
            if journal_removed and journal_bytes is not None:
                restore_journal(evidence, names['journal_name'], journal_bytes)
            try:
                os.fsync(evidence)
            except Exception:
                pass
        raise
    finally:
        for fd in (completion_fd, payload_fd, journal_fd, lock_fd, evidence, source):
            if fd is not None:
                try: os.close(fd)
                except Exception: pass

def reader_transaction(config):
    names = transaction_names(config)
    source = open_source(config)
    evidence = lock_fd = payload_fd = completion_fd = None
    try:
        evidence = open_evidence(source, config)
        lock_fd = open_lock(evidence, names['lock_name'], create=False)
        fcntl.flock(lock_fd, fcntl.LOCK_SH)
        require_owned_path(evidence, names['lock_name'], lock_fd, 'SOURCE_ENVELOPE_LOCK_INVALID')
        require_journal_absent(evidence, names['journal_name'])
        payload_fd, payload_identity, payload = held_read(evidence, names['payload_name'])
        completion_fd, completion_identity, completion = held_read(evidence, names['completion_name'])
        revalidate_source(config, source)
        revalidate_evidence(source, evidence, config)
        emit({
            'ok': True, 'phase': 'READY',
            'payload': base64.b64encode(payload).decode('ascii'),
            'completion': base64.b64encode(completion).decode('ascii'),
            'payload_identity': projection(payload_identity, LEAF_KEYS),
            'completion_identity': projection(completion_identity, LEAF_KEYS),
            'evidence_identity': projection(idstat(os.fstat(evidence)), ROOT_KEYS),
        })
        control = read_control()
        if control.get('command') != 'FINISH':
            fail('SOURCE_ENVELOPE_READER_ABORTED', 'reader validation did not finish')
        for fd, expected, expected_bytes, name in (
            (payload_fd, payload_identity, payload, names['payload_name']),
            (completion_fd, completion_identity, completion, names['completion_name']),
        ):
            os.lseek(fd, 0, os.SEEK_SET)
            observed = read_all(fd)
            current = idstat(os.fstat(fd))
            require_identity(current, expected, 'SOURCE_ENVELOPE_OUTPUT_INTEGRITY', FULL_KEYS)
            if observed != expected_bytes:
                fail('SOURCE_ENVELOPE_OUTPUT_INTEGRITY', 'locked evidence bytes changed')
            path_current = idstat(os.stat(name, dir_fd=evidence, follow_symlinks=False))
            require_identity(path_current, current, 'SOURCE_ENVELOPE_OUTPUT_INTEGRITY', FULL_KEYS)
        require_journal_absent(evidence, names['journal_name'])
        require_owned_path(evidence, names['lock_name'], lock_fd, 'SOURCE_ENVELOPE_LOCK_INVALID')
        revalidate_source(config, source)
        revalidate_evidence(source, evidence, config)
        emit({'ok': True, 'phase': 'DONE'})
    finally:
        for fd in (completion_fd, payload_fd, lock_fd, evidence, source):
            if fd is not None:
                try: os.close(fd)
                except Exception: pass
`;
