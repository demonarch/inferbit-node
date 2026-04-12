/**
 * InferbitModel — main user-facing class.
 * Mirrors the Python InferbitModel API.
 */

const { getLib } = require("./ffi");

class InferbitModel {
  constructor(ptr, lib) {
    this._ptr = ptr;
    this._lib = lib;
  }

  static load(path, options = {}) {
    const lib = getLib();
    const config = lib.inferbit_config_create();
    if (!config) throw new Error("Failed to create config");

    if (options.threads > 0) lib.inferbit_config_set_threads(config, options.threads);
    if (options.contextLength > 0) lib.inferbit_config_set_context_length(config, options.contextLength);
    if (options.kvDynamic) lib.inferbit_config_set_kv_cache_dynamic(config, 1);

    const ptr = lib.inferbit_load(path, config);
    lib.inferbit_config_free(config);

    if (!ptr) {
      const err = lib.inferbit_last_error();
      throw new Error(`Failed to load model: ${err}`);
    }

    return new InferbitModel(ptr, lib);
  }

  free() {
    if (this._ptr) {
      this._lib.inferbit_free(this._ptr);
      this._ptr = null;
    }
  }

  _makeParams(options = {}) {
    const p = this._lib.inferbit_default_sample_params();
    if (options.maxTokens !== undefined) p.max_tokens = options.maxTokens;
    if (options.temperature !== undefined) p.temperature = options.temperature;
    if (options.topK !== undefined) p.top_k = options.topK;
    if (options.topP !== undefined) p.top_p = options.topP;
    if (options.repeatPenalty !== undefined) p.repeat_penalty = options.repeatPenalty;
    if (options.seed !== undefined) p.seed = options.seed;
    return p;
  }

  generateTokens(inputTokens, options = {}) {
    const maxTokens = options.maxTokens || 256;
    const params = this._makeParams({ maxTokens, ...options });

    const inArr = new Int32Array(inputTokens);
    const outArr = new Int32Array(maxTokens);

    const n = this._lib.inferbit_generate(
      this._ptr, inArr, inputTokens.length, outArr, maxTokens, params
    );

    if (n < 0) {
      const err = this._lib.inferbit_last_error();
      throw new Error(`Generation failed: ${err}`);
    }

    return Array.from(outArr.slice(0, n));
  }

  forward(tokens) {
    const vocab = this.vocabSize;
    const inArr = new Int32Array(tokens);
    const outArr = new Float32Array(vocab);

    const rc = this._lib.inferbit_forward(this._ptr, inArr, tokens.length, outArr, vocab);
    if (rc !== 0) {
      const err = this._lib.inferbit_last_error();
      throw new Error(`Forward pass failed: ${err}`);
    }

    return Array.from(outArr);
  }

  kvClear() { this._lib.inferbit_kv_clear(this._ptr); }
  kvTruncate(length) { this._lib.inferbit_kv_truncate(this._ptr, length); }
  get kvLength() { return this._lib.inferbit_kv_length(this._ptr); }

  get architecture() { return this._lib.inferbit_model_architecture(this._ptr); }
  get numLayers() { return this._lib.inferbit_model_num_layers(this._ptr); }
  get hiddenSize() { return this._lib.inferbit_model_hidden_size(this._ptr); }
  get vocabSize() { return this._lib.inferbit_model_vocab_size(this._ptr); }
  get maxContext() { return this._lib.inferbit_model_max_context(this._ptr); }
  get bits() { return this._lib.inferbit_model_default_bits(this._ptr); }
  get weightMemoryMB() { return Number(this._lib.inferbit_model_weight_memory(this._ptr)) / (1024 * 1024); }
  get kvMemoryMB() { return Number(this._lib.inferbit_model_kv_memory(this._ptr)) / (1024 * 1024); }
  get totalMemoryMB() { return Number(this._lib.inferbit_model_total_memory(this._ptr)) / (1024 * 1024); }

  setDraftModel(draftModel, draftTokens = 4) {
    this._lib.inferbit_set_draft_model(this._ptr, draftModel._ptr, draftTokens);
  }
  unsetDraftModel() { this._lib.inferbit_unset_draft_model(this._ptr); }
}

module.exports = { InferbitModel };
