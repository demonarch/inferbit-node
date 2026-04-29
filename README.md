# InferBit for Node.js

**v0.2.0** — Run any open LLM on CPU from Node.js. Same C engine as the [Python package](https://pypi.org/project/inferbit/).

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

All three packages share the same C shared library (`libinferbit`) via FFI. Same model files (`.ibf`), same quantization, same kernels — whether you call it from Python or Node.js.

The C engine handles:
- Quantization (INT4/INT8/INT2)
- Forward pass with NEON (ARM) or AVX2 (x86) SIMD
- Multi-threaded matmul and attention
- Streaming generation with KV-cache

The Node layer is thin — mostly type conversions and API sugar.

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
