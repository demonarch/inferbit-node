#!/usr/bin/env node

/**
 * InferBit CLI — quantize, chat, bench, info, serve
 *
 * Same commands as the Python CLI (inferbit[cli]).
 */

const { InferbitModel, convert, detectFormat } = require("@inferbit/node");

const args = process.argv.slice(2);
const command = args[0];

function usage() {
  console.log(`
inferbit — Run any open LLM on CPU

Commands:
  quantize <source> -o <output>   Convert model to .ibf format
  chat <model.ibf>                Interactive chat
  bench <model.ibf>               Benchmark performance
  info <model.ibf>                Display model metadata
  version                         Show version

Options:
  --bits <2|4|8>         Default quantization bits (default: 4)
  --sensitive-bits <4|8> Attention/embedding bits (default: 8)
  --threads <n>          CPU threads (default: auto)
  --temperature <f>      Sampling temperature (default: 0.7)
  --max-tokens <n>       Max tokens to generate (default: 512)
  --top-k <n>            Top-K sampling (default: 40)
  --top-p <f>            Nucleus sampling (default: 0.9)
`);
}

function parseFlag(flag, defaultVal) {
  const idx = args.indexOf(flag);
  if (idx >= 0 && idx + 1 < args.length) return args[idx + 1];
  return defaultVal;
}

function parseFlagInt(flag, defaultVal) {
  return parseInt(parseFlag(flag, String(defaultVal)), 10);
}

function parseFlagFloat(flag, defaultVal) {
  return parseFloat(parseFlag(flag, String(defaultVal)));
}

// ── Commands ──────────────────────────────────────────────────

function cmdQuantize() {
  const source = args[1];
  const output = parseFlag("-o", parseFlag("--output", null));
  if (!source || !output) {
    console.error("Usage: inferbit quantize <source> -o <output.ibf>");
    process.exit(1);
  }

  const bits = parseFlagInt("--bits", 4);
  const sensitiveBits = parseFlagInt("--sensitive-bits", 8);
  const sparsity = parseFlagFloat("--sparsity", 0.0);
  const threads = parseFlagInt("--threads", 0);

  console.log(`Source:  ${source}`);
  console.log(`Output:  ${output}`);
  console.log(`Bits:    ${bits} (sensitive: ${sensitiveBits})`);

  const start = Date.now();
  convert(source, output, { bits, sensitiveBits, sparsity, threads });
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  const fs = require("fs");
  const size = (fs.statSync(output).size / 1024 / 1024).toFixed(1);
  console.log(`\nDone in ${elapsed}s — ${size} MB`);
}

function cmdChat() {
  const modelPath = args[1];
  if (!modelPath) {
    console.error("Usage: inferbit chat <model.ibf>");
    process.exit(1);
  }

  const threads = parseFlagInt("--threads", 0);
  const temperature = parseFlagFloat("--temperature", 0.7);
  const maxTokens = parseFlagInt("--max-tokens", 512);
  const topK = parseFlagInt("--top-k", 40);
  const topP = parseFlagFloat("--top-p", 0.9);

  const model = InferbitModel.load(modelPath, { threads });
  console.log(`Model:   ${model.architecture} (${model.numLayers} layers)`);
  console.log(`Memory:  ${model.totalMemoryMB.toFixed(0)} MB`);
  console.log(`Context: ${model.maxContext} tokens`);
  console.log();

  const readline = require("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  function prompt() {
    rl.question("> ", (input) => {
      if (!input.trim()) return prompt();
      if (input.trim() === "exit" || input.trim() === "quit") {
        model.free();
        rl.close();
        return;
      }

      // Simple token-level generation (no tokenizer in Node yet)
      // Convert ASCII to token IDs as a placeholder
      const tokens = Array.from(Buffer.from(input, "utf-8"));
      const out = model.generateTokens(tokens, {
        maxTokens,
        temperature,
        topK,
        topP,
      });
      console.log(`[${out.length} tokens]: ${out.join(", ")}`);
      console.log();
      prompt();
    });
  }

  prompt();
}

function cmdBench() {
  const modelPath = args[1];
  if (!modelPath) {
    console.error("Usage: inferbit bench <model.ibf>");
    process.exit(1);
  }

  const threads = parseFlagInt("--threads", 0);
  const tokens = parseFlagInt("--tokens", 128);
  const runs = parseFlagInt("--runs", 3);
  const warmup = parseFlagInt("--warmup", 1);

  const model = InferbitModel.load(modelPath, { threads });

  console.log(`Model:     ${modelPath}`);
  console.log(`Arch:      ${model.architecture} (${model.numLayers} layers)`);
  console.log(`Bits:      INT${model.bits}`);
  console.log(`Memory:    ${model.totalMemoryMB.toFixed(0)} MB`);
  console.log();

  const inputTokens = [1, 2, 3, 4, 5];
  const total = warmup + runs;
  const speeds = [];

  for (let i = 0; i < total; i++) {
    model.kvClear();
    const start = Date.now();
    const out = model.generateTokens(inputTokens, {
      maxTokens: tokens,
      temperature: 0.0,
    });
    const elapsed = (Date.now() - start) / 1000;
    const tps = out.length / elapsed;

    const label = i < warmup ? "warmup" : `run ${i - warmup + 1}`;
    console.log(
      `  ${label}: ${out.length} tokens in ${elapsed.toFixed(2)}s (${tps.toFixed(1)} tok/s)`
    );

    if (i >= warmup) speeds.push(tps);
  }

  if (speeds.length > 0) {
    const avg = speeds.reduce((a, b) => a + b, 0) / speeds.length;
    const best = Math.max(...speeds);
    console.log();
    console.log(`Average: ${avg.toFixed(1)} tok/s`);
    console.log(`Best:    ${best.toFixed(1)} tok/s`);
  }

  model.free();
}

function cmdInfo() {
  const modelPath = args[1];
  if (!modelPath) {
    console.error("Usage: inferbit info <model.ibf>");
    process.exit(1);
  }

  const model = InferbitModel.load(modelPath);

  console.log(`File:            ${modelPath}`);
  console.log(`Architecture:    ${model.architecture}`);
  console.log(`Layers:          ${model.numLayers}`);
  console.log(`Hidden size:     ${model.hiddenSize}`);
  console.log(`Vocab size:      ${model.vocabSize}`);
  console.log(`Max context:     ${model.maxContext}`);
  console.log(`Quantization:    INT${model.bits}`);
  console.log(`Weight memory:   ${model.weightMemoryMB.toFixed(1)} MB`);
  console.log(`KV-cache memory: ${model.kvMemoryMB.toFixed(1)} MB`);
  console.log(`Total memory:    ${model.totalMemoryMB.toFixed(1)} MB`);

  model.free();
}

function cmdVersion() {
  try {
    const { getLib } = require("./ffi");
    const lib = getLib();
    console.log(`inferbit ${lib.inferbit_version()}`);
  } catch {
    console.log("inferbit 0.1.0");
  }
}

// ── Dispatch ──────────────────────────────────────────────────

switch (command) {
  case "quantize":
    cmdQuantize();
    break;
  case "chat":
    cmdChat();
    break;
  case "bench":
    cmdBench();
    break;
  case "info":
    cmdInfo();
    break;
  case "version":
  case "--version":
  case "-v":
    cmdVersion();
    break;
  default:
    usage();
    if (command) {
      console.error(`Unknown command: ${command}`);
      process.exit(1);
    }
}
