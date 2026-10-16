import type { SaveCourseOrganization as SaveCourseOrganizationInput } from '../../domain/inputs';
import type { CourseTree } from '../../domain/ports';
import type { CourseOrganizationDependencies } from '../dto';

/**
 * Persists an entire organization snapshot (module order, module titles, lesson
 * order and cross-module moves) in one transaction. This is what the editor's
 * "Salvar" maps to.
 */
export class SaveOrganization {
  constructor(private readonly deps: CourseOrganizationDependencies) {}

  execute(input: SaveCourseOrganizationInput): Promise<CourseTree> {
    return this.deps.courses.saveOrganization(input);
  }
}
