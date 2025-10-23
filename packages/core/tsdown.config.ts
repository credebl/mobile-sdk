import { defineConfig } from "tsdown";

export default defineConfig([
  {
    entry: "src/index.ts",
    format: ["esm", "cjs"], // Output both ESM and CJS
    sourcemap: true,
    outDir: "build",
  },
]);