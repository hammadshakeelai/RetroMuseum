#!/usr/bin/env node
import { spawn } from "node:child_process";

console.log("\n🧪 [QA Hook] Starting Quality Assurance test suite execution...");

const startTime = Date.now();
const testProcess = spawn("npx vitest run", {
  stdio: "inherit",
  shell: true,
});

testProcess.on("close", (code) => {
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  if (code === 0) {
    console.log(`\n✅ [QA Hook] PASSED: All Vitest suites and DOM component tests passed cleanly in ${duration}s.`);
    process.exit(0);
  } else {
    console.error(`\n❌ [QA Hook] FAILED: Quality assurance checks encountered errors (exit code ${code}).`);
    process.exit(code || 1);
  }
});
