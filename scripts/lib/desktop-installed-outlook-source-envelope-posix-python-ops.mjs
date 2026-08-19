export const POSIX_PYTHON_OPS = String.raw`
def read_request():
    data = sys.stdin.buffer.read(MAX + 1)
    if len(data) > MAX:
        fail('SOURCE_ENVELOPE_SIZE_LIMIT', 'request exceeds limit')
    if not data:
        return None
    try:
        return json.loads(data.decode('utf-8'))
    except Exception as error:
        fail('SOURCE_ENVELOPE_POSIX_PROTOCOL', type(error).__name__)

def require_root_descriptor(config):
    current = idstat(os.fstat(ROOT))
    if current['type'] != 'dir' or current['uid'] != '0' or current['mode'] & 0o022:
        fail('SOURCE_ENVELOPE_ROOT_UNSAFE', 'unsafe inherited root descriptor')
    require_identity(current, config['filesystem_root_identity'], 'SOURCE_ENVELOPE_ROOT_UNSAFE')
    require_identity(idstat(os.stat('/')), current, 'SOURCE_ENVELOPE_ROOT_UNSAFE')

def require_running_python(config):
    if sys.executable != config.get('python_path'):
        fail('SOURCE_ENVELOPE_TOOLCHAIN_CHANGED', 'running Python path differs from the bound actual binary')
    parent, name = walk_abs_parent(config['python_path'])
    try:
        fd = open_regular(parent, name)
    finally:
        os.close(parent)
    try:
        require_identity(idstat(os.fstat(fd)), config['python_identity'], 'SOURCE_ENVELOPE_TOOLCHAIN_CHANGED', FULL_KEYS)
    finally:
        os.close(fd)

def inspect_batch(source, request, absolute=False):
    entries = request.get('entries') if isinstance(request, dict) else None
    if not isinstance(entries, list) or len(entries) > 100000:
        fail('SOURCE_ENVELOPE_POSIX_PROTOCOL', 'invalid entry batch')
    result = []
    for spec in entries:
        if not isinstance(spec, dict) or not isinstance(spec.get('path'), str):
            fail('SOURCE_ENVELOPE_POSIX_PROTOCOL', 'invalid entry request')
        raw = spec['path']
        if absolute:
            parts = abs_parts(raw)
            raw = '/'.join(parts)
        first = inspect_entry(source, raw, bool(spec.get('include_bytes')))
        second = inspect_entry(source, raw, bool(spec.get('include_bytes')))
        if first != second:
            fail('SOURCE_ENVELOPE_ENTRY_CHANGED', spec['path'])
        result.append(first)
    return result

def optional_entry(source, raw, absolute=False):
    if absolute:
        raw = '/'.join(abs_parts(raw))
    parent, name = walk_rel_parent(source, raw)
    try:
        parent_identity = idstat(os.fstat(parent))
        try:
            result = {'exists': True, 'entry': inspect_name(parent, name)}
        except FileNotFoundError:
            result = {'exists': False}
        require_identity(idstat(os.fstat(parent)), parent_identity, 'SOURCE_ENVELOPE_ENTRY_CHANGED', FULL_KEYS)
        return result
    finally:
        os.close(parent)

def open_exact_git(config):
    parent, name = walk_abs_parent(config['git_path'])
    try:
        fd = open_regular(parent, name)
    finally:
        os.close(parent)
    require_identity(idstat(os.fstat(fd)), config['git_identity'], 'SOURCE_ENVELOPE_TOOLCHAIN_CHANGED', FULL_KEYS)
    return fd

def git_batch(source, config, request):
    commands = request.get('commands') if isinstance(request, dict) else None
    if not isinstance(commands, list) or not commands or len(commands) > 64:
        fail('SOURCE_ENVELOPE_POSIX_PROTOCOL', 'invalid git command batch')
    git_fd = open_exact_git(config)
    original_cwd = os.open('.', os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC)
    environment = {
        'PATH': '/usr/bin:/bin', 'HOME': '/var/empty', 'LANG': 'C', 'LC_ALL': 'C',
        'GIT_OPTIONAL_LOCKS': '0', 'GIT_CONFIG_NOSYSTEM': '1', 'GIT_CONFIG_GLOBAL': '/dev/null',
    }
    results = []
    try:
        os.fchdir(source)
        for command in commands:
            argv = command.get('argv') if isinstance(command, dict) else None
            if not isinstance(argv, list) or not argv or any(not isinstance(value, str) or '\x00' in value for value in argv):
                fail('SOURCE_ENVELOPE_POSIX_PROTOCOL', 'invalid git argv')
            encoded = command.get('input', '')
            try:
                input_bytes = base64.b64decode(encoded, validate=True) if encoded else b''
            except Exception:
                fail('SOURCE_ENVELOPE_POSIX_PROTOCOL', 'invalid git input')
            if len(input_bytes) > MAX:
                fail('SOURCE_ENVELOPE_SIZE_LIMIT', 'git input exceeds limit')
            try:
                prefix = ['-c', 'core.fsmonitor=false', '-c', 'core.hooksPath=/dev/null'] if command.get('disable_hooks', True) else []
                completed = subprocess.run(
                    [config['git_path'], '--no-optional-locks', *prefix, *argv], input=input_bytes,
                    stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=environment, timeout=15,
                )
            except subprocess.TimeoutExpired:
                fail('SOURCE_ENVELOPE_GIT_TIMEOUT', 'git command timed out')
            if len(completed.stdout) > MAX or len(completed.stderr) > MAX:
                fail('SOURCE_ENVELOPE_SIZE_LIMIT', 'git response exceeds limit')
            results.append({
                'status': completed.returncode,
                'stdout': base64.b64encode(completed.stdout).decode('ascii'),
                'stderr': base64.b64encode(completed.stderr).decode('ascii'),
            })
        require_identity(idstat(os.fstat(git_fd)), config['git_identity'], 'SOURCE_ENVELOPE_TOOLCHAIN_CHANGED', FULL_KEYS)
        current_parent, current_name = walk_abs_parent(config['git_path'])
        try:
            current = idstat(os.stat(current_name, dir_fd=current_parent, follow_symlinks=False))
            require_identity(current, idstat(os.fstat(git_fd)), 'SOURCE_ENVELOPE_TOOLCHAIN_CHANGED', FULL_KEYS)
        finally:
            os.close(current_parent)
        return results
    finally:
        os.fchdir(original_cwd)
        os.close(original_cwd)
        os.close(git_fd)

def dispatch_sync(operation, config):
    request = read_request()
    if operation == 'bind_source':
        source = open_source(config, require_expected=False)
        try:
            result = idstat(os.fstat(source))
            revalidate_source(config, source)
            return result
        finally:
            os.close(source)

    source = open_source(config)
    try:
        if operation == 'ensure_evidence':
            evidence = open_evidence(source, config, create=True, secure_final=True)
            try:
                result = idstat(os.fstat(evidence))
                revalidate_evidence(source, evidence, config)
                return result
            finally:
                os.close(evidence)
        if operation == 'bind_evidence':
            evidence = open_evidence(source, config)
            try:
                result = idstat(os.fstat(evidence))
                revalidate_evidence(source, evidence, config)
                return result
            finally:
                os.close(evidence)
        if operation == 'fsync_evidence':
            evidence = open_evidence(source, config)
            try:
                os.fsync(evidence)
                revalidate_evidence(source, evidence, config)
                return {}
            finally:
                os.close(evidence)
        if operation == 'inspect_relative':
            result = inspect_batch(source, request)
        elif operation == 'inspect_absolute':
            if config['source_path'] != '/':
                fail('SOURCE_ENVELOPE_ABSOLUTE_BINDING', 'filesystem-root binding required')
            result = inspect_batch(source, request, absolute=True)
        elif operation == 'optional_relative':
            result = optional_entry(source, request.get('path'))
        elif operation == 'optional_absolute':
            if config['source_path'] != '/':
                fail('SOURCE_ENVELOPE_ABSOLUTE_BINDING', 'filesystem-root binding required')
            result = optional_entry(source, request.get('path'), absolute=True)
        elif operation == 'manifest':
            entries = request.get('entries') if isinstance(request, dict) else None
            if not isinstance(entries, list) or len(entries) > 100000:
                fail('SOURCE_ENVELOPE_POSIX_PROTOCOL', 'invalid manifest batch')
            result = []
            for entry in prepare_manifest_specs(source, config, entries):
                first = inspect_manifest_entry(source, entry)
                second = inspect_manifest_entry(source, entry)
                if first != second:
                    fail('SOURCE_ENVELOPE_ENTRY_CHANGED', entry['path'])
                result.append(first)
        elif operation == 'git_batch':
            result = git_batch(source, config, request)
        else:
            fail('SOURCE_ENVELOPE_POSIX_PROTOCOL', 'unknown synchronous operation')
        revalidate_source(config, source)
        return result
    finally:
        os.close(source)
`;
