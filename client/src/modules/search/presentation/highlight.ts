export interface HighlightPart {
  text: string;
  highlighted: boolean;
}

/** Converte os marcadores `[[termo]]` do snippet do backend em partes renderizáveis. */
export function splitHighlights(snippet: string): HighlightPart[] {
  return snippet
    .split(/(\[\[.*?\]\])/)
    .filter((part) => part.length > 0)
    .map((part) =>
      part.startsWith('[[') && part.endsWith(']]')
        ? { text: part.slice(2, -2), highlighted: true }
        : { text: part, highlighted: false },
    );
}
