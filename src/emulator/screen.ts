import type { Size } from "./fit.ts";

export interface ScreenElements {
  container: HTMLElement;
  canvas: HTMLCanvasElement;
}

/** The structure v86's ScreenAdapter expects (v86 examples/basic.html). */
export function createScreen(doc: Document): ScreenElements {
  const container = doc.createElement("div");
  container.className = "v86-screen";
  const text = doc.createElement("div");
  text.style.whiteSpace = "pre";
  text.style.font = "14px monospace";
  text.style.lineHeight = "14px";
  const canvas = doc.createElement("canvas");
  canvas.style.display = "none";
  container.append(text, canvas);
  return { container, canvas };
}

/** With use_graphical_text, v86 draws text mode on the canvas too, so its pixel size is the screen size. */
export function naturalSize(canvas: HTMLCanvasElement): Size {
  return { width: canvas.width, height: canvas.height };
}
