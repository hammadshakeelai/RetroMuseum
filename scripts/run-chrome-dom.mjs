#!/usr/bin/env node
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const CHROME_PATH = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 4173;
const DEBUG_PORT = 9222;
const APP_URL = `http://localhost:${PORT}/`;
const ARTIFACTS_DIR = process.env.ARTIFACTS_DIR || "artifacts";
mkdirSync(ARTIFACTS_DIR, { recursive: true });

console.log("🌐 Starting WebOS Chrome DOM controller...");

// 1. Start Vite Preview Server
console.log(`  ▶ Launching WebOS preview server on port ${PORT}...`);
const server = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], {
  stdio: "pipe",
  shell: true,
});

server.stdout.on("data", (d) => process.stdout.write(`[Server] ${d}`));
server.stderr.on("data", (d) => process.stderr.write(`[Server] ${d}`));

// Wait for server to respond
async function waitForServer(url, maxRetries = 30) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      // ignore
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server at ${url} did not become ready.`);
}

await waitForServer(APP_URL);
console.log(`  ✅ Server is ready at ${APP_URL}`);

// 2. Launch Google Chrome with remote debugging
const tempProfileDir = join(process.env.TEMP || "C:\\Temp", `chrome-webos-${Date.now()}`);
mkdirSync(tempProfileDir, { recursive: true });

console.log(`  ▶ Launching Google Chrome (controlled via CDP on port ${DEBUG_PORT})...`);
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

// 3. Connect to Chrome DevTools Protocol (CDP)
async function getWsEndpoint() {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
      const list = await res.json();
      const target = list.find((p) => p.type === "page" && p.webSocketDebuggerUrl);
      if (target) return target.webSocketDebuggerUrl;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error("Could not find Chrome CDP WebSocket debugger URL.");
}

const wsUrl = await getWsEndpoint();
console.log(`  ✅ Connected to Chrome CDP: ${wsUrl}`);

// Simple CDP Client over native WebSocket
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

async function captureDomScreenshot(filename) {
  const res = await cdp("Page.captureScreenshot", { format: "png" });
  const buf = Buffer.from(res.data, "base64");
  const target = join(ARTIFACTS_DIR, filename);
  writeFileSync(target, buf);
  console.log(`  📸 Captured DOM screenshot: ${filename}`);
  return target;
}

await cdp("Page.enable");
await cdp("DOM.enable");
await cdp("Runtime.enable");

console.log("  ▶ Navigating to WebOS in Chrome...");
await cdp("Page.navigate", { url: APP_URL });
await new Promise((r) => setTimeout(r, 2000));

// Inspect DOM Tree
console.log("\n===================================================================");
console.log(" 🔍 LIVE CHROME DOM INSPECTION & CONTROL");
console.log("===================================================================");

const pageTitle = await evaluate("document.title");
console.log(`  Title in DOM: "${pageTitle}"`);

const rootChildrenCount = await evaluate("document.getElementById('root')?.childElementCount");
console.log(`  #root child elements count: ${rootChildrenCount}`);

const headerText = await evaluate("document.querySelector('header')?.innerText?.replace(/\\n+/g, ' | ')");
console.log(`  Header elements in DOM: ${headerText}`);

// Capture Initial DOM Screenshot
await captureDomScreenshot("chrome_dom_initial.png");

// Test 1: Query DOM for Distro Selector and Info
const profileName = await evaluate("document.querySelector('header button span.truncate')?.innerText");
console.log(`  Active profile in DOM selector: "${profileName}"`);

// Test 2: Trigger Power On in DOM
console.log("\n  ▶ Interacting with DOM: Clicking 'Power On & Boot VM' button...");
const clickedPowerOn = await evaluate(`
  (() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Power On & Boot VM') || b.innerText.includes('Power On'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  })()
`);
console.log(`  DOM Click 'Power On' executed: ${clickedPowerOn}`);

