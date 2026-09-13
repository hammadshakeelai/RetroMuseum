import type { V86Block } from "./v86-block.ts";

interface Image {
  url: string;
  use_parts?: boolean;
  fixed_chunk_size?: number;
}

/**
 * The first URL v86 requests for an image. A split image (use_parts) loads in parts named like
 * v86's AsyncXHRPartfileBuffer (src/buffer.js): "<base>0-<chunk size><extension>".
 */
export function firstRequestUrl(image: Image): string {
  if (!image.use_parts) return image.url;
  const extension = /\.[^.]+(\.zst)?$/.exec(image.url)?.[0] ?? "";
  let basename = image.url.slice(0, image.url.length - extension.length);
  if (!basename.endsWith("/")) basename += "-";
  return `${basename}0-${image.fixed_chunk_size}${extension}`;
}

/** Every URL an exhibit needs to start: each disk's first request, then its snapshot. */
export function exhibitUrls(block: V86Block): string[] {
  const disks = [block.fda, block.hda, block.cdrom].filter((disk) => disk !== undefined);
  const urls = disks.map((disk) => firstRequestUrl(disk));
  if (block.initial_state) urls.push(block.initial_state.url);
  return urls;
}
