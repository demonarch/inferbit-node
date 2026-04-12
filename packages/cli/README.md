# @inferbit/cli

CLI for InferBit — quantize, chat, benchmark, and inspect LLMs on CPU.

## Install

```bash
npm install -g @inferbit/cli
```

## Commands

```bash
# Convert any model to .ibf format
inferbit quantize model.safetensors -o model.ibf --bits 4

# Interactive chat
inferbit chat model.ibf --temperature 0.7

# Benchmark performance
inferbit bench model.ibf --tokens 128 --runs 3

# Model metadata
inferbit info model.ibf

# Version
inferbit version
```

## Options

### Quantization

| Flag | Default | Description |
|------|---------|-------------|
| `--bits` | 4 | Weight quantization (2, 4, 8) |
| `--sensitive-bits` | 8 | Attention/embedding bits |
| `--sparsity` | 0.0 | Structured sparsity (0.0-0.6) |
| `-o, --output` | required | Output .ibf path |

### Generation

| Flag | Default | Description |
|------|---------|-------------|
| `--temperature` | 0.7 | Sampling temperature |
| `--top-k` | 40 | Top-K sampling |
| `--top-p` | 0.9 | Nucleus sampling |
| `--max-tokens` | 512 | Max tokens to generate |
| `--threads` | auto | CPU threads |

## License

MIT
