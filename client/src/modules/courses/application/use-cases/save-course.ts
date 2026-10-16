import type { Course } from '@/core/domain/library';
import type { LibraryCatalogRepository } from '@/core/ports/libraryRepository';
import { recalculateCourseMetrics } from '@/modules/courses/domain/course-metrics';

export interface SaveCourseDependencies {
  courses: LibraryCatalogRepository;
}

/**
 * Caso de uso: persiste a organização editada de um curso, normalizando antes
 * as métricas derivadas (duração total e progresso) para não depender do
 * adaptador de persistência.
 */
export async function saveCourse(
  { courses }: SaveCourseDependencies,
  course: Course,
): Promise<Course> {
  return courses.saveCourse(recalculateCourseMetrics(course));
}
