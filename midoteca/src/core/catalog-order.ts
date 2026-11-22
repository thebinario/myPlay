/**
 * Display order of catalog siblings (courses, sections, modules, lessons).
 *
 * Rules, in precedence order:
 * 1. A persisted `sortOrder` (manual reorder or a leading `01 -` prefix) wins.
 * 2. Titles carrying an ordinal number ("Módulo 2", "03 - Abertura") come first,
 *    by that number, so 2 precedes 10.
 * 3. Unnumbered titles ("Bônus", "Extras") come after the numbered ones.
 * 4. Ties fall back to a natural, case- and accent-insensitive comparison.
 *
 * Pure domain rule: no persistence, no framework.
 */

/** Words that announce a sequence number right after them. Accent-free, lowercase. */
const ORDINAL_WORDS = [
  'modulo',
  'module',
  'mod',
  'aula',
  'lesson',
  'licao',
  'parte',
  'part',
  'capitulo',
  'chapter',
  'cap',
  'secao',
  'section',
  'unidade',
  'unit',
  'semana',
  'week',
  'dia',
  'day',
  'episodio',
  'episode',
  'ep',
  'etapa',
  'fase',
  'phase',
  'nivel',
  'level',
  'bloco',
  'block',
  'topico',
  'topic',
  'temporada',
  'season',
  'volume',
  'vol',
  'curso',
  'course',
  'video',
];

const ORDINAL_RE = new RegExp(
  `^[\\[(#]?\\s*(?:(?:${ORDINAL_WORDS.join('|')})\\.?\\s*)?(\\d{1,6})(?=$|[\\s\\-_.:)\\]–—])`,
);

/** Lowercase, accent-free, trimmed form used for comparisons. */
function normalize(title: string): string {
  return title.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

/** The sequence number a title announces, or `null` when it is unnumbered. */
export function ordinalNumber(title: string): number | null {
  const match = ORDINAL_RE.exec(normalize(title));
  return match ? Number.parseInt(match[1], 10) : null;
}

/** Case-insensitive, numeric-aware comparison ("2" < "10"). */
export function naturalCompare(a: string, b: string): number {
  const leftParts = a.toLowerCase().match(/(\d+|\D+)/g) ?? [];
  const rightParts = b.toLowerCase().match(/(\d+|\D+)/g) ?? [];
  const length = Math.max(leftParts.length, rightParts.length);
  for (let i = 0; i < length; i += 1) {
    const lp = leftParts[i];
    const rp = rightParts[i];
    if (lp === undefined) return -1;
    if (rp === undefined) return 1;
    const ln = Number(lp);
    const rn = Number(rp);
    if (!Number.isNaN(ln) && !Number.isNaN(rn)) {
      if (ln !== rn) return ln - rn;
    } else if (lp !== rp) {
      return lp < rp ? -1 : 1;
    }
  }
  return 0;
}

/** Orders sibling titles: numbered by number, unnumbered last, then natural. */
export function compareCatalogTitles(a: string, b: string): number {
  const left = ordinalNumber(a);
  const right = ordinalNumber(b);
  if (left !== null && right !== null && left !== right) return left - right;
  if (left !== null && right === null) return -1;
  if (left === null && right !== null) return 1;
  const natural = naturalCompare(normalize(a), normalize(b));
  return natural !== 0 ? natural : naturalCompare(a, b);
}

export interface CatalogSortable {
  sortOrder: number;
  title: string;
}

/** Persisted order first, then the title rule. */
export function compareCatalogEntries(a: CatalogSortable, b: CatalogSortable): number {
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  return compareCatalogTitles(a.title, b.title);
}

/** Returns a new array of persistence rows ordered by `sort_order` + title. */
export function sortCatalogRows<T extends { sort_order: number; title: string }>(
  rows: readonly T[],
): T[] {
  return [...rows].sort((a, b) =>
    compareCatalogEntries(
      { sortOrder: a.sort_order, title: a.title },
      { sortOrder: b.sort_order, title: b.title },
    ),
  );
}
