import type { Course } from '../../domain/entities';
import type { CourseOrganizationDependencies } from '../dto';

/** Renames a course. Persisted as a manual edit (never overwritten by scans). */
export class RenameCourse {
  constructor(private readonly deps: CourseOrganizationDependencies) {}

  execute(courseId: string, title: string): Promise<Course> {
    return this.deps.courses.update({ id: courseId, title });
  }
}
