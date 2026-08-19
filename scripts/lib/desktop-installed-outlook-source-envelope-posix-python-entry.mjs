export const POSIX_PYTHON_ENTRY = String.raw`
try:
    operation = sys.argv[1]
    configuration = decode_config()
    require_root_descriptor(configuration)
    require_running_python(configuration)
    if operation == 'publish_pair':
        publication_transaction(configuration)
    elif operation == 'read_pair':
        reader_transaction(configuration)
    else:
        emit({'ok': True, 'result': dispatch_sync(operation, configuration)})
except Failure as error:
    emit({'ok': False, 'code': error.code, 'detail': error.detail})
    raise SystemExit(1)
except FileNotFoundError:
    emit({'ok': False, 'code': 'SOURCE_ENVELOPE_NOT_FOUND', 'detail': 'required descriptor-relative entry is absent'})
    raise SystemExit(1)
except PermissionError:
    emit({'ok': False, 'code': 'SOURCE_ENVELOPE_PERMISSION', 'detail': 'descriptor-relative operation was denied'})
    raise SystemExit(1)
except Exception as error:
    emit({'ok': False, 'code': 'SOURCE_ENVELOPE_POSIX_FAILED', 'detail': type(error).__name__})
    raise SystemExit(1)
`;
