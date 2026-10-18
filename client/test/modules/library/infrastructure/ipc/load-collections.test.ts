/**
 * `buildCollections` — agrupa os cursos materializados do catálogo nas coleções
 * fornecidas pelo read model do núcleo, sem recalcular no restante da UI.
 */
import { describe, it, expect } from 'vitest';
import type { CollectionSummary } from '@midoteca/core';
import type { Course } from '@/core/domain/library';
import { buildCollections } from '@/modules/library/infrastructure/ipc/load-collections';

function course(overrides: Partial<Course> & { id: string }): Course {
  return {
    type: 'course',
    title: overrides.id,
    description: '',
    category: '',
    coverUrl: '',
    totalDuration: 0,
    progress: 0,
    tags: [],
    createdAt: '2026-01-01T00:00:00Z',
    modules: [],
    ...overrides,
  };
}

function summary(overrides: Partial<CollectionSummary> & { id: string }): CollectionSummary {
  return {
    title: overrides.id,
    sourceId: 'src-1',
    relativePath: overrides.id,
    titleSource: 'detected',
    courseCount: 0,
    updatedAt: '2026-01-02T00:00:00Z',
    ...overrides,
  };
}

describe('buildCollections', () => {
  it('agrupa cursos por collectionId e agrega duração e progresso', () => {
    const courses: Course[] = [
      course({
        id: 'c1',
        collectionId: 'col-1',
        modules: [
          {
            id: 'm1',
            courseId: 'c1',
            title: 'M1',
            order: 1,
            lessons: [
              {
                id: 'l1',
                moduleId: 'm1',
                title: 'L1',
                duration: 100,
                completed: true,
                videoUrl: '',
                order: 1,
                materials: [],
              },
              {
                id: 'l2',
                moduleId: 'm1',
                title: 'L2',
                duration: 200,
                completed: false,
                videoUrl: '',
                order: 2,
                materials: [],
              },
            ],
          },
        ],
      }),
      course({ id: 'c2', collectionId: 'col-1' }),
      course({ id: 'loose', collectionId: null }),
    ];

    const result = buildCollections(courses, [
      summary({ id: 'col-1', courseCount: 2 }),
      summary({ id: 'col-empty', courseCount: 5 }),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('col-1');
    expect(result[0].courses.map((c) => c.id)).toEqual(['c1', 'c2']);
    expect(result[0].totalDuration).toBe(300);
    expect(result[0].progress).toBe(50);
    expect(result[0].courseCount).toBe(2);
  });

  it('descarta coleções sem cursos materializados', () => {
    expect(buildCollections([], [summary({ id: 'col-1' })])).toEqual([]);
  });
});
