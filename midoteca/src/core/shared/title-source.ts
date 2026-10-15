/**
 * Provenance of a display title. Rescans must never clobber user intent, so
 * every editable title records where it came from.
 *
 * Precedence (highest first): `manual` > `manifest` > `detected`.
 */
export type TitleSource = 'detected' | 'manual' | 'manifest';

export const TITLE_SOURCES: readonly TitleSource[] = ['detected', 'manual', 'manifest'];

/** True when an automatic (re)scan is allowed to overwrite the title. */
export function isAutoManagedTitle(source: TitleSource): boolean {
  return source === 'detected';
}
