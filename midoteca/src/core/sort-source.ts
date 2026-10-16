/**
 * Provenance of a manual vs. detected ordering, the positional counterpart of
 * `TitleSource`. Once a module or lesson order is set by the user (`manual`),
 * a rescan must never overwrite it with the filesystem order.
 *
 * Precedence (highest first): `manual` > `detected`.
 */
export type SortSource = 'detected' | 'manual';

export const SORT_SOURCES: readonly SortSource[] = ['detected', 'manual'];

/** True when an automatic (re)scan is allowed to overwrite the order. */
export function isAutoManagedSort(source: SortSource): boolean {
  return source === 'detected';
}
