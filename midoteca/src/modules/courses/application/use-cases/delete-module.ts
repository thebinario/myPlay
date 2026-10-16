import type { CourseOrganizationDependencies } from '../dto';

/** Removes a module (catalog only); its lessons cascade. Files are untouched. */
export class DeleteModule {
  constructor(private readonly deps: CourseOrganizationDependencies) {}

  execute(moduleId: string): Promise<void> {
    return this.deps.courses.deleteModule(moduleId);
  }
}
