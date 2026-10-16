import type { CourseModule } from '../../domain/entities';
import type { CourseOrganizationDependencies } from '../dto';

/** Renames a module. Persisted as a manual edit. */
export class RenameModule {
  constructor(private readonly deps: CourseOrganizationDependencies) {}

  execute(moduleId: string, title: string): Promise<CourseModule> {
    return this.deps.courses.updateModule({ id: moduleId, title });
  }
}
