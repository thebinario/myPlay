import React from 'react';
import { useUniversalSearch } from '@/modules/search/presentation/hooks/useUniversalSearch';
import { SearchInput } from '@/modules/search/presentation/SearchInput';
import { SearchFilterTabs } from '@/modules/search/presentation/SearchFilterTabs';
import { SearchResults } from '@/modules/search/presentation/SearchResults';

interface SearchViewProps {
  onOpenCourse: (courseId: string) => void;
  onOpenLesson: (courseId: string, lessonId: string) => void;
  onOpenMovie: (movieId: string) => void;
  onOpenDocument: (docId: string) => void;
  initialQuery?: string;
}

export const SearchView: React.FC<SearchViewProps> = ({
  onOpenCourse,
  onOpenLesson,
  onOpenMovie,
  onOpenDocument,
  initialQuery = '',
}) => {
  const search = useUniversalSearch(
    { onOpenCourse, onOpenLesson, onOpenMovie, onOpenDocument },
    initialQuery,
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#0D111B',
        padding: '32px 40px',
        maxWidth: '900px',
        margin: '0 auto',
        width: '100%',
      }}
    >
      <div style={{ marginBottom: '28px' }}>
        <h1
          style={{
            fontSize: '26px',
            fontWeight: 700,
            color: '#FFFFFF',
            marginBottom: '6px',
            letterSpacing: '-0.4px',
          }}
        >
          Pesquisa Universal
        </h1>
        <p style={{ color: '#64748B', fontSize: '13px' }}>
          Busque cursos, aulas, filmes e documentos.{' '}
          <kbd
            style={{
              backgroundColor: '#1A2234',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '4px',
              padding: '1px 6px',
              fontSize: '11px',
              color: '#94A3B8',
            }}
          >
            ⌘K
          </kbd>
        </p>
      </div>

      <SearchInput
        value={search.query}
        onChange={search.setQuery}
        onClear={search.clearQuery}
        inputRef={search.inputRef}
      />

      <SearchFilterTabs filter={search.filter} onChange={search.setFilter} />

      <SearchResults
        isEmpty={search.isEmpty}
        hasResults={search.hasResults}
        grouped={search.grouped}
        onSelect={search.handleResultClick}
      />
    </div>
  );
};
