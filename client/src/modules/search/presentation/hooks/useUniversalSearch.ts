import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SearchFilter, SearchResult, SearchResultKind } from '@/core/domain/library';
import { useLibraryRepository } from '@/modules/library/presentation/LibraryProvider';
import { groupSearchResults } from '@/modules/search/application/use-cases/group-search-results';
import { resolveSearchTarget } from '@/modules/search/application/use-cases/resolve-search-target';

export interface UniversalSearchHandlers {
  onOpenCourse: (courseId: string) => void;
  onOpenLesson: (courseId: string, lessonId: string) => void;
  onOpenMovie: (movieId: string) => void;
  onOpenDocument: (docId: string) => void;
}

export interface UniversalSearchState {
  query: string;
  filter: SearchFilter;
  inputRef: React.RefObject<HTMLInputElement | null>;
  isEmpty: boolean;
  hasResults: boolean;
  grouped: [SearchResultKind, SearchResult[]][];
  setQuery: (value: string) => void;
  setFilter: (filter: SearchFilter) => void;
  clearQuery: () => void;
  handleResultClick: (result: SearchResult) => void;
}

/**
 * Hook de apresentação da Pesquisa Universal: estado de UI (query, filtro,
 * foco/atalho ⌘K) e navegação. O agrupamento e o roteamento dos resultados são
 * regras da camada de aplicação.
 */
export function useUniversalSearch(
  handlers: UniversalSearchHandlers,
  initialQuery = '',
): UniversalSearchState {
  const repository = useLibraryRepository();
  const [query, setQuery] = useState(initialQuery);
  const [filter, setFilter] = useState<SearchFilter>('all');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const results = useMemo(
    () => (query.trim() ? repository.search(query.trim(), filter) : []),
    [repository, query, filter],
  );

  const grouped = useMemo(() => groupSearchResults(results), [results]);

  const { onOpenCourse, onOpenLesson, onOpenMovie, onOpenDocument } = handlers;
  const handleResultClick = useCallback(
    (result: SearchResult) => {
      const target = resolveSearchTarget(result);
      if (!target) return;
      switch (target.type) {
        case 'course':
          onOpenCourse(target.courseId);
          break;
        case 'lesson':
          onOpenLesson(target.courseId, target.lessonId);
          break;
        case 'movie':
          onOpenMovie(target.movieId);
          break;
        case 'document':
          onOpenDocument(target.documentId);
          break;
      }
    },
    [onOpenCourse, onOpenLesson, onOpenMovie, onOpenDocument],
  );

  return {
    query,
    filter,
    inputRef,
    isEmpty: query.trim() === '',
    hasResults: results.length > 0,
    grouped,
    setQuery,
    setFilter,
    clearQuery: useCallback(() => setQuery(''), []),
    handleResultClick,
  };
}
