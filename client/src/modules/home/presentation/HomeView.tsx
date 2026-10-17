import React from 'react';
import { Course, Movie, Document } from '@/core/domain/library';
import { BookOpen, Clock, Sparkles, Search, Play, FileText } from 'lucide-react';

interface HomeViewProps {
  courses: Course[];
  movies: Movie[];
  documents: Document[];
  onSelectCourse: (courseId: string) => void;
  onOpenMovie?: (movieId: string) => void;
  onOpenDocument?: (docId: string) => void;
  onExploreLibrary: () => void;
  onSearchOpen?: () => void;
}

// ─── helpers ──────────────────────────────────────────────────────────────────
function ProgressBar({ value, color = '#A594FF' }: { value: number; color?: string }) {
  return (
    <div
      style={{
        width: '100%',
        height: '4px',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: '999px',
        overflow: 'hidden',
      }}
    >
      <div style={{ width: `${value}%`, height: '100%', backgroundColor: color }} />
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontSize: '16px',
        fontWeight: 700,
        color: '#E2E8F0',
        marginBottom: '14px',
        letterSpacing: '-0.2px',
      }}
    >
      {children}
    </h2>
  );
}

const CARD_STYLE: React.CSSProperties = {
  backgroundColor: '#131A27',
  borderRadius: '12px',
  border: '1px solid rgba(255, 255, 255, 0.07)',
  padding: '14px',
  cursor: 'pointer',
  display: 'flex',
  gap: '14px',
  alignItems: 'center',
  transition: 'all 0.18s ease',
};

