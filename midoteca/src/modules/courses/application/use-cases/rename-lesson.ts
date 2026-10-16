import type { Lesson } from '../../domain/entities';
import type { CourseOrganizationDependencies } from '../dto';

/** Renames a lesson. Persisted as a manual edit. */
export class RenameLesson {
  constructor(private readonly deps: CourseOrganizationDependencies) {}

  execute(lessonId: string, title: string): Promise<Lesson> {
    return this.deps.courses.updateLesson({ id: lessonId, title });
  }
}
