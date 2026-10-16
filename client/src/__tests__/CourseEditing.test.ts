import { describe, it, expect } from 'vitest';
import type { Course } from '@/core/domain/library';
import {
  moveLesson,
  renameCourse,
  renameLesson,
  renameModule,
  reorderModules,
} from '@/modules/courses/domain/course-editing';
import { recalculateCourseMetrics } from '@/modules/courses/domain/course-metrics';

function makeCourse(): Course {
  return {
    id: 'c1',
    type: 'course',
    title: 'Curso',
    description: '',
    category: '',
    coverUrl: '',
    totalDuration: 0,
    progress: 0,
    tags: [],
    createdAt: '2024-01-01',
    modules: [
      {
        id: 'm1',
        courseId: 'c1',
        title: 'Módulo 1',
        order: 1,
        lessons: [
          {
            id: 'l1',
            moduleId: 'm1',
            title: 'Aula 1',
            duration: 100,
            completed: true,
            videoUrl: 'a.mp4',
            order: 1,
            materials: [],
          },
          {
            id: 'l2',
            moduleId: 'm1',
            title: 'Aula 2',
            duration: 50,
            completed: false,
            videoUrl: 'b.mp4',
            order: 2,
            materials: [],
          },
        ],
      },
      {
        id: 'm2',
        courseId: 'c1',
        title: 'Módulo 2',
        order: 2,
        lessons: [
          {
            id: 'l3',
            moduleId: 'm2',
            title: 'Aula 3',
            duration: 200,
            completed: false,
            videoUrl: 'c.mp4',
            order: 1,
            materials: [],
          },
        ],
      },
    ],
  };
}

describe('course-editing — regras de edição do curso', () => {
  it('renomeia o curso sem mutar o original', () => {
    const course = makeCourse();
    const next = renameCourse(course, 'Novo título');
    expect(next.title).toBe('Novo título');
    expect(course.title).toBe('Curso');
  });

  it('renomeia um módulo pelo id', () => {
    const next = renameModule(makeCourse(), 'm2', 'Módulo Dois');
    expect(next.modules.find((m) => m.id === 'm2')?.title).toBe('Módulo Dois');
    expect(next.modules.find((m) => m.id === 'm1')?.title).toBe('Módulo 1');
  });

  it('renomeia uma aula pelo id dentro do módulo', () => {
    const next = renameLesson(makeCourse(), 'm1', 'l2', 'Aula Dois');
    const lesson = next.modules.find((m) => m.id === 'm1')?.lessons.find((l) => l.id === 'l2');
    expect(lesson?.title).toBe('Aula Dois');
  });

  it('reordena módulos e reindexa a ordem sequencial', () => {
    const next = reorderModules(makeCourse(), 0, 1);
    expect(next.modules.map((m) => m.id)).toEqual(['m2', 'm1']);
    expect(next.modules.map((m) => m.order)).toEqual([1, 2]);
  });

  it('ignora reordenação para índice fora do intervalo', () => {
    const course = makeCourse();
    expect(reorderModules(course, 0, 5)).toBe(course);
    expect(reorderModules(course, 0, -1)).toBe(course);
  });

  it('move uma aula para o final de outro módulo', () => {
    const next = moveLesson(makeCourse(), 'm1', 'l1', 'm2');
    const source = next.modules.find((m) => m.id === 'm1');
    const target = next.modules.find((m) => m.id === 'm2');
    expect(source?.lessons.map((l) => l.id)).toEqual(['l2']);
    expect(target?.lessons.map((l) => l.id)).toEqual(['l3', 'l1']);
    expect(target?.lessons.at(-1)?.moduleId).toBe('m2');
  });

  it('ignora mover para o mesmo módulo', () => {
    const course = makeCourse();
    expect(moveLesson(course, 'm1', 'l1', 'm1')).toBe(course);
  });
});

describe('course-metrics — métricas derivadas', () => {
  it('soma a duração das aulas e calcula o progresso', () => {
    const next = recalculateCourseMetrics(makeCourse());
    expect(next.totalDuration).toBe(350);
    expect(next.progress).toBe(33);
  });

  it('retorna progresso zero quando não há aulas', () => {
    const course = { ...makeCourse(), modules: [] } as Course;
    expect(recalculateCourseMetrics(course).progress).toBe(0);
  });
});