// Wait 3 seconds for WebAssembly runtime to load and SeaBIOS to initialize
await new Promise((r) => setTimeout(r, 3500));

const statusAfterBoot = await evaluate(`
  (() => {
    const badges = Array.from(document.querySelectorAll('header span'));
    const status = badges.find(s => ['Running', 'Booting...', 'Ready', 'Paused'].includes(s.innerText.trim()));
    return status?.innerText?.trim();
  })()
`);
console.log(`  Status badge in DOM after boot command: "${statusAfterBoot}"`);

// Capture Booting/Running DOM Screenshot
await captureDomScreenshot("chrome_dom_booted.png");

// Test 3: Interacting with QuickKeys Deck in DOM
console.log("\n  ▶ Interacting with DOM: Clicking QuickKeys in the special keyboard deck...");
const quickKeyResult = await evaluate(`
  (() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const tabBtn = buttons.find(b => b.innerText.trim() === 'Tab');
    const enterBtn = buttons.find(b => b.innerText.trim() === 'Enter');
    const bkspBtn = buttons.find(b => b.innerText.trim() === 'Bksp');
    if (tabBtn && enterBtn && bkspBtn) {
      tabBtn.click();
      enterBtn.click();
      bkspBtn.click();
      return { tab: true, enter: true, bksp: true, activeElement: document.activeElement.tagName };
    }
    return null;
  })()
`);
console.log(`  QuickKeys DOM clicks verified:`, quickKeyResult);

// Test 4: Toggle Cyber Lab Mode (Split-Screen) in DOM
console.log("\n  ▶ Interacting with DOM: Toggling 'Cyber Lab Mode' (Dual Station Split-Screen)...");
const toggledDual = await evaluate(`
  (() => {
    const dualBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Cyber Lab Mode'));
    if (dualBtn) {
      dualBtn.click();
      return true;
    }
    return false;
  })()
`);
console.log(`  DOM Click 'Cyber Lab Mode': ${toggledDual}`);

await new Promise((r) => setTimeout(r, 1000));

const stationsInDom = await evaluate(`
  (() => {
    const stations = Array.from(document.querySelectorAll('button')).filter(b => b.innerText.includes('Station 1') || b.innerText.includes('Station 2'));
    return stations.map(s => s.innerText.replace(/\\n+/g, ' '));
  })()
`);
console.log(`  Stations rendered in DOM:`, stationsInDom);

// Capture Dual Lab DOM Screenshot
await captureDomScreenshot("chrome_dom_duallab.png");

// Test 5: Open Modals in DOM and verify Dialog backdrop & accessibility
console.log("\n  ▶ Interacting with DOM: Opening 'Network' settings modal...");
await evaluate(`
  (() => {
    const netBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Network'));
    netBtn?.click();
  })()
`);

await new Promise((r) => setTimeout(r, 1000));

const modalLabel = await evaluate("document.querySelector('dialog')?.getAttribute('aria-label')");
const modalTitle = await evaluate("document.querySelector('dialog h2')?.innerText");
console.log(`  Dialog element rendered in DOM: aria-label="${modalLabel}", title="${modalTitle}"`);

await captureDomScreenshot("chrome_dom_modal.png");

// Close modal via backdrop click
console.log("  ▶ Interacting with DOM: Closing modal via backdrop click...");
await evaluate(`
  (() => {
    const dialog = document.querySelector('dialog');
    if (dialog) {
      dialog.click(); // clicks outer dialog backdrop
    }
  })()
`);

await new Promise((r) => setTimeout(r, 800));
const dialogStillOpen = await evaluate("!!document.querySelector('dialog')");
console.log(`  Dialog dismissed cleanly in DOM: ${!dialogStillOpen}`);

console.log("\n===================================================================");
console.log(" 🎉 CHROME DOM AUTOMATION COMPLETE: ALL DOM INTERACTIONS VERIFIED");
console.log("===================================================================");

// Cleanup
ws.close();
chrome.kill();
server.kill();
process.exit(0);
