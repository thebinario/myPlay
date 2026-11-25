import { naturalCompare } from '../../../core/catalog-order';

/**
 * Pure rules for the AI-suggested course organization. The model only proposes
 * where each module starts (1-based positions in reading order) and its title;
 * everything that guarantees a valid catalog lives here, so a bad answer can
 * never lose, duplicate or reorder lessons.
 */

/** What the model returns: the first lesson (1-based) of each module. */
export interface SuggestedBoundary {
  title: string;
  start: number;
}

export interface SuggestedModule {
  title: string;
  lessonIds: string[];
}

export type SuggestionStatus = 'pending' | 'running' | 'ready' | 'failed';

/** Persisted suggestion for one course, reviewed by the user before applying. */
export interface OrganizationSuggestion {
  courseId: string;
  status: SuggestionStatus;
  /** Empty until `ready`. */
  modules: SuggestedModule[];
  modelId: string | null;
  error: string | null;
  updatedAt: string;
}

interface OrderableLesson {
  id: string;
  title: string;
  relativePath: string | null;
}

/**
 * Lessons in the order the course was published: by file path (the numeric
 * prefixes of a flat folder), so an earlier automatic split does not hide the
 * original sequence. Lessons without a path keep their module order.
 */
export function orderLessonsForSuggestion<T extends OrderableLesson>(
  modules: readonly { lessons: readonly T[] }[],
): T[] {
  const lessons = modules.flatMap((module) => module.lessons);
  const position = new Map(lessons.map((lesson, index) => [lesson.id, index]));
  return [...lessons].sort((a, b) => {
    if (a.relativePath !== null && b.relativePath !== null) {
      const byPath = naturalCompare(a.relativePath, b.relativePath);
      if (byPath !== 0) return byPath;
    }
    return position.get(a.id)! - position.get(b.id)!;
  });
}

/**
 * Turns the model's boundaries into contiguous modules that cover every lesson
 * exactly once. Starts that go backwards or fall outside the list are ignored;
 * the first module always starts at the first lesson.
 */
export function buildSuggestedModules(
  lessonIds: readonly string[],
  boundaries: readonly SuggestedBoundary[],
): SuggestedModule[] {
  const starts: SuggestedBoundary[] = [];
  for (const boundary of boundaries) {
    const start = Math.trunc(boundary.start);
    if (start < 1 || start > lessonIds.length) continue;
    if (starts.length > 0 && start <= starts[starts.length - 1].start) continue;
    starts.push({ title: boundary.title, start });
  }
  if (starts.length === 0) starts.push({ title: '', start: 1 });
  starts[0] = { ...starts[0], start: 1 };

  return starts.map((boundary, index) => ({
    title: boundary.title.trim() || `Módulo ${index + 1}`,
    lessonIds: lessonIds.slice(
      boundary.start - 1,
      (starts[index + 1]?.start ?? lessonIds.length + 1) - 1,
    ),
  }));
}

/** False when the course changed since the suggestion was made (stale). */
export function suggestionCoversCourse(
  modules: readonly SuggestedModule[],
  courseLessonIds: readonly string[],
): boolean {
  const suggested = modules.flatMap((module) => module.lessonIds);
  const course = new Set(courseLessonIds);
  return (
    suggested.length === course.size &&
    new Set(suggested).size === suggested.length &&
    suggested.every((id) => course.has(id))
  );
}

const LESSON_NUMBER_RE = /(?:^|\s|-)aula\s*(\d+)/i;

function lessonNumber(title: string): number | null {
  const match = LESSON_NUMBER_RE.exec(title);
  return match ? Number.parseInt(match[1], 10) : null;
}

/**
 * Where each material of a removed module goes: the new module holding the
 * lesson with the same "Aula NN" number, or the course itself (`null`).
 */
export function planDocumentTargets(
  modules: readonly { lessons: readonly { title: string }[] }[],
  documents: readonly { documentId: string; title: string }[],
): Array<{ documentId: string; moduleIndex: number | null }> {
  const moduleByLesson = new Map<number, number>();
  modules.forEach((module, index) => {
    for (const lesson of module.lessons) {
      const number = lessonNumber(lesson.title);
      if (number !== null && !moduleByLesson.has(number)) moduleByLesson.set(number, index);
    }
  });
  return documents.map(({ documentId, title }) => {
    const number = lessonNumber(title);
    return {
      documentId,
      moduleIndex: number === null ? null : (moduleByLesson.get(number) ?? null),
    };
  });
}
