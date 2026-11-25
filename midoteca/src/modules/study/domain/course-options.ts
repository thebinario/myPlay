/** A library course that can back a study track. */
export interface StudyCourseOption {
  courseId: string;
  title: string;
  /** Library (source) of the course; null for courses created by hand. */
  sourceId: string | null;
  libraryName: string;
  collectionTitle: string | null;
  moduleCount: number;
  lessonCount: number;
}

/** Courses of one library, in catalog order. */
export interface StudyCourseLibrary {
  sourceId: string | null;
  libraryName: string;
  courses: StudyCourseOption[];
}

/** Lowercase, accentless form used for matching ("Gestão" ≈ "gestao"). */
function fold(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/**
 * Filters the catalog by `query` (every term must appear in the course, its
 * collection or its library, ignoring case and accents) and groups the result
 * by library, keeping the catalog order. Empty groups are dropped.
 */
export function groupCourseOptions(
  options: readonly StudyCourseOption[],
  query: string,
): StudyCourseLibrary[] {
  const terms = fold(query).split(/\s+/).filter(Boolean);
  const groups = new Map<string, StudyCourseLibrary>();
  for (const option of options) {
    const haystack = fold(`${option.libraryName} ${option.collectionTitle ?? ''} ${option.title}`);
    if (!terms.every((term) => haystack.includes(term))) continue;
    const key = option.sourceId ?? '';
    let group = groups.get(key);
    if (!group) {
      group = { sourceId: option.sourceId, libraryName: option.libraryName, courses: [] };
      groups.set(key, group);
    }
    group.courses.push(option);
  }
  return [...groups.values()];
}
