#!/usr/bin/env node
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";

console.log("\n👤 [User UX Hook] Auditing User Experience, DOM Accessibility & Navigation...");

let uxIssues = 0;

function checkUx(path, checks) {
  try {
    const code = readFileSync(path, "utf-8");
    for (const check of checks) {
      if (!check.test(code)) {
        console.error(`  ⚠️ [UX Warning] ${path}: ${check.message}`);
        uxIssues++;
      }
    }
  } catch (err) {
    console.error(`  ❌ [UX Error] Could not read ${path}: ${err.message}`);
    uxIssues++;
  }
}

// 1. Header station indicators and accessible menus
checkUx("src/components/layout/Header.tsx", [
  {
    test: (c) => c.includes("aria-expanded") && c.includes("role=\"menu\""),
    message: "Header dropdown menu must have aria-expanded and role attributes.",
  },
  {
    test: (c) => c.includes("Station 1") && c.includes("Station 2"),
    message: "Dual Lab mode must display clear Station 1 / Station 2 visual selectors.",
  },
]);

// 2. QuickKeysDeck focus preservation
checkUx("src/components/vm/QuickKeysDeck.tsx", [
  {
    test: (c) => c.includes("preventBlur") || c.includes("preventDefault"),
    message: "QuickKeysDeck buttons must prevent focus theft to keep terminal typing seamless.",
  },
  {
    test: (c) => c.includes("Focus Terminal") || c.includes("Bksp"),
    message: "QuickKeysDeck must provide terminal focus recovery and navigation keys.",
  },
]);

// 3. VMViewport non-9P drag feedback
checkUx("src/components/vm/VMViewport.tsx", [
  {
    test: (c) => c.includes("profile.filesystem"),
    message: "VMViewport must distinguish between profiles with and without 9P filesystem support.",
  },
]);

if (uxIssues > 0) {
  console.error(`\n❌ [User UX Hook] FAILED: ${uxIssues} UX accessibility/clarity issue(s) detected.`);
  process.exit(1);
}

console.log("  🔍 Static UX audit passed. Running DOM component and UX interaction tests...");
const uxTests = spawn("npx vitest run src/components/ux-enhancements.test.ts src/components/components.test.tsx", {
  stdio: "inherit",
  shell: true,
});

uxTests.on("close", (code) => {
  if (code === 0) {
    console.log("\n✅ [User UX Hook] PASSED: User experience, DOM accessibility, and terminal flows validated.");
    process.exit(0);
  } else {
    console.error(`\n❌ [User UX Hook] FAILED: UX/DOM test suites failed (exit code ${code}).`);
    process.exit(code || 1);
  }
});
