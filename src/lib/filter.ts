/** `filter` is "all" or a family id. */
export function matchesFilter(family: string, filter: string): boolean {
  return filter === "all" || family === filter;
}
