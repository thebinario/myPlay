import type { SearchResult, SearchResultKind } from '@/core/domain/library';

/** Ordem de exibição dos grupos na Pesquisa Universal. */
export const SEARCH_RESULT_ORDER: readonly SearchResultKind[] = [
  'course',
  'lesson',
  'movie',
  'document',
];

/**
 * Agrupa os resultados por tipo, seguindo a ordem canônica e omitindo grupos
 * vazios. Regra de apresentação/leitura compartilhada pela tela de busca.
 */
export function groupSearchResults(
  results: SearchResult[],
  order: readonly SearchResultKind[] = SEARCH_RESULT_ORDER,
): [SearchResultKind, SearchResult[]][] {
  return order.flatMap((kind) => {
    const items = results.filter((result) => result.kind === kind);
    return items.length ? ([[kind, items]] as [SearchResultKind, SearchResult[]][]) : [];
  });
}
