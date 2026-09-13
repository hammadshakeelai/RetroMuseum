// Playwright key presses that type text into v86. v86 only sees Shift when a Shift key event arrives, so
// capitals and shifted symbols are pressed with Shift held.
const SHIFTED: Record<string, string> = {
  "!": "Digit1",
  "@": "Digit2",
  "#": "Digit3",
  $: "Digit4",
  "%": "Digit5",
  "^": "Digit6",
  "&": "Digit7",
  "*": "Digit8",
  "(": "Digit9",
  ")": "Digit0",
  _: "Minus",
  "+": "Equal",
  ":": "Semicolon",
  '"': "Quote",
  "<": "Comma",
  ">": "Period",
  "?": "Slash",
  "|": "Backslash",
  "~": "Backquote",
  "{": "BracketLeft",
  "}": "BracketRight",
};

const PLAIN: Record<string, string> = {
  " ": "Space",
  "\n": "Enter",
  "-": "Minus",
  "=": "Equal",
  ";": "Semicolon",
  "'": "Quote",
  ",": "Comma",
  ".": "Period",
  "/": "Slash",
  "\\": "Backslash",
  "`": "Backquote",
  "[": "BracketLeft",
  "]": "BracketRight",
};

/** The keys to pass to Playwright's `keyboard.press`, one per character, to type `text` on a US keyboard. */
export function keyPresses(text: string): string[] {
  return [...text].map((char) => {
    if (/^[a-z]$/.test(char)) return `Key${char.toUpperCase()}`;
    if (/^[A-Z]$/.test(char)) return `Shift+Key${char}`;
    if (/^[0-9]$/.test(char)) return `Digit${char}`;
    const shifted = SHIFTED[char];
    if (shifted) return `Shift+${shifted}`;
    const plain = PLAIN[char];
    if (plain) return plain;
    throw new Error(`Can't type ${JSON.stringify(char)}`);
  });
}
