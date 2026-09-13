/**
 * True when fewer than `minFraction` of the RGBA pixels differ from the screen's most common
 * colour. Measuring against the most common colour (not the first pixel) keeps a cursor or a
 * character in the top-left corner from making an empty screen look busy.
 */
export function isBlank(pixels: Uint8ClampedArray, minFraction = 0.0005): boolean {
  const count = Math.floor(pixels.length / 4);
  if (count === 0) return true;
  const colors = new Map<number, number>();
  let mostCommon = 0;
  for (let i = 0; i < count * 4; i += 4) {
    const color = (pixels[i] << 16) | (pixels[i + 1] << 8) | pixels[i + 2];
    const seen = (colors.get(color) ?? 0) + 1;
    colors.set(color, seen);
    if (seen > mostCommon) mostCommon = seen;
  }
  return (count - mostCommon) / count < minFraction;
}
