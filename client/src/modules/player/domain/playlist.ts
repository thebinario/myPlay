import type { Course, Lesson } from '@/core/domain/library';

const LOADING_LABELS = [
  'Carregando aula...',
  'Preparando reprodução...',
  'Sincronizando legendas...',
];

/** Lista achatada das aulas de um curso, na ordem de exibição. */
export function lessonsOf(course: Course): Lesson[] {
  return course.modules.flatMap((mod) => mod.lessons);
}

export function nextLessonIndex(index: number, totalLessons: number): number {
  return index < totalLessons - 1 ? index + 1 : index;
}

export function previousLessonIndex(index: number): number {
  return index > 0 ? index - 1 : index;
}

/** Rótulo rotativo de carregamento conforme a posição da aula. */
export function loadingLabelFor(lessonIndex: number): string {
  return LOADING_LABELS[lessonIndex % LOADING_LABELS.length];
}
