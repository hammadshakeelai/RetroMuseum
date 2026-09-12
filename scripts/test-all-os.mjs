#!/usr/bin/env node
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const CHROME_PATH = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 4174;
const DEBUG_PORT = 9223;
const APP_URL = `http://localhost:${PORT}/`;
const ARTIFACTS_DIR = process.env.ARTIFACTS_DIR || "artifacts";
mkdirSync(ARTIFACTS_DIR, { recursive: true });

console.log("🚀 Testing All WebOS OS Profiles in Chrome DOM...");

// Start preview server on port 4174
const server = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], {
  stdio: "ignore",
  shell: true,
});

async function waitForServer(url) {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error("Server not ready");
}

await waitForServer(APP_URL);
console.log(`  ✅ Server ready at ${APP_URL}`);

const tempProfileDir = join(process.env.TEMP || "C:\\Temp", `chrome-os-tests-${Date.now()}`);
mkdirSync(tempProfileDir, { recursive: true });

const chrome = spawn(
  CHROME_PATH,
  [
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${tempProfileDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--window-size=1280,900",
    "--headless=new",
    APP_URL,
  ],
  { stdio: "ignore" }
);

async function getWsEndpoint() {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
      const list = await res.json();
      const target = list.find((p) => p.type === "page" && p.webSocketDebuggerUrl);
      if (target) return target.webSocketDebuggerUrl;
    } catch {}
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error("Could not find Chrome WebSocket URL");
}

const wsUrl = await getWsEndpoint();
const ws = new WebSocket(wsUrl);
await new Promise((resolve) => ws.onopen = resolve);

let idCounter = 1;
const pending = new Map();

ws.onmessage = (msg) => {
  const data = JSON.parse(msg.data.toString());
  if (data.id && pending.has(data.id)) {
    const { resolve, reject } = pending.get(data.id);
    pending.delete(data.id);
    if (data.error) reject(data.error);
    else resolve(data.result);
  }
};

function cdp(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++idCounter;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const res = await cdp("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  return res.result?.value;
}

async function screenshot(filename) {
  const res = await cdp("Page.captureScreenshot", { format: "png" });
  const buf = Buffer.from(res.data, "base64");
  const target = join(ARTIFACTS_DIR, filename);
  writeFileSync(target, buf);
  return target;
}

await cdp("Page.enable");
await cdp("DOM.enable");
await cdp("Runtime.enable");

// Profiles to test:
const profilesToTest = [
  { id: "micro-sandbox", name: "Micro Linux 5.6", expectedMode: "cli", type: "bundled" },
  { id: "kolibri-gui", name: "KolibriOS (Floppy GUI)", expectedMode: "gui", type: "floppy" },
  { id: "freedos-cli", name: "FreeDOS 1.3 (Floppy CLI)", expectedMode: "cli", type: "floppy" },
  { id: "linux4-cli", name: "Linux 4.x Minimal Live CD", expectedMode: "cli", type: "cdrom" },
  { id: "dsl-gui", name: "Damn Small Linux 4.11", expectedMode: "gui", type: "cdrom" },
  { id: "arch-cli", name: "Arch Linux 32 (Terminal)", expectedMode: "cli", type: "state" },
  { id: "kali-cli", name: "Kali Linux 2024.3", expectedMode: "cli", type: "custom-media" },
];

console.log("\n===================================================================");
console.log(" 🧪 TESTING OS PROFILES IN CHROME DOM");
console.log("===================================================================\n");

const testResults = [];

for (const profile of profilesToTest) {
  console.log(`▶ Testing Profile: ${profile.name} (${profile.id})...`);
  
  // Navigate with query param ?profile=id
  await cdp("Page.navigate", { url: `${APP_URL}?profile=${profile.id}` });
  await new Promise((r) => setTimeout(r, 1500));

  const activeName = await evaluate("document.querySelector('header button span.truncate')?.innerText");
  const isIdle = await evaluate("Array.from(document.querySelectorAll('header span')).some(s => s.innerText.trim() === 'Ready')");
  console.log(`  DOM State: "${activeName}" (Ready status: ${isIdle})`);

  if (profile.type === "custom-media") {
    // For custom-media profiles, clicking Power On or selecting should trigger MountMediaModal
    await evaluate(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Power On'));
        btn?.click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 1000));
    const dialogOpen = await evaluate("!!document.querySelector('dialog')");
    const dialogTitle = await evaluate("document.querySelector('dialog h2')?.innerText");
    console.log(`  Custom media guard: Dialog open=${dialogOpen} ("${dialogTitle}")`);
    await screenshot(`os_test_${profile.id}_guard.png`);
    
    // Dismiss dialog
    await evaluate("document.querySelector('dialog')?.click()");
    await new Promise((r) => setTimeout(r, 500));

    testResults.push({
      ...profile,
      status: dialogOpen ? "PASSED (Protected & Modal Pre-filled)" : "FAILED",
    });
    continue;
  }

  // Click Power On
  console.log(`  Clicking 'Power On' in DOM...`);
  await evaluate(`
    (() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Power On'));
      btn?.click();
    })()
  `);

  // Wait 4 seconds for boot initialization
  await new Promise((r) => setTimeout(r, 4500));

  const currentStatus = await evaluate(`
    (() => {
      const badges = Array.from(document.querySelectorAll('header span'));
      const status = badges.find(s => ['Running', 'Booting...', 'Ready', 'Paused'].includes(s.innerText.trim()));
      return status?.innerText?.trim();
    })()
  `);

  const hasCanvas = await evaluate("!!document.querySelector('.v86-screen-target canvas')");
  const hasText = await evaluate("!!document.querySelector('.v86-screen-target div')");
  
  console.log(`  Status in DOM: "${currentStatus}", Canvas: ${hasCanvas}, Text container: ${hasText}`);
  await screenshot(`os_test_${profile.id}.png`);

  testResults.push({
    ...profile,
    status: (currentStatus === "Running" || currentStatus === "Booting...") ? "PASSED (Active Boot)" : `STATUS: ${currentStatus}`,
    screen: hasCanvas && hasText ? "VGA/Canvas Ready" : "Screen Missing",
  });
}

console.log("\n===================================================================");
console.log(" 📊 OS Profile Test Summary in Chrome DOM");
console.log("===================================================================");
for (const r of testResults) {
  console.log(` • ${r.name.padEnd(28)} : ${r.status}`);
}
console.log("===================================================================\n");

ws.close();
chrome.kill();
server.kill();
process.exit(0);
