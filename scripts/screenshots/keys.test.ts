import { describe, expect, it } from "vitest";
import { keyPresses } from "./keys.ts";

describe("keyPresses", () => {
  it("types lower and upper case letters", () => {
    expect(keyPresses("aB")).toEqual(["KeyA", "Shift+KeyB"]);
  });

  it("holds Shift for shifted symbols, because v86 only sees Shift from a Shift key event", () => {
    expect(keyPresses("(EQ)")).toEqual(["Shift+Digit9", "Shift+KeyE", "Shift+KeyQ", "Shift+Digit0"]);
  });

  it("presses Space for a space and Enter for a new line", () => {
    expect(keyPresses("a 1\n")).toEqual(["KeyA", "Space", "Digit1", "Enter"]);
  });

  it("refuses a character it can't type on a US keyboard", () => {
    expect(() => keyPresses("é")).toThrow('Can\'t type "é"');
  });
});
