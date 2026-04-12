/**
 * @inferbit/core — Locate the libinferbit shared library.
 *
 * Resolution order:
 * 1. INFERBIT_LIB_PATH environment variable
 * 2. Prebuilt binary bundled in this package (prebuilds/)
 * 3. Sibling libinferbit/build/ directory (development)
 * 4. System library paths
 */

const fs = require("fs");
const path = require("path");
const os = require("os");

function libName() {
  switch (os.platform()) {
    case "darwin":
      return "libinferbit.dylib";
    case "linux":
      return "libinferbit.so";
    case "win32":
      return "inferbit.dll";
    default:
      throw new Error(`Unsupported platform: ${os.platform()}`);
  }
}

function platformKey() {
  return `${os.platform()}-${os.arch()}`;
}

function getLibraryPath() {
  const name = libName();

  // 1. Environment variable
  const envPath = process.env.INFERBIT_LIB_PATH;
  if (envPath && fs.existsSync(envPath)) {
    return envPath;
  }

  // 2. Prebuilt binary in this package
  const prebuild = path.join(__dirname, "..", "prebuilds", platformKey(), name);
  if (fs.existsSync(prebuild)) {
    return prebuild;
  }

  // 3. Development: sibling libinferbit/build/
  const devPaths = [
    path.join(__dirname, "..", "..", "..", "libinferbit", "build", name),
    path.join(__dirname, "..", "..", "..", "..", "libinferbit", "build", name),
    path.join(
      __dirname,
      "..",
      "..",
      "..",
      "..",
      "modules",
      "libinferbit",
      "build",
      name
    ),
  ];
  for (const p of devPaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  // 4. System paths
  const systemPaths =
    os.platform() === "win32"
      ? []
      : [
          `/usr/local/lib/${name}`,
          `/usr/lib/${name}`,
        ];
  for (const p of systemPaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  throw new Error(
    `Could not find ${name} for ${platformKey()}. ` +
      `Set INFERBIT_LIB_PATH or install @inferbit/core with prebuilt binaries.\n` +
      `For development: cd libinferbit && cmake -B build -DCMAKE_BUILD_TYPE=Release && cmake --build build`
  );
}

module.exports = { getLibraryPath, libName, platformKey };
