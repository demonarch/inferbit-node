# @inferbit/node

**v0.4.1** — Run any open LLM on CPU from Node.js / Bun. Same C engine as the [Python package](https://pypi.org/project/inferbit/) — same `.ibf` files, same numerics, identical perplexity.

## Install

```bash
npm install @inferbit/node
# or
bun add @inferbit/node
```

Pulls in [@inferbit/core](https://www.npmjs.com/package/@inferbit/core), which ships prebuilt native binaries for **macOS (arm64, x64)**, **Linux (x64, arm64)**, and **Windows (x64, arm64)** — six platforms, auto-resolved at `require()`. See [Platform support](#platform-support) below.

## Quickstart

```javascript
const { InferbitModel, convert, detectFormat } = require('@inferbit/node');

// One-shot: convert a HuggingFace safetensors file (or directory) to .ibf
convert('model.safetensors', 'model.ibf', { bits: 4, sensitiveBits: 8 });

// Load and use
const model = InferbitModel.load('model.ibf', { threads: 8 });

const tokens = model.generateTokens([1, 2, 3, 4, 5], {
  maxTokens: 64,
  temperature: 0.7,
  topK: 40,
  topP: 0.9,
});
console.log(tokens);

// Always free when done (releases libinferbit memory + KV cache)
model.free();
```

## Model API

```javascript
const model = InferbitModel.load('model.ibf', {
  threads: 0,            // 0 = auto (detects CPU/P-core count)
  contextLength: 2048,   // 0 = use model's trained max
  kvDynamic: false,      // resize KV-cache lazily (vs. allocating up-front)
});

// Read-only metadata
model.architecture     // "llama"
model.numLayers        // 32
model.hiddenSize       // 4096
model.vocabSize        // 128256
model.maxContext       // 131072
model.bits             // 4
model.weightMemoryMB   // 3835.1
model.kvMemoryMB       // 512.0
model.totalMemoryMB    // 4347.1

// Forward pass — returns raw logits (Float32Array of length vocabSize)
const logits = model.forward([1, 2, 3]);

// KV-cache control
model.kvClear();
model.kvTruncate(512);
model.kvLength;        // current length

// Speculative decoding (target + small draft model)
const draft = InferbitModel.load('llama-1b.ibf');
model.setDraftModel(draft, /* draftTokens */ 4);
model.generateTokens([...], { maxTokens: 256 });
model.unsetDraftModel();
draft.free();

model.free();
```

### `convert(source, output, options?)`

Convert safetensors, GGUF, or a HuggingFace directory to `.ibf`.

```javascript
convert('model.safetensors', 'model.ibf', {
  bits: 4,             // 2, 4, or 8 — MLP weight quantization budget
  sensitiveBits: 8,    // attention/embedding precision (4 or 8)
  sparsity: 0.0,       // structured sparsity target (0.0–0.6)
  kvBits: 16,          // KV-cache precision (8 or 16; default 16)
  threads: 0,          // 0 = auto
});
```

### `detectFormat(path)`

Returns `"safetensors" | "gguf" | "ibf" | "unknown"`.

## Drive mode (sub-GB peak RAM)

Stream weights from disk through a bounded scratch ring instead of holding them resident — bit-identical perplexity. Set the env var before `require`:

**macOS / Linux:**

```bash
IB_RESIDENCY_MODE=drive node your-script.js
```

**Windows:** not yet supported (uses POSIX `madvise`/`fcntl(F_NOCACHE)`). Weights stay resident on Windows.

In drive mode, an 8B model holds in ~1.36 GB peak RSS at the same PPL as the in-memory path (3.20 GB). Throughput drops at high contexts (re-streams weights every position); use it when RAM is the binding constraint.

## Apple Metal GPU (opt-in)

The prebuilt `@inferbit/core` binary is CPU-only on every platform. To use the Metal GPU path on Apple Silicon, build `libinferbit` with `-DIB_ENABLE_METAL=ON` and point `INFERBIT_LIB_PATH` at it before `require`:

```bash
export INFERBIT_LIB_PATH="/path/to/build/libinferbit.dylib"
node your-script.js
```

See [@inferbit/core](https://www.npmjs.com/package/@inferbit/core) for the full build instructions.

## Platform support

| Platform | CPU SIMD | Metal GPU | Drive mode |
|---|---|---|---|
| macOS Apple Silicon | NEON + dotprod | opt-in (build from source) | ✓ |
| macOS Intel | portable C | — | ✓ |
| Linux x86_64 | portable C | — | ✓ |
| Linux ARM64 | NEON + dotprod | — | ✓ |
| Windows x64 | portable C (MSVC) | — | — |
| Windows ARM64 | NEON (MSVC) | — | — |

Node 18+ (Bun 1.0+). Native FFI via [koffi](https://www.npmjs.com/package/koffi), no `node-gyp` build step.

## Benchmarks

Apple M4, v0.4.1, llama.cpp Q4_K_M for reference. Perplexity over an identical 2048-token wikitext window (both engines fed llama.cpp's tokenization).

| Model | Engine / mode | File | Prefill | Decode | Peak RAM | PPL |
|---|---|---:|---:|---:|---:|---:|
| TinyLlama 1.1B | InferBit PQv2 — Metal | 528 MiB | 437 t/s | 55.5 t/s | 1205 MB | **13.06** |
|  | InferBit PQv2 — CPU | 528 MiB | 27 t/s | 24.9 t/s | 627 MB | 13.06 |
|  | InferBit PQv2 — drive | 528 MiB | 287 t/s | 9.4 t/s | **297 MB** | 13.06 |
|  | llama.cpp Q4_K_M — Metal | 638 MiB | 1347 t/s | 121.3 t/s | 704 MB | 13.89 |
|  | llama.cpp Q4_K_M — CPU | 638 MiB | 130 t/s | 74.2 t/s | 1293 MB | 13.89 |
| Llama-3.2-1B | InferBit PQv2 — Metal | 718 MiB | 435 t/s | 48.1 t/s | 1258 MB | **11.29** |
|  | InferBit PQv2 — CPU | 718 MiB | 28 t/s | 22.7 t/s | 847 MB | 11.37 |
|  | InferBit PQv2 — drive | 718 MiB | 257 t/s | 9.3 t/s | **602 MB** | 11.29 |
|  | llama.cpp Q4_K_M — Metal | 770 MiB | 1359 t/s | 104.3 t/s | 888 MB | 12.33 |
|  | llama.cpp Q4_K_M — CPU | 770 MiB | 132 t/s | 64.3 t/s | 1644 MB | 12.33 |
| Llama-3.1-8B | InferBit PQv2 — Metal | 3.75 GiB | 65 t/s | 8.5 t/s | 3203 MB | **6.34** |
|  | InferBit PQv2 — CPU | 3.75 GiB | 4.5 t/s | 4.2 t/s | 4306 MB | 6.36 |
|  | InferBit PQv2 — drive | 3.75 GiB | 34.3 t/s | 0.70 t/s | **1359 MB** | 6.34 |
|  | llama.cpp Q4_K_M — Metal | 4.58 GiB | 216 t/s | 20.1 t/s | 4784 MB | 6.77 |
|  | llama.cpp Q4_K_M — CPU | 4.58 GiB | 4.2 t/s | 2.4 t/s | 6755 MB | 6.77 |

PQv2 PPL is 6–8% lower than same-bit-budget Q4_K_M; `.ibf` files are 7–18% smaller. llama.cpp wins raw throughput on M4 Metal (2–3× decode, 3–6× prefill); drive mode wins peak RAM (8B in 1.36 GB). Full methodology in [`docs/34_METRICS_SNAPSHOT.md`](https://github.com/inferbit/inferbit/blob/main/docs/34_METRICS_SNAPSHOT.md).

## License

MIT
