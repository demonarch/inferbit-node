/**
 * Model conversion: local safetensors/GGUF -> .ibf
 *
 * Mirrors the Python convert.py API.
 */

const { getLib } = require("./ffi");

/**
 * Convert a local model file to .ibf format.
 *
 * @param {string} source - Path to .safetensors, .gguf, or directory
 * @param {string} output - Path for output .ibf file
 * @param {object} [options]
 * @param {number} [options.bits=4] - Default quantization bits (2, 4, 8)
 * @param {number} [options.sensitiveBits=8] - Bits for attention/embeddings
 * @param {number} [options.sparsity=0.0] - Structured sparsity (0.0-0.6)
 * @param {number} [options.kvBits=16] - KV cache quantization bits
 * @param {number} [options.threads=0] - CPU threads (0 = auto)
 * @returns {string} - Path to the output .ibf file
 */
function convert(source, output, options = {}) {
  const lib = getLib();

  const cfg = lib.inferbit_default_convert_config();
  if (options.bits !== undefined) cfg.default_bits = options.bits;
  if (options.sensitiveBits !== undefined) cfg.sensitive_bits = options.sensitiveBits;
  if (options.sparsity !== undefined) cfg.sparsity = options.sparsity;
  if (options.kvBits !== undefined) cfg.kv_bits = options.kvBits;
  if (options.threads !== undefined) cfg.threads = options.threads;

  const rc = lib.inferbit_convert(source, output, cfg);
  if (rc !== 0) {
    const err = lib.inferbit_last_error();
    throw new Error(`Conversion failed: ${err}`);
  }

  return output;
}

/**
 * Detect the format of a model file.
 *
 * @param {string} path
 * @returns {string} - "safetensors", "gguf", "ibf", or "unknown"
 */
function detectFormat(path) {
  const lib = getLib();
  const fmt = lib.inferbit_detect_format(path);
  switch (fmt) {
    case 1: return "safetensors";
    case 2: return "gguf";
    case 3: return "ibf";
    default: return "unknown";
  }
}

module.exports = { convert, detectFormat };
