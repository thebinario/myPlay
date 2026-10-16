import type { Lesson } from '../../domain/entities';
import type { CourseOrganizationDependencies } from '../dto';

/** Reorders the lessons of a module atomically. */
export class ReorderLessons {
  constructor(private readonly deps: CourseOrganizationDependencies) {}

  execute(moduleId: string, orderedIds: readonly string[]): Promise<Lesson[]> {
    return this.deps.courses.reorderLessons(moduleId, orderedIds);
  }
}
