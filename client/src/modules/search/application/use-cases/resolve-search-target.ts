import type { SearchResult } from '@/core/domain/library';

/** Destino de navegação resolvido a partir de um resultado de busca. */
export type SearchTarget =
  | { type: 'course'; courseId: string }
  | { type: 'lesson'; courseId: string; lessonId: string }
  | { type: 'movie'; movieId: string }
  | { type: 'document'; documentId: string };

/**
 * Traduz um resultado tipado em um destino de navegação. Retorna `null` quando
 * faltam dados essenciais (ex.: aula sem curso/lesson id).
 */
export function resolveSearchTarget(result: SearchResult): SearchTarget | null {
  switch (result.kind) {
    case 'course':
      return { type: 'course', courseId: result.itemId };
    case 'lesson':
      return result.courseId && result.lessonId
        ? { type: 'lesson', courseId: result.courseId, lessonId: result.lessonId }
        : null;
    case 'movie':
      return { type: 'movie', movieId: result.itemId };
    case 'document':
      return { type: 'document', documentId: result.itemId };
  }
}
