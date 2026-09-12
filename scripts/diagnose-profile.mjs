#!/usr/bin/env node
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 4175;
const DEBUG_PORT = 9226;
const APP_URL = `http://localhost:${PORT}/?profile=linux4-cli`;

console.log("Starting server on port", PORT);
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
console.log("Server ready at", APP_URL);

const tempProfileDir = join(process.env.TEMP || "C:\\Temp", `chrome-diag-${Date.now()}`);
mkdirSync(tempProfileDir, { recursive: true });

const chrome = spawn(
  CHROME_PATH,
  [
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${tempProfileDir}`,
    "--no-first-run",
    "--no-default-browser-check",
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
  if (data.method === "Console.messageAdded") {
    console.log("[Console Message]", data.params.message.level, data.params.message.text);
  } else if (data.method === "Runtime.consoleAPICalled") {
    console.log("[Console API]", data.params.type, data.params.args?.map(a => a.value || a.description).join(" "));
  } else if (data.method === "Runtime.exceptionThrown") {
    console.log("[Exception]", data.params.exceptionDetails?.text, data.params.exceptionDetails?.exception?.description);
  } else if (data.method === "Network.loadingFailed") {
    console.log("[Network Failed]", data.params.errorText, data.params.type);
  }
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

await cdp("Page.enable");
await cdp("DOM.enable");
await cdp("Runtime.enable");
await cdp("Console.enable");
await cdp("Network.enable");

await new Promise((r) => setTimeout(r, 2000));

console.log("Clicking Power On for linux4-cli...");
await cdp("Runtime.evaluate", {
  expression: `
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Power On'));
    btn?.click();
  `,
});

await new Promise((r) => setTimeout(r, 6000));

ws.close();
chrome.kill();
server.kill();
process.exit(0);
