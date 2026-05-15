# @inferbit/cli

**v0.4.1** — CLI for InferBit. Quantize models, chat, benchmark, and inspect — from any terminal on macOS, Linux, or Windows.

## Install

```bash
npm install -g @inferbit/cli
# or
bun install -g @inferbit/cli
```

The install pulls in [@inferbit/core](https://www.npmjs.com/package/@inferbit/core), which ships prebuilt native binaries for **macOS (arm64, x64)**, **Linux (x64, arm64)**, and **Windows (x64, arm64)** — six platforms, auto-resolved at runtime.

**Verify install:**

```bash
inferbit version
```

**PATH troubleshooting (Windows):** `npm install -g` puts the binary in `%AppData%\npm\inferbit.cmd`. If `inferbit` isn't found, restart your shell or add `%AppData%\npm` to `PATH`.

## Commands

```bash
# Convert any HuggingFace model / safetensors / GGUF to .ibf
inferbit quantize <source> -o <output.ibf> [--bits 4] [--sensitive-bits 8]

# Interactive chat (REPL)
inferbit chat <model.ibf> [--temperature 0.7] [--max-tokens 512]

# Benchmark prefill + decode throughput
inferbit bench <model.ibf> [--tokens 128] [--runs 3]

# Display model metadata (architecture, layers, file size, etc.)
inferbit info <model.ibf>

# Version
inferbit version
```

> The Node CLI is intentionally minimal. The Python CLI (`pip install inferbit[cli]`) additionally exposes `serve` (OpenAI-compatible API), `calibrate`, and `eval-gates`. They share the same `.ibf` format.

## Usage examples

**Convert a HuggingFace model and chat with it:**

```bash
inferbit quantize meta-llama/Llama-3.2-1B -o llama-1b.ibf --bits 4
inferbit chat llama-1b.ibf
```

**Convert a local file:**

```bash
inferbit quantize ./pytorch_model.safetensors -o model.ibf
inferbit quantize ./model.gguf -o model.ibf       # from GGUF too
```

**Drive mode (sub-GB peak RAM, macOS/Linux only):**

```bash
# Bash / zsh — macOS, Linux:
IB_RESIDENCY_MODE=drive inferbit chat llama-8b.ibf
IB_RESIDENCY_MODE=drive inferbit bench llama-8b.ibf
```

Drive mode is not available on Windows (uses POSIX `madvise`/`fcntl(F_NOCACHE)`); weights stay resident.

**Force a backend:**

```bash
# Bash / zsh:
IB_BACKEND=cpu inferbit bench model.ibf    # force CPU even if Metal is available

# Windows (PowerShell):
$env:IB_BACKEND = "cpu"; inferbit bench model.ibf
```

## Options

### Quantization (`inferbit quantize`)

| Flag | Default | Description |
|------|---------|-------------|
| `-o, --output` | required | Output `.ibf` path |
| `--bits` | 4 | MLP weight quantization (2, 4, 8) |
| `--sensitive-bits` | 8 | Attention/embedding bits (4 or 8) |
| `--sparsity` | 0.0 | Structured sparsity (0.0–0.6) |
| `--threads` | auto | CPU threads for conversion |

### Generation (`chat`, `bench`)

| Flag | Default | Description |
|------|---------|-------------|
| `--temperature` | 0.7 | Sampling temperature |
| `--top-k` | 40 | Top-K sampling |
| `--top-p` | 0.9 | Nucleus sampling |
| `--max-tokens` | 512 | Max tokens to generate |
| `--threads` | auto | CPU threads at inference time |

## Platform notes

| Platform | CPU SIMD | Metal GPU | Drive mode |
|---|---|---|---|
| macOS Apple Silicon | NEON + dotprod | opt-in via `INFERBIT_LIB_PATH` | ✓ |
| macOS Intel | portable C | — | ✓ |
| Linux x86_64 | portable C | — | ✓ |
| Linux ARM64 | NEON + dotprod | — | ✓ |
| Windows x64 | portable C (MSVC) | — | — |
| Windows ARM64 | NEON (MSVC) | — | — |

To enable the **Apple Metal GPU backend** (best M-series throughput), build `libinferbit` from source with `-DIB_ENABLE_METAL=ON` and point `INFERBIT_LIB_PATH` at the resulting dylib — see [@inferbit/core](https://www.npmjs.com/package/@inferbit/core).

## Benchmarks

Apple M4, v0.4.1, llama.cpp Q4_K_M for reference. Perplexity over an identical 2048-token wikitext window.

| Model | Engine / mode | File | Prefill | Decode | Peak RAM | PPL |
|---|---|---:|---:|---:|---:|---:|
| TinyLlama 1.1B | InferBit PQv2 — Metal | 528 MiB | 437 t/s | 55.5 t/s | 1205 MB | **13.06** |
|  | InferBit PQv2 — CPU | 528 MiB | 27 t/s | 24.9 t/s | 627 MB | 13.06 |
|  | InferBit PQv2 — drive | 528 MiB | 287 t/s | 9.4 t/s | **297 MB** | 13.06 |
|  | llama.cpp Q4_K_M — Metal | 638 MiB | 1347 t/s | 121.3 t/s | 704 MB | 13.89 |
| Llama-3.2-1B | InferBit PQv2 — Metal | 718 MiB | 435 t/s | 48.1 t/s | 1258 MB | **11.29** |
|  | InferBit PQv2 — drive | 718 MiB | 257 t/s | 9.3 t/s | **602 MB** | 11.29 |
|  | llama.cpp Q4_K_M — Metal | 770 MiB | 1359 t/s | 104.3 t/s | 888 MB | 12.33 |
| Llama-3.1-8B | InferBit PQv2 — Metal | 3.75 GiB | 65 t/s | 8.5 t/s | 3203 MB | **6.34** |
|  | InferBit PQv2 — drive | 3.75 GiB | 34.3 t/s | 0.70 t/s | **1359 MB** | 6.34 |
|  | llama.cpp Q4_K_M — Metal | 4.58 GiB | 216 t/s | 20.1 t/s | 4784 MB | 6.77 |

PQv2 PPL is 6–8% lower than same-bit-budget Q4_K_M; `.ibf` files are 7–18% smaller. Full matrix + methodology in [`docs/34_METRICS_SNAPSHOT.md`](https://github.com/inferbit/inferbit/blob/main/docs/34_METRICS_SNAPSHOT.md).

## License

MIT
