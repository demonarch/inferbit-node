# @inferbit/core

Prebuilt libinferbit binaries for InferBit. Used internally by [@inferbit/node](https://www.npmjs.com/package/@inferbit/node) and [@inferbit/cli](https://www.npmjs.com/package/@inferbit/cli).

You normally don't install this directly — it's a dependency of the other packages.

## What it provides

Platform-specific builds of `libinferbit`, the C inference engine:

| Platform | Library |
|----------|---------|
| macOS ARM64 | `libinferbit.dylib` |
| macOS x64 | `libinferbit.dylib` |
| Linux x64 | `libinferbit.so` |
| Linux ARM64 | `libinferbit.so` |
| Windows x64 | `inferbit.dll` |
| Windows ARM64 | `inferbit.dll` |

## API

```javascript
const { getLibraryPath } = require('@inferbit/core');

const libPath = getLibraryPath();
// e.g. "/path/to/node_modules/@inferbit/core/prebuilds/darwin-arm64/libinferbit.dylib"
```

## Fallback

If no prebuilt binary exists for your platform, set `INFERBIT_LIB_PATH` to a manually built library:

```bash
export INFERBIT_LIB_PATH=/path/to/libinferbit.so
```

## License

MIT
