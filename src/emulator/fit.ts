export interface Size {
  width: number;
  height: number;
}

/** The largest scale that fits `content` inside `area` without cropping. */
export function fitScale(area: Size, content: Size): number {
  if (area.width <= 0 || area.height <= 0 || content.width <= 0 || content.height <= 0) return 1;
  return Math.min(area.width / content.width, area.height / content.height);
}
