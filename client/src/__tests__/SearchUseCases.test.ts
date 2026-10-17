import { describe, it, expect } from 'vitest';
import type { SearchResult } from '@/core/domain/library';
import { groupSearchResults } from '@/modules/search/application/use-cases/group-search-results';
import { resolveSearchTarget } from '@/modules/search/application/use-cases/resolve-search-target';

function result(
  partial: Partial<SearchResult> & Pick<SearchResult, 'kind' | 'itemId'>,
): SearchResult {
  return {
    title: 'Item',
    context: 'Contexto',
    available: true,
    ...partial,
  };
}

describe('groupSearchResults', () => {
  it('agrupa por tipo na ordem canônica', () => {
    const grouped = groupSearchResults([
      result({ kind: 'movie', itemId: 'mv1' }),
      result({ kind: 'course', itemId: 'c1' }),
      result({ kind: 'document', itemId: 'd1' }),
      result({ kind: 'course', itemId: 'c2' }),
    ]);
    expect(grouped.map(([kind]) => kind)).toEqual(['course', 'movie', 'document']);
    expect(grouped[0][1].map((r) => r.itemId)).toEqual(['c1', 'c2']);
  });

  it('omite grupos vazios', () => {
    const grouped = groupSearchResults([result({ kind: 'lesson', itemId: 'l1', courseId: 'c1' })]);
    expect(grouped).toHaveLength(1);
    expect(grouped[0][0]).toBe('lesson');
  });

  it('retorna lista vazia sem resultados', () => {
    expect(groupSearchResults([])).toEqual([]);
  });
});

describe('resolveSearchTarget', () => {
  it('resolve curso, filme e documento para o respectivo id', () => {
    expect(resolveSearchTarget(result({ kind: 'course', itemId: 'c1' }))).toEqual({
      type: 'course',
      courseId: 'c1',
    });
    expect(resolveSearchTarget(result({ kind: 'movie', itemId: 'm1' }))).toEqual({
      type: 'movie',
      movieId: 'm1',
    });
    expect(resolveSearchTarget(result({ kind: 'document', itemId: 'd1' }))).toEqual({
      type: 'document',
      documentId: 'd1',
    });
  });

  it('resolve aula com curso e aula', () => {
    expect(
      resolveSearchTarget(result({ kind: 'lesson', itemId: 'l1', courseId: 'c1', lessonId: 'l1' })),
    ).toEqual({ type: 'lesson', courseId: 'c1', lessonId: 'l1' });
  });

  it('retorna null para aula sem curso/lesson id', () => {
    expect(resolveSearchTarget(result({ kind: 'lesson', itemId: 'l1' }))).toBeNull();
  });
});
