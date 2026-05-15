# InferBit for Node.js

**v0.4.1** — Run any open LLM on CPU from Node.js. Same C engine as the [Python package](https://pypi.org/project/inferbit/).

## Packages

| Package | Purpose |
|---------|---------|
| [@inferbit/core](packages/core) | Prebuilt libinferbit binaries, platform resolution |
| [@inferbit/node](packages/node) | Library API — `InferbitModel`, `convert`, `detectFormat` |
| [@inferbit/cli](packages/cli) | CLI — `inferbit quantize`, `chat`, `bench`, `info` |

## Quickstart

```bash
npm install @inferbit/node

# Or globally for CLI
npm install -g @inferbit/cli
```

```javascript
const { InferbitModel, convert } = require('@inferbit/node');

convert('model.safetensors', 'model.ibf', { bits: 4 });

const model = InferbitModel.load('model.ibf', { threads: 8 });
const tokens = model.generateTokens([1, 2, 3, 4, 5], { maxTokens: 20 });
console.log(tokens);

model.free();
```

## How it works

All three packages share the same C shared library (`libinferbit`) via FFI (koffi). Same `.ibf` model files, same PQv2 quantization, same kernels — whether you call it from Python or Node.js.

The C engine handles:
- **Quantization** — PQv2 4-bit codebooks for MLPs + INT8 attention/embeddings (plus optional INT2)
- **Forward pass** — hand-tuned C kernels; NEON SIMD on aarch64 builds; multi-threaded matmul; parallel attention heads; optional Apple Metal GPU path on macOS ARM64 (build from source)
- **Streaming generation** with KV-cache control, speculative decoding, prompt-lookup
- **Drive mode** — stream weights from disk through a bounded scratch ring for sub-GB peak RAM on multi-GB models (macOS/Linux)

The Node layer is thin — mostly type conversions and API sugar over FFI.

## Platform support

[@inferbit/core](packages/core) ships a prebuilt binary for each of these targets and is auto-resolved at `require()`:

| Platform | Binary | CPU SIMD | Metal GPU | Drive mode |
|---|---|---|---|---|
| macOS Apple Silicon (`darwin-arm64`) | `libinferbit.dylib` | NEON + dotprod | opt-in (build from source) | ✓ |
| macOS Intel (`darwin-x64`) | `libinferbit.dylib` | portable C | — | ✓ |
| Linux x86_64 (`linux-x64`) | `libinferbit.so` | portable C | — | ✓ |
| Linux ARM64 (`linux-arm64`) | `libinferbit.so` | NEON + dotprod | — | ✓ |
| Windows x64 (`win32-x64`) | `inferbit.dll` | portable C (MSVC) | — | — |
| Windows ARM64 (`win32-arm64`) | `inferbit.dll` | NEON (MSVC) | — | — |

If you need the Metal-GPU build (Apple Silicon), build libinferbit yourself with `-DIB_ENABLE_METAL=ON` and point `INFERBIT_LIB_PATH` at the resulting `libinferbit.dylib` (see [@inferbit/core](packages/core/README.md)).

## Benchmarks

Apple M4, full v0.4.1 cross-engine matrix. Perplexity measured on
the same tokenized 2048-token wikitext window for both engines
(llama.cpp's tokenization fed to both `bench_ppl_run` and
`llama-perplexity`). Prefill via `bench_compare --prompt-tokens 64` /
`llama-bench -p 64`; decode `--gen-tokens 128` / `-n 128`. Peak RAM
from `getrusage` (InferBit) and `/usr/bin/time -l` (llama.cpp).

**TinyLlama 1.1B-Chat**

| Engine / mode | File | Prefill | Decode | Peak RAM | PPL |
|---|---:|---:|---:|---:|---:|
| InferBit PQv2 — Metal | 528 MiB | 437 t/s | 55.5 t/s | 1205 MB | **13.06** |
| InferBit PQv2 — CPU | 528 MiB | 27 t/s | 24.9 t/s | 627 MB | 13.06 |
| InferBit PQv2 — drive | 528 MiB | 287 t/s | 9.4 t/s | **297 MB** | 13.06 |
| llama.cpp Q4_K_M — Metal | 638 MiB | **1347 t/s** | **121.3 t/s** | 704 MB | **13.89** |
| llama.cpp Q4_K_M — CPU | 638 MiB | 130 t/s | 74.2 t/s | 1293 MB | 13.89 |

**Llama-3.2-1B Instruct**

| Engine / mode | File | Prefill | Decode | Peak RAM | PPL |
|---|---:|---:|---:|---:|---:|
| InferBit PQv2 — Metal | 718 MiB | 435 t/s | 48.1 t/s | 1258 MB | **11.29** |
| InferBit PQv2 — CPU | 718 MiB | 28 t/s | 22.7 t/s | 847 MB | 11.37 |
| InferBit PQv2 — drive | 718 MiB | 257 t/s | 9.3 t/s | **602 MB** | 11.29 |
| llama.cpp Q4_K_M — Metal | 770 MiB | **1359 t/s** | **104.3 t/s** | 888 MB | **12.33** |
| llama.cpp Q4_K_M — CPU | 770 MiB | 132 t/s | 64.3 t/s | 1644 MB | 12.33 |

**Llama-3.1-8B Instruct**

| Engine / mode | File | Prefill | Decode | Peak RAM | PPL |
|---|---:|---:|---:|---:|---:|
| InferBit PQv2 — Metal | 3.75 GiB | 65 t/s | 8.5 t/s | 3203 MB | **6.34** |
| InferBit PQv2 — CPU | 3.75 GiB | 4.5 t/s | 4.2 t/s | 4306 MB | 6.36 |
| InferBit PQv2 — drive | 3.75 GiB | 34.3 t/s | 0.70 t/s | **1359 MB** | 6.34 |
| llama.cpp Q4_K_M — Metal | 4.58 GiB | **216 t/s** | **20.1 t/s** | 4784 MB | **6.77** |
| llama.cpp Q4_K_M — CPU | 4.58 GiB | 4.2 t/s | 2.4 t/s | 6755 MB | 6.77 |

**Reads:** InferBit PQv2 perplexity is 6–8% **lower** than same-bit-budget
Q4_K_M on all three models (identical token streams); `.ibf` files are
7–18% smaller. llama.cpp is 2–3× faster on Metal decode and 3–6× on
prefill on M4 (closing that gap is active work). InferBit drive mode
holds the 8B model in **1.36 GB peak RAM** at the same PPL as the
in-memory path (3.20 GB) — −58% RAM at zero quality cost.

Full methodology in [`docs/34_METRICS_SNAPSHOT.md`](https://github.com/inferbit/inferbit/blob/main/docs/34_METRICS_SNAPSHOT.md).

## Development

```bash
# Build libinferbit
cd ../libinferbit
cmake -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build

# Install workspace deps
cd ../inferbit-node
npm install

# Test
node -e "console.log(require('./packages/node/src/index.js'))"
```

## License

MIT
