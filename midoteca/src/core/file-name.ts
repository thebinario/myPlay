/** Last segment of a POSIX or Windows path, for progress/status labels. */
export function fileNameOf(path: string): string {
  const segments = path.split(/[\\/]/).filter((part) => part.length > 0);
  return segments.at(-1) ?? path;
}

/** File name without its extension ("01 - Intro.mp4" → "01 - Intro"). */
export function fileStemOf(path: string): string {
  const name = fileNameOf(path);
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(0, dot) : name;
}
