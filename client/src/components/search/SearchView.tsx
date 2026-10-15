import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Search,
  X,
  BookOpen,
  GraduationCap,
  Film,
  FileText,
  Play,
  ChevronRight,
  Layers,
  WifiOff,
} from 'lucide-react';
import { SearchResult, SearchFilter, SearchResultKind } from '../../types/library';
import { mockLibraryService } from '../../services/mockData';

// ─── Props ────────────────────────────────────────────────────────────────────
interface SearchViewProps {
  onOpenCourse: (courseId: string) => void;
  onOpenLesson: (courseId: string, lessonId: string) => void;
  onOpenMovie: (movieId: string) => void;
  onOpenDocument: (docId: string) => void;
  initialQuery?: string;
}

// ─── Filter config ────────────────────────────────────────────────────────────
const FILTER_TABS: { id: SearchFilter; label: string; icon: React.ReactNode }[] = [
  { id: 'all', label: 'Todos', icon: <Layers size={13} /> },
  { id: 'course', label: 'Cursos', icon: <GraduationCap size={13} /> },
  { id: 'lesson', label: 'Aulas', icon: <Play size={13} /> },
  { id: 'movie', label: 'Filmes', icon: <Film size={13} /> },
  { id: 'document', label: 'PDFs', icon: <FileText size={13} /> },
];

const KIND_COLORS: Record<SearchResultKind, string> = {
  course: '#A594FF',
  lesson: '#60A5FA',
  movie: '#10B981',
  document: '#F59E0B',
};

const KIND_LABELS: Record<SearchResultKind, string> = {
  course: 'CURSO',
  lesson: 'AULA',
  movie: 'FILME',
  document: 'PDF',
};

const KIND_ICONS: Record<SearchResultKind, React.ReactNode> = {
  course: <GraduationCap size={15} />,
  lesson: <Play size={15} />,
  movie: <Film size={15} />,
  document: <FileText size={15} />,
};

// ─── Component ────────────────────────────────────────────────────────────────
export const SearchView: React.FC<SearchViewProps> = ({
  onOpenCourse,
  onOpenLesson,
  onOpenMovie,
  onOpenDocument,
  initialQuery = '',
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [filter, setFilter] = useState<SearchFilter>('all');
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus ao montar
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, []);

  // Atalho global Ctrl+K / Cmd+K
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
    () => (query.trim() ? mockLibraryService.search(query.trim(), filter) : []),
    [query, filter],
  );

  const grouped = useMemo(() => {
    const map: Partial<Record<SearchResultKind, SearchResult[]>> = {};
    for (const r of results) {
      if (!map[r.kind]) map[r.kind] = [];
      map[r.kind]!.push(r);
    }
    return map;
  }, [results]);

  const handleResultClick = useCallback(
    (result: SearchResult) => {
      switch (result.kind) {
        case 'course':
          onOpenCourse(result.itemId);
          break;
        case 'lesson':
          if (result.courseId && result.lessonId)
            onOpenLesson(result.courseId, result.lessonId);
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

  const isEmpty = query.trim() === '';
  const hasResults = results.length > 0;

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
      {/* Header */}
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

      {/* Search Input */}
      <div
        style={{
          position: 'relative',
          marginBottom: '20px',
        }}
      >
        <Search
          size={18}
          color="#64748B"
          style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }}
        />
        <input
          ref={inputRef}
          role="searchbox"
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar cursos, aulas, filmes, PDFs…"
          autoComplete="off"
          aria-label="Campo de pesquisa"
          style={{
            width: '100%',
            backgroundColor: '#131A27',
            border: '1.5px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '14px 48px 14px 48px',
            fontSize: '15px',
            color: '#F0F4FC',
            outline: 'none',
            transition: 'border-color 0.15s ease',
            boxSizing: 'border-box',
          }}
          onFocus={e => (e.currentTarget.style.borderColor = '#A594FF')}
          onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)')}
        />
        {query && (
          <button
            aria-label="Limpar pesquisa"
            onClick={() => setQuery('')}
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#64748B',
              display: 'flex',
              alignItems: 'center',
              padding: '4px',
              borderRadius: '6px',
            }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '24px',
          flexWrap: 'wrap',
        }}
      >
        {FILTER_TABS.map(tab => (
          <button
            key={tab.id}
            aria-label={tab.label}
            onClick={() => setFilter(tab.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 14px',
              borderRadius: '99px',
              border: '1.5px solid',
              borderColor: filter === tab.id ? '#A594FF' : 'rgba(255,255,255,0.08)',
              backgroundColor: filter === tab.id ? 'rgba(165, 148, 255, 0.12)' : 'transparent',
              color: filter === tab.id ? '#A594FF' : '#94A3B8',
              fontSize: '12px',
              fontWeight: filter === tab.id ? 600 : 500,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Results Area */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Empty state — no query */}
        {isEmpty && (
          <div
            data-testid="search-empty-state"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              paddingTop: '60px',
              gap: '12px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                backgroundColor: '#131A27',
                border: '1px solid rgba(165, 148, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '4px',
              }}
            >
              <Search size={28} color="#A594FF" strokeWidth={1.5} />
            </div>
            <p style={{ color: '#F0F4FC', fontSize: '16px', fontWeight: 600 }}>
              O que você quer encontrar?
            </p>
            <p style={{ color: '#64748B', fontSize: '13px', maxWidth: '340px', lineHeight: '1.6' }}>
              Digite o nome de um curso, aula, filme ou documento. A busca é instantânea.
            </p>
          </div>
        )}

        {/* No results */}
        {!isEmpty && !hasResults && (
          <div
            data-testid="search-no-results"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              paddingTop: '60px',
              gap: '12px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                backgroundColor: '#131A27',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '4px',
              }}
            >
              <BookOpen size={28} color="#475569" strokeWidth={1.5} />
            </div>
            <p style={{ color: '#E2E8F0', fontSize: '15px', fontWeight: 600 }}>
              Nenhum resultado encontrado
            </p>
            <p style={{ color: '#64748B', fontSize: '13px', maxWidth: '340px' }}>
              Tente palavras diferentes ou verifique a grafia.
            </p>
          </div>
        )}

        {/* Results grouped by kind */}
        {!isEmpty && hasResults && (
          <div data-testid="search-results" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {(Object.entries(grouped) as [SearchResultKind, SearchResult[]][]).map(
              ([kind, items]) => (
                <section key={kind}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '12px',
                    }}
                  >
                    <span style={{ color: KIND_COLORS[kind] }}>{KIND_ICONS[kind]}</span>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: KIND_COLORS[kind],
                        letterSpacing: '0.8px',
                        textTransform: 'uppercase',
                      }}
                    >
                      {KIND_LABELS[kind]}S
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        color: '#475569',
                        fontWeight: 500,
                      }}
                    >
                      {items.length} resultado{items.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {items.map(result => (
                      <ResultCard
                        key={`${result.kind}-${result.itemId}-${result.lessonId ?? ''}`}
                        result={result}
                        onClick={() => handleResultClick(result)}
                      />
                    ))}
                  </div>
                </section>
              ),
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── ResultCard ───────────────────────────────────────────────────────────────
interface ResultCardProps {
  result: SearchResult;
  onClick: () => void;
}

