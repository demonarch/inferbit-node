/**
 * Verify the prebuilt binary exists after install.
 */
const { getLibraryPath, platformKey } = require("./index");

try {
  const p = getLibraryPath();
  console.log(`@inferbit/core: found libinferbit at ${p}`);
} catch (e) {
  console.warn(
    `@inferbit/core: no prebuilt binary for ${platformKey()}. ` +
      `Set INFERBIT_LIB_PATH to a manually built library.`
  );
}
