import type { CourseModule } from '../../domain/entities';
import type { CourseOrganizationDependencies } from '../dto';

/** Creates an empty module at the end of the course. */
export class CreateModule {
  constructor(private readonly deps: CourseOrganizationDependencies) {}

  execute(courseId: string, title: string): Promise<CourseModule> {
    return this.deps.courses.createModule({
      courseId,
      title,
      titleSource: 'manual',
      sortSource: 'manual',
    });
  }
}
