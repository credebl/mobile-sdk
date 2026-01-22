// import { defineConfig } from "tsdown";

// export default defineConfig([
//   {
//     entry: "src/index.ts",
//     format: ["esm", "cjs"], // Output both ESM and CJS
//     sourcemap: true,
//     outDir: "build",
//   },
// ]);

import path from 'node:path'
import type { UserConfig } from 'tsdown'

export type UserConfigEntry = Exclude<UserConfig, Array<unknown>>

const baseConfig: UserConfigEntry[] = [
  {
    entry: ['src/index.ts'],
    outDir: 'build',
    unbundle: true,
    format: 'esm',
    target: 'es2020',
    tsconfig: path.join(__dirname, 'tsconfig.build.json'),
    dts: {
      sourcemap: true,
      tsconfig: path.join(__dirname, 'tsconfig.build.json'),
    },
    platform: 'neutral',
    logLevel: 'error',
  },
]

export default baseConfig
