import type { Course, CourseModule } from '@/core/domain/library';

/**
 * Coleção: agrupamento de cursos de uma fonte (ex.: "Coleção 01 - Tecnologia").
 *
 * Faz parte da hierarquia canônica descrita em `docs/HIERARCHY.md`:
 * `Fonte → Coleção → Curso → Seção → Módulo → Aula/Conteúdo`.
 */
export interface Collection {
  id: string;
  sourceId?: string | null;
  type: 'collection';
  title: string;
  description?: string;
  coverUrl?: string;
  tags: string[];
  createdAt: string;
  /** Read model agregado (fornecido pelo núcleo, não recalculado na UI). */
  courseCount: number;
  totalDuration: number;
  progress: number;
  courses: Course[];
}

/** Projeta os módulos de um curso, preferindo as seções quando existirem. */
export function courseModules(course: Course): CourseModule[] {
  return course.sections ? course.sections.flatMap((section) => section.modules) : course.modules;
}

/** Total de aulas (vídeos) de um curso. */
export function countCourseLessons(course: Course): number {
  return courseModules(course).reduce((total, module) => total + module.lessons.length, 0);
}

/** Total de documentos (PDFs) de um curso, incluindo os de nível de módulo. */
export function countCourseDocuments(course: Course): number {
  const courseLevel = course.documents?.length ?? 0;
  const moduleLevel = courseModules(course).reduce(
    (total, module) => total + (module.documents?.length ?? 0),
    0,
  );
  return courseLevel + moduleLevel;
}

/** Soma a duração das aulas de um curso, em segundos. */
export function courseTotalDuration(course: Course): number {
  return courseModules(course).reduce(
    (total, module) => total + module.lessons.reduce((sum, lesson) => sum + lesson.duration, 0),
    0,
  );
}

/** Progresso do curso (0–100) derivado das aulas concluídas. */
export function courseProgress(course: Course): number {
  const lessons = courseModules(course).flatMap((module) => module.lessons);
  if (lessons.length === 0) return 0;
  const completed = lessons.filter((lesson) => lesson.completed).length;
  return Math.round((completed / lessons.length) * 100);
}

/** Duração total da coleção, somando a de seus cursos. */
export function collectionTotalDuration(collection: Collection): number {
  return collection.courses.reduce((total, course) => total + courseTotalDuration(course), 0);
}

/** Progresso da coleção (0–100), ponderado pelo total de aulas. */
export function collectionProgress(collection: Collection): number {
  const lessons = collection.courses.flatMap((course) =>
    courseModules(course).flatMap((module) => module.lessons),
  );
  if (lessons.length === 0) return 0;
  const completed = lessons.filter((lesson) => lesson.completed).length;
  return Math.round((completed / lessons.length) * 100);
}
