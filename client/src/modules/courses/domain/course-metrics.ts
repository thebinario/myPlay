import type { Course } from '@/core/domain/library';

/** Recalcula duração total e progresso a partir das aulas (regra de domínio). */
export function recalculateCourseMetrics(course: Course): Course {
  let totalSeconds = 0;
  let totalLessons = 0;
  let completedLessons = 0;

  course.modules.forEach((mod) => {
    mod.lessons.forEach((lesson) => {
      totalSeconds += lesson.duration || 0;
      totalLessons += 1;
      if (lesson.completed) completedLessons += 1;
    });
  });

  return {
    ...course,
    totalDuration: totalSeconds,
    progress: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
  };
}
