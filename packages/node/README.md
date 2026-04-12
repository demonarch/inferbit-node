# @inferbit/node

Run any open LLM on CPU from Node.js. Same C engine as the Python package.

## Install

```bash
npm install @inferbit/node
```

## Usage

```javascript
const { InferbitModel, convert } = require('@inferbit/node');

// Convert a model
convert('model.safetensors', 'model.ibf', { bits: 4, sensitiveBits: 8 });

// Load and generate
const model = InferbitModel.load('model.ibf', { threads: 8 });

const tokens = model.generateTokens([1, 2, 3, 4, 5], {
  maxTokens: 20,
  temperature: 0.7,
});
console.log(tokens);

// Model info
console.log(model.architecture);  // "llama"
console.log(model.numLayers);     // 32
console.log(model.totalMemoryMB); // 3971.0

// Forward pass (raw logits)
const logits = model.forward([1, 2, 3]);

// KV cache control
model.kvClear();
model.kvTruncate(512);
console.log(model.kvLength);

// Cleanup
model.free();
```

## API

### `InferbitModel.load(path, options?)`

Load a pre-converted `.ibf` model.

Options: `threads`, `contextLength`, `kvDynamic`

### `model.generateTokens(inputTokens, options?)`

Generate token IDs from input token IDs.

Options: `maxTokens`, `temperature`, `topK`, `topP`, `repeatPenalty`, `seed`

### `model.forward(tokens)`

Run forward pass, return logits array.

### `convert(source, output, options?)`

Convert safetensors/GGUF to `.ibf`.

Options: `bits`, `sensitiveBits`, `sparsity`, `kvBits`, `threads`

## License

MIT
