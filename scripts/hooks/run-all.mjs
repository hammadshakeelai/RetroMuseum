#!/usr/bin/env node
import { spawn } from "node:child_process";

const hooks = [
  { name: "QA Hook", script: "scripts/hooks/qa-hook.mjs", icon: "🧪" },
  { name: "Redteam Hook", script: "scripts/hooks/redteam-hook.mjs", icon: "🛡️ " },
  { name: "User UX Hook", script: "scripts/hooks/user-hook.mjs", icon: "👤" },
  { name: "Developer Hook", script: "scripts/hooks/developer-hook.mjs", icon: "🛠️ " },
];

console.log("===================================================================");
console.log(" 🚀 WebOS Engineering Quality & Security Pipeline: Running All Hooks ");
console.log("===================================================================");

const results = [];

for (const hook of hooks) {
  console.log(`\n-------------------------------------------------------------------`);
  console.log(` ${hook.icon} Executing: ${hook.name}`);
  console.log(`-------------------------------------------------------------------`);

  const start = Date.now();
  const exitCode = await new Promise((resolve) => {
    const proc = spawn(process.execPath, [hook.script], { stdio: "inherit" });
    proc.on("close", resolve);
  });
  const duration = ((Date.now() - start) / 1000).toFixed(2);
  results.push({ ...hook, passed: exitCode === 0, duration, exitCode });
}

console.log("\n===================================================================");
console.log(" 📊 Final Pipeline Summary ");
console.log("===================================================================");

let allPassed = true;
for (const r of results) {
  const status = r.passed ? "✅ PASSED" : `❌ FAILED (code ${r.exitCode})`;
  console.log(` ${r.icon} ${r.name.padEnd(18)} : ${status.padEnd(20)} (${r.duration}s)`);
  if (!r.passed) allPassed = false;
}

console.log("===================================================================");

if (allPassed) {
  console.log("🎉 ALL 4 HOOKS PASSED CLEANLY! WebOS base is concrete and robust.");
  process.exit(0);
} else {
  console.error("⚠️ One or more hooks failed. Review logs above.");
  process.exit(1);
}
