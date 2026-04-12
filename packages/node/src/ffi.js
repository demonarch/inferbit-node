/**
 * FFI bindings to libinferbit via koffi.
 *
 * Mirrors the Python _ffi.py — same function signatures.
 */

const koffi = require("koffi");
const { getLibraryPath } = require("@inferbit/core");

// Struct definitions
const SampleParams = koffi.struct("inferbit_sample_params", {
  temperature: "float",
  top_k: "int32_t",
  top_p: "float",
  repeat_penalty: "float",
  max_tokens: "int32_t",
  seed: "int32_t",
});

const ConvertConfig = koffi.struct("inferbit_convert_config", {
  default_bits: "int32_t",
  sensitive_bits: "int32_t",
  sparsity: "float",
  block_size: "int32_t",
  kv_bits: "int32_t",
  threads: "int32_t",
  progress: "void*",
  progress_ctx: "void*",
});

let _lib = null;
let _funcs = null;

function getLib() {
  if (_funcs) return _funcs;

  const libPath = getLibraryPath();
  _lib = koffi.load(libPath);

  _funcs = {
    // Version
    inferbit_version: _lib.func("const char* inferbit_version()"),
    inferbit_version_major: _lib.func("int inferbit_version_major()"),
    inferbit_version_minor: _lib.func("int inferbit_version_minor()"),
    inferbit_version_patch: _lib.func("int inferbit_version_patch()"),

    // Error
    inferbit_last_error: _lib.func("const char* inferbit_last_error()"),

    // Config
    inferbit_config_create: _lib.func("void* inferbit_config_create()"),
    inferbit_config_free: _lib.func("void inferbit_config_free(void*)"),
    inferbit_config_set_threads: _lib.func("void inferbit_config_set_threads(void*, int)"),
    inferbit_config_set_context_length: _lib.func("void inferbit_config_set_context_length(void*, int)"),
    inferbit_config_set_kv_cache_dynamic: _lib.func("void inferbit_config_set_kv_cache_dynamic(void*, int)"),

    // Model lifecycle
    inferbit_load: _lib.func("void* inferbit_load(const char*, void*)"),
    inferbit_free: _lib.func("void inferbit_free(void*)"),

    // Sample params
    inferbit_default_sample_params: _lib.func(`inferbit_sample_params inferbit_default_sample_params()`),

    // Generate
    inferbit_generate: _lib.func(`int inferbit_generate(void*, const int32_t*, int, int32_t*, int, inferbit_sample_params)`),
    inferbit_forward: _lib.func("int inferbit_forward(void*, const int32_t*, int, float*, int)"),

    // KV cache
    inferbit_kv_clear: _lib.func("void inferbit_kv_clear(void*)"),
    inferbit_kv_truncate: _lib.func("void inferbit_kv_truncate(void*, int)"),
    inferbit_kv_length: _lib.func("int inferbit_kv_length(void*)"),

    // Model info
    inferbit_model_architecture: _lib.func("const char* inferbit_model_architecture(void*)"),
    inferbit_model_num_layers: _lib.func("int inferbit_model_num_layers(void*)"),
    inferbit_model_hidden_size: _lib.func("int inferbit_model_hidden_size(void*)"),
    inferbit_model_vocab_size: _lib.func("int inferbit_model_vocab_size(void*)"),
    inferbit_model_max_context: _lib.func("int inferbit_model_max_context(void*)"),
    inferbit_model_default_bits: _lib.func("int inferbit_model_default_bits(void*)"),
    inferbit_model_weight_memory: _lib.func("size_t inferbit_model_weight_memory(void*)"),
    inferbit_model_kv_memory: _lib.func("size_t inferbit_model_kv_memory(void*)"),
    inferbit_model_total_memory: _lib.func("size_t inferbit_model_total_memory(void*)"),

    // Speculative
    inferbit_set_draft_model: _lib.func("void inferbit_set_draft_model(void*, void*, int)"),
    inferbit_unset_draft_model: _lib.func("void inferbit_unset_draft_model(void*)"),

    // Convert
    inferbit_default_convert_config: _lib.func(`inferbit_convert_config inferbit_default_convert_config()`),
    inferbit_detect_format: _lib.func("int inferbit_detect_format(const char*)"),
    inferbit_convert: _lib.func(`int inferbit_convert(const char*, const char*, const inferbit_convert_config*)`),
  };

  return _funcs;
}

module.exports = { getLib, SampleParams, ConvertConfig };
