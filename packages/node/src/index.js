/**
 * @inferbit/node — Run any open LLM on CPU.
 *
 * Usage:
 *   const { InferbitModel, convert } = require('@inferbit/node');
 *
 *   const model = InferbitModel.load('model.ibf');
 *   const tokens = model.generateTokens([1, 2, 3], { maxTokens: 20 });
 *
 *   convert('model.safetensors', 'model.ibf', { bits: 4 });
 */

const { InferbitModel } = require("./model");
const { convert, detectFormat } = require("./convert");

module.exports = {
  InferbitModel,
  convert,
  detectFormat,
};
