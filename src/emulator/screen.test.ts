// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { createScreen, naturalSize } from "./screen.ts";

describe("createScreen", () => {
  it("builds the structure v86's ScreenAdapter expects", () => {
    const { container, canvas } = createScreen(document);
    expect(container.className).toBe("v86-screen");
    expect(container.children).toHaveLength(2);
    const text = container.children[0] as HTMLElement;
    expect(text.tagName).toBe("DIV");
    expect(text.style.whiteSpace).toBe("pre");
    expect(text.style.lineHeight).toBe("14px");
    expect(container.children[1]).toBe(canvas);
    expect(canvas.style.display).toBe("none");
  });

  it("measures the canvas in pixels", () => {
    const { canvas } = createScreen(document);
    canvas.width = 720;
    canvas.height = 400;
    expect(naturalSize(canvas)).toEqual({ width: 720, height: 400 });
  });
});
