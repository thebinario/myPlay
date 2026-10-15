import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SearchFilter, SearchResult, SearchResultKind } from '@/core/domain/library';
import { useLibraryRepository } from '@/features/library/presentation/LibraryProvider';

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

const RESULT_ORDER: SearchResultKind[] = ['course', 'lesson', 'movie', 'document'];

/** Encapsula estado, busca, agrupamento e navegação da Pesquisa Universal. */
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

  const grouped = useMemo(
    () =>
      RESULT_ORDER.flatMap((kind) => {
        const items = results.filter((r) => r.kind === kind);
        return items.length ? ([[kind, items]] as [SearchResultKind, SearchResult[]][]) : [];
      }),
    [results],
  );

  const { onOpenCourse, onOpenLesson, onOpenMovie, onOpenDocument } = handlers;
  const handleResultClick = useCallback(
    (result: SearchResult) => {
      switch (result.kind) {
        case 'course':
          onOpenCourse(result.itemId);
          break;
        case 'lesson':
          if (result.courseId && result.lessonId) onOpenLesson(result.courseId, result.lessonId);
          break;
        case 'movie':
          onOpenMovie(result.itemId);
          break;
        case 'document':
          onOpenDocument(result.itemId);
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
