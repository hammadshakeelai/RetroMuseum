export const COPYRIGHT_LABEL =
  "Copyrighted software, shown for its history. It runs on copy.sh, the v86 project's site; RetroMuseum doesn't host it.";

export function downloadLine(megabytes: number): string {
  return `Downloads as it runs, about ${megabytes} MB to reach the desktop.`;
}

export function copyShLine(megabytes: number): string {
  return `Opens on copy.sh, the v86 project's site, and downloads about ${megabytes} MB as it runs.`;
}

export function copyShUrl(profile: string): string {
  return `https://copy.sh/v86/?profile=${encodeURIComponent(profile)}`;
}

/** Null when an exhibit is exactly one kind: hosted (diskImage and v86) or on copy.sh (copyShProfile). */
export function exhibitKindIssue(data: { v86?: unknown; diskImage?: unknown; copyShProfile?: unknown }): string | null {
  const hosted = data.v86 !== undefined && data.diskImage !== undefined;
  const partlyHosted = data.v86 !== undefined || data.diskImage !== undefined;
  const onCopySh = data.copyShProfile !== undefined;
  if ((hosted && !onCopySh) || (!partlyHosted && onCopySh)) return null;
  return "An exhibit needs either diskImage and v86 (it boots on its page) or copyShProfile (it runs on copy.sh), not both.";
}

export function byYear(a: { year: number; title: string }, b: { year: number; title: string }): number {
  return a.year - b.year || a.title.localeCompare(b.title);
}
