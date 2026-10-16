import type { Course } from '@/core/domain/library';

/**
 * Regras puras de edição da estrutura de um curso (títulos, reordenação e
 * movimentação de aulas). Não dependem de React nem de repositório: recebem um
 * `Course` e devolvem um novo `Course` imutável.
 */

export function renameCourse(course: Course, title: string): Course {
  return { ...course, title };
}

export function renameModule(course: Course, moduleId: string, title: string): Course {
  return {
    ...course,
    modules: course.modules.map((mod) => (mod.id === moduleId ? { ...mod, title } : mod)),
  };
}

export function renameLesson(
  course: Course,
  moduleId: string,
  lessonId: string,
  title: string,
): Course {
  return {
    ...course,
    modules: course.modules.map((mod) =>
      mod.id !== moduleId
        ? mod
        : {
            ...mod,
            lessons: mod.lessons.map((les) => (les.id === lessonId ? { ...les, title } : les)),
          },
    ),
  };
}

/** Move um módulo para outra posição e reindexa a ordem sequencial. */
export function reorderModules(course: Course, fromIndex: number, toIndex: number): Course {
  if (toIndex < 0 || toIndex >= course.modules.length) return course;
  const reordered = [...course.modules];
  const [moved] = reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, moved);
  return { ...course, modules: reordered.map((mod, idx) => ({ ...mod, order: idx + 1 })) };
}

/** Move uma aula de um módulo para o final de outro módulo. */
export function moveLesson(
  course: Course,
  sourceModuleId: string,
  lessonId: string,
  targetModuleId: string,
): Course {
  if (sourceModuleId === targetModuleId) return course;

  const source = course.modules.find((mod) => mod.id === sourceModuleId);
  const lesson = source?.lessons.find((les) => les.id === lessonId);
  if (!lesson) return course;

  const moved = { ...lesson, moduleId: targetModuleId };
  return {
    ...course,
    modules: course.modules.map((mod) => {
      if (mod.id === sourceModuleId) {
        return { ...mod, lessons: mod.lessons.filter((les) => les.id !== lessonId) };
      }
      if (mod.id === targetModuleId) {
        return { ...mod, lessons: [...mod.lessons, moved] };
      }
      return mod;
    }),
  };
}
