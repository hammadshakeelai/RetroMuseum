// Reads and edits exhibit Markdown files for the screenshot and health-check scripts.
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parse } from "yaml";

export interface ExhibitFile {
  slug: string;
  path: string;
  data: Record<string, unknown>;
}

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---(\r?\n|$)/;

export function readFrontmatter(text: string): Record<string, unknown> {
  const match = FRONTMATTER.exec(text);
  if (!match) throw new Error("Missing frontmatter");
  const data: unknown = parse(match[1]);
  if (typeof data !== "object" || data === null) throw new Error("Frontmatter isn't a mapping");
  return data as Record<string, unknown>;
}

/** Sets a top-level key: replaces its line, or adds it before the closing ---. */
export function setFrontmatterValue(text: string, key: string, value: string | number): string {
  const match = FRONTMATTER.exec(text);
  if (!match) throw new Error("Missing frontmatter");
  const newline = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = match[1].split(/\r?\n/);
  const entry = `${key}: ${value}`;
  const index = lines.findIndex((line) => line.startsWith(`${key}:`));
  if (index >= 0) lines[index] = entry;
  else lines.push(entry);
  return `---${newline}${lines.join(newline)}${newline}---${match[2]}${text.slice(match[0].length)}`;
}

export async function readExhibits(dir: string): Promise<ExhibitFile[]> {
  const names = (await readdir(dir)).filter((name) => name.endsWith(".md")).sort();
  return Promise.all(
    names.map(async (name) => {
      const path = join(dir, name);
      return { slug: name.slice(0, -3), path, data: readFrontmatter(await readFile(path, "utf8")) };
    }),
  );
}

export async function updateExhibitFile(path: string, values: Record<string, string | number>): Promise<void> {
  let text = await readFile(path, "utf8");
  for (const [key, value] of Object.entries(values)) text = setFrontmatterValue(text, key, value);
  await writeFile(path, text);
}
