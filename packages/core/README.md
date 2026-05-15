# @inferbit/core

**v0.4.1** — Prebuilt `libinferbit` binaries for InferBit. Used internally by [@inferbit/node](https://www.npmjs.com/package/@inferbit/node) and [@inferbit/cli](https://www.npmjs.com/package/@inferbit/cli).

You normally don't install this directly — it's a transitive dependency of the other packages. Install it explicitly only when you want to pin the binary version or override the lookup path.

## What it provides

A platform-specific shared library and a tiny resolver that picks the right one at runtime.

| Target | Identifier | Binary | CPU SIMD | Metal GPU | Drive mode |
|---|---|---|---|---|---|
| macOS Apple Silicon | `darwin-arm64` | `libinferbit.dylib` | NEON + dotprod | opt-in (build from source) | ✓ |
| macOS Intel | `darwin-x64` | `libinferbit.dylib` | portable C | — | ✓ |
| Linux x86_64 | `linux-x64` | `libinferbit.so` | portable C | — | ✓ |
| Linux ARM64 (aarch64) | `linux-arm64` | `libinferbit.so` | NEON + dotprod | — | ✓ |
| Windows x64 | `win32-x64` | `inferbit.dll` | portable C (MSVC) | — | — |
| Windows ARM64 | `win32-arm64` | `inferbit.dll` | NEON (MSVC) | — | — |

Drive mode (`IB_RESIDENCY_MODE=drive`) is currently macOS/Linux only — it relies on POSIX `madvise`/`fcntl(F_NOCACHE)`; on Windows the runtime keeps weights resident.

## API

```javascript
const { getLibraryPath } = require('@inferbit/core');

const libPath = getLibraryPath();
// macOS:   /path/to/node_modules/@inferbit/core/prebuilds/darwin-arm64/libinferbit.dylib
// Linux:   /path/to/node_modules/@inferbit/core/prebuilds/linux-x64/libinferbit.so
// Windows: \path\to\node_modules\@inferbit\core\prebuilds\win32-x64\inferbit.dll
```

## Overriding the binary

Set `INFERBIT_LIB_PATH` to a manually built library — useful for enabling the **Apple Metal GPU backend** or running on an unsupported platform.

**macOS / Linux:**

```bash
export INFERBIT_LIB_PATH=/path/to/libinferbit.dylib   # or .so
node your-script.js
```

**Windows (PowerShell):**

```powershell
$env:INFERBIT_LIB_PATH = "C:\path\to\inferbit.dll"
node your-script.js
```

**Windows (cmd.exe):**

```cmd
set INFERBIT_LIB_PATH=C:\path\to\inferbit.dll
node your-script.js
```

## Building libinferbit from source

If you need the Metal-GPU build or your platform has no prebuilt binary:

```bash
git clone https://github.com/inferbit/libinferbit
cd libinferbit
# Apple Silicon with Metal GPU (recommended for best M-series throughput):
cmake -B build -DCMAKE_BUILD_TYPE=Release -DIB_ENABLE_METAL=ON
# Other platforms / CPU only:
cmake -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build -j
```

Then point `INFERBIT_LIB_PATH` at `build/libinferbit.dylib` (macOS), `build/libinferbit.so` (Linux), or `build/Release/inferbit.dll` (Windows).

## License

MIT
