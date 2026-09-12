#!/usr/bin/env node
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";

console.log("\n🛡️  [Redteam Hook] Running Security and Adversarial Resilience audit...");

let violations = 0;

function auditFile(path, checks) {
  try {
    const content = readFileSync(path, "utf-8");
    for (const check of checks) {
      if (!check.test(content)) {
        console.error(`  ❌ [Security Violation] ${path}: ${check.message}`);
        violations++;
      }
    }
  } catch (err) {
    console.error(`  ❌ [Security Error] Failed to read ${path}: ${err.message}`);
    violations++;
  }
}

// 1. Audit V86Engine for path traversal and snapshot bounds defenses
auditFile("src/emulator/V86Engine.ts", [
  {
    test: (c) => c.includes("sanitizeGuestPath") && c.includes("validateSnapshotBuffer"),
    message: "Must use sanitizeGuestPath and validateSnapshotBuffer to defend against path traversal and buffer corruption.",
  },
  {
    test: (c) => c.includes("keyboard_set_enabled(focused)"),
    message: "Must isolate emulator keyboard and mouse input.",
  },
]);

// 2. Audit NetworkBridge for Ethernet frame constraints & channel validation
auditFile("src/emulator/networking.ts", [
  {
    test: (c) => c.includes("MIN_ETHERNET_FRAME_SIZE") && c.includes("MAX_ETHERNET_FRAME_SIZE"),
    message: "Must enforce minimum and maximum Ethernet frame size constraints.",
  },
  {
    test: (c) => c.includes("validateChannelName"),
    message: "Must validate BroadcastChannel subnet names.",
  },
]);

// 3. Audit MountMediaModal for URL protocol validation
auditFile("src/components/modals/MountMediaModal.tsx", [
  {
    test: (c) => c.includes("validateIsoUrl"),
    message: "Must validate ISO URLs using validateIsoUrl to prevent mixed-content and credential leakage.",
  },
]);

// 4. Audit NetworkModal for WebSocket relay URL validation
auditFile("src/components/modals/NetworkModal.tsx", [
  {
    test: (c) => c.includes("validateRelayUrl"),
    message: "Must validate WebSocket relay URLs using validateRelayUrl.",
  },
]);

if (violations > 0) {
  console.error(`\n❌ [Redteam Hook] FAILED: ${violations} security rule violation(s) found.`);
  process.exit(1);
}

console.log("  🔍 Static security analysis passed. Running automated security test suite...");
const secTests = spawn("npx vitest run src/emulator/security.test.ts", {
  stdio: "inherit",
  shell: true,
});

secTests.on("close", (code) => {
  if (code === 0) {
    console.log("\n✅ [Redteam Hook] PASSED: All security validations, path sanitization, and attack vectors defended.");
    process.exit(0);
  } else {
    console.error(`\n❌ [Redteam Hook] FAILED: Security test suite encountered failures (code ${code}).`);
    process.exit(code || 1);
  }
});
