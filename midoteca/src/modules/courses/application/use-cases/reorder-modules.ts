import type { CourseModule } from '../../domain/entities';
import type { CourseOrganizationDependencies } from '../dto';

/** Reorders the course modules atomically. */
export class ReorderModules {
  constructor(private readonly deps: CourseOrganizationDependencies) {}

  execute(courseId: string, orderedIds: readonly string[]): Promise<CourseModule[]> {
    return this.deps.courses.reorderModules(courseId, orderedIds);
  }
}
