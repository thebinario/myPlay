/** Last segment of a POSIX or Windows path, for progress/status labels. */
export function fileNameOf(path: string): string {
  const segments = path.split(/[\\/]/).filter((part) => part.length > 0);
  return segments.at(-1) ?? path;
}
