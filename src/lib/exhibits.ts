export const COPYRIGHT_LABEL =
  "Copyrighted software, shown for its history. The disk image loads from copy.sh, the v86 project's server.";

export function downloadLine(megabytes: number): string {
  return `Downloads as it runs, about ${megabytes} MB to reach the desktop.`;
}

export function byYear(a: { year: number; title: string }, b: { year: number; title: string }): number {
  return a.year - b.year || a.title.localeCompare(b.title);
}
