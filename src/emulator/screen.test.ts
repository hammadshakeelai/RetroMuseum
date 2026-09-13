// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { createScreen, fitScreen } from "./screen.ts";

/** happy-dom lays nothing out, so give the element the size a browser would report, its transform included. */
function lay(element: HTMLElement, width: number, height: number): void {
  element.getBoundingClientRect = () => {
    const scale = Number(/scale\(([^)]+)\)/.exec(element.style.transform)?.[1] ?? 1);
    return { width: width * scale, height: height * scale } as DOMRect;
  };
}

describe("createScreen", () => {
  it("builds the structure v86's ScreenAdapter expects", () => {
    const { container, text, canvas } = createScreen(document);
    expect(container.className).toBe("v86-screen");
    expect([...container.children]).toEqual([text, canvas]);
    expect(text.tagName).toBe("DIV");
    expect(text.style.whiteSpace).toBe("pre");
    expect(text.style.lineHeight).toBe("14px");
    expect(canvas.style.display).toBe("none");
  });

  it("sizes the screen to what v86 draws, not to the space around it", () => {
    expect(createScreen(document).container.style.width).toBe("max-content");
  });
});

describe("fitScreen", () => {
  it("scales the text layer while the guest is in text mode", () => {
    const screen = createScreen(document);
    lay(screen.text, 720, 400);
    fitScreen(screen, { width: 1440, height: 1000 });
    expect(screen.text.style.transform).toBe("scale(2)");
    expect(screen.canvas.style.transform).toBe("");
  });

  it("scales the canvas from the size v86 laid it out at, once the guest is in graphics mode", () => {
    const screen = createScreen(document);
    screen.text.style.transform = "scale(2)";
    screen.text.style.display = "none";
    screen.canvas.style.display = "block";
    // v86 shows a 320x200 canvas at double size on a large window.
    lay(screen.canvas, 640, 400);
    fitScreen(screen, { width: 1000, height: 750 });
    expect(screen.canvas.style.transform).toBe("scale(1.5625)");
    expect(screen.text.style.transform).toBe("");
  });

  it("measures the screen without its own earlier scale", () => {
    const screen = createScreen(document);
    lay(screen.text, 720, 400);
    fitScreen(screen, { width: 1440, height: 1000 });
    fitScreen(screen, { width: 720, height: 500 });
    expect(screen.text.style.transform).toBe("scale(1)");
  });
});
