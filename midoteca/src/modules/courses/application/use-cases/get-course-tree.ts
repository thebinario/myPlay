import { NotFoundError } from '../../../../core/errors';
import type { CourseTree } from '../../domain/ports';
import type { CourseOrganizationDependencies } from '../dto';

/** Returns the fully materialized course tree, or throws when missing. */
export class GetCourseTree {
  constructor(private readonly deps: CourseOrganizationDependencies) {}

  async execute(courseId: string): Promise<CourseTree> {
    const tree = await this.deps.courses.getTree(courseId);
    if (!tree) throw new NotFoundError(`Course ${courseId} not found`);
    return tree;
  }
}
