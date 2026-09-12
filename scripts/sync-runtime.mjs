import { copyFile, mkdir } from "node:fs/promises";
await mkdir(new URL("../public/v86/", import.meta.url), { recursive: true });
for (const file of ["libv86.js", "v86.wasm", "v86-fallback.wasm"]) {
  await copyFile(new URL(`../node_modules/v86/build/${file}`, import.meta.url), new URL(`../public/v86/${file}`, import.meta.url));
}
