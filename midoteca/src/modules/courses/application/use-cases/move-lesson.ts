import type { LessonMoveResult } from '../../domain/ports';
import type { CourseOrganizationDependencies } from '../dto';

/** Moves a lesson to another module of the same course, atomically. */
export class MoveLesson {
  constructor(private readonly deps: CourseOrganizationDependencies) {}

  execute(
    lessonId: string,
    targetModuleId: string,
    targetIndex?: number,
  ): Promise<LessonMoveResult> {
    return this.deps.courses.moveLessonToModule({ lessonId, targetModuleId, targetIndex });
  }
}
