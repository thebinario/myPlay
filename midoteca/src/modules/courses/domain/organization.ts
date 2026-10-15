import { NotFoundError, ValidationError } from '../../../core/errors';
import type { Lesson } from './entities';

/**
 * Pure ordering rules for course organization. Everything here is
 * filesystem-free and side-effect-free, so it is trivially testable and shared
 * by the application service and the SQLite adapter alike.
 *
 * Invariants enforced:
 * - A reorder must reference exactly the current items, with no unknown or
 *   duplicated ids.
 * - Ids never change when items are reordered (progress stays attached).
 * - A lesson can never be duplicated across modules.
 */

interface Ordered {
  id: string;
  sortOrder: number;
}

/** Returns `items` re-indexed to match `orderedIds`, with `sortOrder` = index. */
export function normalizeReorder<T extends Ordered>(
  items: readonly T[],
  orderedIds: readonly string[],
  label: string,
): T[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  if (orderedIds.length !== items.length) {
    throw new ValidationError(
      `${label} reorder must include exactly the ${items.length} current item(s)`,
    );
  }
  const seen = new Set<string>();
  for (const id of orderedIds) {
    if (!byId.has(id)) {
      throw new ValidationError(`${label} reorder references unknown id "${id}"`);
    }
    if (seen.has(id)) {
      throw new ValidationError(`${label} reorder contains duplicate id "${id}"`);
    }
    seen.add(id);
  }
  return orderedIds.map((id, index) => ({ ...(byId.get(id) as T), sortOrder: index }));
}

export interface LessonMovePlan {
  /** Ordered lesson ids remaining in the source module (moved lesson removed). */
  sourceRemaining: string[];
  /** Ordered lesson ids for the target module (moved lesson inserted). */
  targetOrder: string[];
}

/**
 * Computes the new lesson order for a cross-module move without mutating input.
 * Rejects moving a lesson that is not in the source or that already exists in
 * the target (which would duplicate it).
 */
export function planLessonMove(
  sourceLessons: readonly Lesson[],
  targetLessons: readonly Lesson[],
  lessonId: string,
  targetIndex?: number,
): LessonMovePlan {
  if (!sourceLessons.some((lesson) => lesson.id === lessonId)) {
    throw new NotFoundError(`Lesson "${lessonId}" is not part of the source module`);
  }
  if (targetLessons.some((lesson) => lesson.id === lessonId)) {
    throw new ValidationError(`Lesson "${lessonId}" already exists in the target module`);
  }

  const sourceRemaining = sourceLessons.filter((lesson) => lesson.id !== lessonId).map((l) => l.id);
  const targetOrder = targetLessons.map((lesson) => lesson.id);

  const index =
    targetIndex === undefined
      ? targetOrder.length
      : Math.min(Math.max(targetIndex, 0), targetOrder.length);
  targetOrder.splice(index, 0, lessonId);

  return { sourceRemaining, targetOrder };
}

/**
 * Validates that a whole-course organization snapshot covers every lesson of
 * the course exactly once (no duplicates, no orphans, no unknowns) and that
 * every module id belongs to the course.
 */
export function assertOrganizationCoversCourse(
  courseModuleIds: readonly string[],
  courseLessonIds: readonly string[],
  modules: readonly { id: string; lessonIds: readonly string[] }[],
): void {
  const moduleSet = new Set(courseModuleIds);
  const lessonSet = new Set(courseLessonIds);

  const seenModules = new Set<string>();
  for (const module of modules) {
    if (!moduleSet.has(module.id)) {
      throw new ValidationError(`Organization references unknown module "${module.id}"`);
    }
    if (seenModules.has(module.id)) {
      throw new ValidationError(`Organization contains duplicate module "${module.id}"`);
    }
    seenModules.add(module.id);
  }
  if (modules.length !== courseModuleIds.length) {
    throw new ValidationError('Organization must include exactly the course modules');
  }

  const seenLessons = new Set<string>();
  for (const module of modules) {
    for (const lessonId of module.lessonIds) {
      if (!lessonSet.has(lessonId)) {
        throw new ValidationError(`Organization references unknown lesson "${lessonId}"`);
      }
      if (seenLessons.has(lessonId)) {
        throw new ValidationError(`Organization contains duplicate lesson "${lessonId}"`);
      }
      seenLessons.add(lessonId);
    }
  }
  if (seenLessons.size !== courseLessonIds.length) {
    throw new ValidationError('Organization must cover every lesson of the course');
  }
}
