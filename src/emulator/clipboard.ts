// Scancode sequences (Set 1) for special keyboard shortcuts in v86

export const SCANCODES = {
  // Ctrl + Alt + Delete
  CTRL_ALT_DEL: [0x1d, 0x38, 0xe0, 0x53, 0xe0, 0xd3, 0xb8, 0x9d],
  
  // Ctrl + C (SIGINT in terminal)
  CTRL_C: [0x1d, 0x2e, 0xae, 0x9d],

  // Ctrl + Z (SIGTSTP)
  CTRL_Z: [0x1d, 0x2c, 0xac, 0x9d],

  // Ctrl + D (EOF / Logout)
  CTRL_D: [0x1d, 0x20, 0xa0, 0x9d],

  // Ctrl + L (Clear terminal screen)
  CTRL_L: [0x1d, 0x26, 0xa6, 0x9d],

  // Tab (Autocomplete)
  TAB: [0x0f, 0x8f],

  // Escape
  ESC: [0x01, 0x81],

  // Enter
  ENTER: [0x1c, 0x9c],

  // Up Arrow
  UP: [0xe0, 0x48, 0xe0, 0xc8],

  // Down Arrow
  DOWN: [0xe0, 0x50, 0xe0, 0xd0],

  // Left Arrow
  LEFT: [0xe0, 0x4b, 0xe0, 0xcb],

  // Right Arrow
  RIGHT: [0xe0, 0x4d, 0xe0, 0xcd],

  // Alt + F1 (tty1)
  ALT_F1: [0x38, 0x3b, 0xbb, 0xb8],

  // Alt + F2 (tty2)
  ALT_F2: [0x38, 0x3c, 0xbc, 0xb8],

  // Alt + F7 (Xorg Desktop screen in many distros)
  ALT_F7: [0x38, 0x41, 0xc1, 0xb8],
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function sendSpecialKey(emulator: any, scancodes: number[]) {
  if (!emulator) return;
  try {
    emulator.keyboard_send_scancodes(scancodes);
  } catch (e) {
    console.warn("Failed to send scancodes:", e);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function sendText(emulator: any, text: string) {
  if (!emulator || !text) return;
  try {
    emulator.keyboard_send_text(text);
  } catch (e) {
    console.warn("Failed to send text to emulator:", e);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function pasteClipboard(emulator: any) {
  if (!navigator.clipboard || !navigator.clipboard.readText) {
    throw new Error("Clipboard API not supported in this browser");
  }
  const text = await navigator.clipboard.readText();
  if (text) {
    sendText(emulator, text);
  }
}
