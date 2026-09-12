#!/usr/bin/env node
import { spawn } from "node:child_process";

console.log("\n🛠️  [Developer Hook] Checking Code Quality, Type Safety, Linter & Build...");

function runStep(cmd, args, stepName) {
  return new Promise((resolve, reject) => {
    console.log(`  ▶ Running ${stepName}...`);
    const proc = spawn(`${cmd} ${args.join(" ")}`, { stdio: "inherit", shell: true });
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${stepName} failed with exit code ${code}`));
    });
  });
}

try {
  await runStep("npm", ["run", "lint"], "Linter (oxlint)");
  await runStep("npm", ["run", "build"], "TypeScript & Production Build (tsc + vite build)");
  console.log("\n✅ [Developer Hook] PASSED: Codebase is clean, 0 lint errors, 0 type errors, production bundle optimized.");
  process.exit(0);
} catch (error) {
  console.error(`\n❌ [Developer Hook] FAILED: ${error.message}`);
  process.exit(1);
}