const ResultCard: React.FC<ResultCardProps> = ({ result, onClick }) => {
  const [hovered, setHovered] = useState(false);
  const color = KIND_COLORS[result.kind];

  return (
    <div
      data-testid={`result-${result.kind}-${result.itemId}`}
      onClick={onClick}
      onKeyDown={e => e.key === 'Enter' && onClick()}
      role="button"
      tabIndex={0}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        backgroundColor: hovered ? '#131A27' : 'rgba(255, 255, 255, 0.02)',
        border: `1.5px solid ${hovered ? color : 'rgba(255,255,255,0.06)'}`,
        borderRadius: '10px',
        padding: '12px 16px',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
    >
      {/* Thumbnail or icon */}
      <div
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '8px',
          overflow: 'hidden',
          flexShrink: 0,
          backgroundColor: '#1A2234',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {result.coverUrl ? (
          <img
            src={result.coverUrl}
            alt={result.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <span style={{ color }}>{KIND_ICONS[result.kind]}</span>
        )}
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              color,
              letterSpacing: '0.6px',
              textTransform: 'uppercase',
            }}
          >
            {KIND_LABELS[result.kind]}
          </span>
          {!result.available && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                fontSize: '10px',
                color: '#EF4444',
                fontWeight: 600,
              }}
            >
              <WifiOff size={10} />
              Indisponível
            </span>
          )}
        </div>
        <p
          style={{
            color: '#F0F4FC',
            fontSize: '14px',
            fontWeight: 600,
            margin: '0 0 3px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {result.title}
        </p>
        <p
          style={{
            color: '#64748B',
            fontSize: '12px',
            margin: 0,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {result.context}
        </p>
        {result.progressLabel && (
          <span
            style={{
              display: 'inline-block',
              marginTop: '5px',
              fontSize: '10px',
              color,
              fontWeight: 600,
              backgroundColor: `${color}18`,
              padding: '2px 8px',
              borderRadius: '4px',
            }}
          >
            {result.progressLabel}
          </span>
        )}
      </div>

      <ChevronRight size={16} color="#475569" />
    </div>
  );
};