// ─── Component ────────────────────────────────────────────────────────────────
export const HomeView: React.FC<HomeViewProps> = ({
  courses,
  movies,
  documents,
  onSelectCourse,
  onOpenMovie,
  onOpenDocument,
  onExploreLibrary,
  onSearchOpen,
}) => {
  const watchingCourses = courses.filter(
    (course) =>
      course.progress > 0 ||
      course.modules.some((module) =>
        module.lessons.some((lesson) => (lesson.lastPlaybackPosition ?? 0) > 0),
      ),
  );
  const watchingMovies = movies.filter((movie) => movie.progress > 0);
  const readingDocs = documents.filter(
    (document) => document.lastReadPage > 1 || !!document.readingState?.lastAccessedAt,
  );

  const hasWatching = watchingCourses.length > 0 || watchingMovies.length > 0;
  const hasReading = readingDocs.length > 0;
  const hasActivity = hasWatching || hasReading;

  return (
    <div style={{ padding: '32px 40px', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
      {/* ── Hero Banner ─────────────────────────────────────────────────────── */}
      <div
        style={{
          background: 'linear-gradient(135deg, #141A28 0%, #171E30 100%)',
          border: '1px solid rgba(165, 148, 255, 0.18)',
          borderRadius: '16px',
          padding: '32px 36px',
          marginBottom: '32px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* decorative glow */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '-40px',
            right: '-40px',
            width: '200px',
            height: '200px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(165,148,255,0.08) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Sparkles size={14} color="#A594FF" />
          <span
            style={{
              color: '#A594FF',
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
            }}
          >
            MIDOTECA
          </span>
        </div>

        <h1
          style={{
            fontSize: '30px',
            fontWeight: 700,
            color: '#FFFFFF',
            letterSpacing: '-0.5px',
            marginBottom: '8px',
          }}
        >
          Início
        </h1>

        <p
          style={{
            color: '#94A3B8',
            fontSize: '14px',
            lineHeight: '1.5',
            maxWidth: '560px',
            marginBottom: '20px',
          }}
        >
          Retome onde parou. Seus cursos, vídeos e apostilas estão prontos.
        </p>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={onExploreLibrary}
            style={{
              backgroundColor: '#A594FF',
              color: '#0D111B',
              border: 'none',
              borderRadius: '8px',
              padding: '9px 16px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <BookOpen size={14} />
            Explorar Biblioteca
          </button>

          {onSearchOpen && (
            <button
              data-testid="home-search-shortcut"
              onClick={onSearchOpen}
              aria-label="Abrir pesquisa"
              style={{
                backgroundColor: 'rgba(255,255,255,0.06)',
                color: '#94A3B8',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                padding: '9px 16px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#F0F4FC';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#94A3B8';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
              }}
            >
              <Search size={14} />
              Pesquisar
              <kbd
                style={{
                  marginLeft: '4px',
                  backgroundColor: '#0D111B',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '4px',
                  padding: '0px 5px',
                  fontSize: '10px',
                  color: '#64748B',
                }}
              >
                ⌘K
              </kbd>
            </button>
          )}
        </div>
      </div>

      {/* ── Empty state ──────────────────────────────────────────────────────── */}
      {!hasActivity && (
        <div
          data-testid="home-empty-state"
          style={{
            backgroundColor: '#131A27',
            borderRadius: '12px',
            padding: '48px 32px',
            textAlign: 'center',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <Clock size={36} color="#334155" style={{ marginBottom: '12px' }} />
          <p style={{ color: '#94A3B8', fontSize: '15px', fontWeight: 600, marginBottom: '6px' }}>
            Nenhum item em andamento
          </p>
          <p style={{ color: '#64748B', fontSize: '13px' }}>
            Comece um curso ou abra um documento na biblioteca e volte aqui para continuar.
          </p>
        </div>
      )}

      {/* ── Continue assistindo ───────────────────────────────────────────────── */}
      {hasWatching && (
        <section style={{ marginBottom: '32px' }}>
          <SectionTitle>Continue assistindo</SectionTitle>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '12px',
            }}
          >
            {watchingCourses.map((course) => (
              <div
                key={course.id}
                data-testid={`home-course-${course.id}`}
                onClick={() => onSelectCourse(course.id)}
                style={CARD_STYLE}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#A594FF';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.07)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    flexShrink: 0,
                    backgroundColor: '#0B0F19',
                    display: 'grid',
                    placeItems: 'center',
                    color: '#A594FF',
                  }}
                >
                  <BookOpen size={26} aria-label="Capa do curso indisponível" />
                  {course.coverUrl.trim() && (
                    <img
                      src={course.coverUrl}
                      alt=""
                      aria-hidden="true"
                      onError={(event) => event.currentTarget.remove()}
                      style={{
                        gridArea: '1 / 1',
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      color: '#A594FF',
                      fontSize: '10px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    CURSO • {course.category}
                  </span>
                  <h4
                    style={{
                      color: '#FFFFFF',
                      fontSize: '14px',
                      fontWeight: 600,
                      margin: '3px 0 8px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {course.title}
                  </h4>
                  <ProgressBar value={course.progress} color="#A594FF" />
                  <span
                    style={{
                      fontSize: '11px',
                      color: '#64748B',
                      marginTop: '5px',
                      display: 'block',
                    }}
                  >
                    {course.progress}% concluído
                  </span>
                </div>
                <Play size={16} color="#A594FF" />
              </div>
            ))}

            {watchingMovies.map((movie) => (
              <div
                key={movie.id}
                data-testid={`home-movie-${movie.id}`}
                onClick={() => onOpenMovie && onOpenMovie(movie.id)}
                style={CARD_STYLE}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#10B981';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.07)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    flexShrink: 0,
                  }}
                >
                  <img
                    src={movie.coverUrl}
                    alt={movie.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      color: '#10B981',
                      fontSize: '10px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    FILME
                  </span>
                  <h4
                    style={{
                      color: '#FFFFFF',
                      fontSize: '14px',
                      fontWeight: 600,
                      margin: '3px 0 8px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {movie.title}
                  </h4>
                  <ProgressBar value={movie.progress} color="#10B981" />
                  <span
                    style={{
                      fontSize: '11px',
                      color: '#64748B',
                      marginTop: '5px',
                      display: 'block',
                    }}
                  >
                    {movie.progress}% assistido
                  </span>
                </div>
                <Play size={16} color="#10B981" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Continue lendo ────────────────────────────────────────────────────── */}
      {hasReading && (
        <section style={{ marginBottom: '32px' }}>
          <SectionTitle>Continue lendo</SectionTitle>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '12px',
            }}
          >
            {readingDocs.map((doc) => (
              <div
                key={doc.id}
                data-testid={`home-doc-${doc.id}`}
                onClick={() => onOpenDocument && onOpenDocument(doc.id)}
                style={CARD_STYLE}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#F59E0B';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.07)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#1B2338',
                    flexShrink: 0,
                    border: doc.isUnavailable ? '1px solid rgba(239,68,68,0.3)' : 'none',
                  }}
                >
                  <FileText size={26} color={doc.isUnavailable ? '#EF4444' : '#F59E0B'} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      color: doc.isUnavailable ? '#EF4444' : '#F59E0B',
                      fontSize: '10px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    {doc.isUnavailable ? 'INDISPONÍVEL' : 'PDF'}
                  </span>
                  <h4
                    style={{
                      color: '#FFFFFF',
                      fontSize: '14px',
                      fontWeight: 600,
                      margin: '3px 0 6px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {doc.title}
                  </h4>
                  <span style={{ fontSize: '11px', color: '#64748B' }}>
                    Página {doc.lastReadPage} de {doc.totalPages}
                  </span>
                </div>
                <BookOpen size={16} color={doc.isUnavailable ? '#475569' : '#F59E0B'} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
