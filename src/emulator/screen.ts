import { fitScale, type Size } from "./fit.ts";

export interface ScreenElements {
  container: HTMLElement;
  text: HTMLElement;
  canvas: HTMLCanvasElement;
}

/** The structure v86's ScreenAdapter expects (v86 examples/basic.html), as wide as what v86 draws in it. */
export function createScreen(doc: Document): ScreenElements {
  const container = doc.createElement("div");
  container.className = "v86-screen";
  container.style.width = "max-content";
  const text = doc.createElement("div");
  text.style.whiteSpace = "pre";
  text.style.font = "14px monospace";
  text.style.lineHeight = "14px";
  const canvas = doc.createElement("canvas");
  canvas.style.display = "none";
  container.append(text, canvas);
  return { container, text, canvas };
}

/**
 * Scales the layer v86 is showing to fit `area`. v86 sizes its layers itself (it divides the canvas size by a
 * fractional devicePixelRatio and doubles small canvases on large windows), so the layer is measured as laid out.
 */
export function fitScreen(screen: ScreenElements, area: Size): void {
  screen.text.style.transform = "";
  screen.canvas.style.transform = "";
  const shown = screen.canvas.style.display === "none" ? screen.text : screen.canvas;
  const { width, height } = shown.getBoundingClientRect();
  shown.style.transform = `scale(${fitScale(area, { width, height })})`;
}
