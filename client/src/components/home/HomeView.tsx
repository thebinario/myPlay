import React from 'react';
import { Course, Movie, Document } from '../../types/library';
import { BookOpen, Clock, Sparkles } from 'lucide-react';

interface HomeViewProps {
  courses: Course[];
  movies: Movie[];
  documents: Document[];
  onSelectCourse: (courseId: string) => void;
  onOpenMovie?: (movieId: string) => void;
  onOpenDocument?: (docId: string) => void;
  onExploreLibrary: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  courses,
  movies,
  documents,
  onSelectCourse,
  onOpenMovie,
  onOpenDocument,
  onExploreLibrary,
}) => {
  const inProgressCourses = courses.filter(c => c.progress > 0 && c.progress < 100);
  const inProgressMovies = movies.filter(m => m.progress > 0 && m.progress < 100);
  const inProgressDocs = documents.filter(d => d.lastReadPage > 1);

  return (
    <div style={{ padding: '32px 40px', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
      {/* Hero Welcome banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #141A28 0%, #171E30 100%)',
          border: '1px solid rgba(165, 148, 255, 0.2)',
          borderRadius: '16px',
          padding: '36px',
          marginBottom: '36px',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={16} color="#A594FF" />
          <span style={{ color: '#A594FF', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            Bem-vindo à MIDOTECA
          </span>
        </div>

        <h1 
          style={{
            fontSize: '32px',
            fontWeight: 700,
            color: '#FFFFFF',
            letterSpacing: '-0.5px',
          }}
        >
          Início
        </h1>

        <p style={{ color: '#94A3B8', fontSize: '15px', maxWidth: '640px', lineHeight: '1.5' }}>
          Sua central de estudo e entretenimento offline. Retome de onde parou em seus cursos, vídeos e apostilas.
        </p>

        <div style={{ marginTop: '8px' }}>
          <button
            onClick={onExploreLibrary}
            style={{
              backgroundColor: '#A594FF',
              color: '#0D111B',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 18px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            Explorar Biblioteca Completa
          </button>
        </div>
      </div>

      {/* Continuar de onde parou Section */}
      <div style={{ marginBottom: '36px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#FFFFFF', marginBottom: '16px' }}>
          Continuar de onde parou
        </h2>

        {inProgressCourses.length === 0 && inProgressMovies.length === 0 && inProgressDocs.length === 0 ? (
          <div 
            style={{
              backgroundColor: '#141A28',
              borderRadius: '12px',
              padding: '32px',
              textAlign: 'center',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <Clock size={32} color="#64748B" style={{ marginBottom: '8px' }} />
            <p style={{ color: '#94A3B8', fontSize: '14px' }}>
              Nenhum item em andamento no momento. Comece um curso na biblioteca!
            </p>
          </div>
        ) : (
          <div 
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '20px',
            }}
          >
            {inProgressCourses.map(course => (
              <div
                key={course.id}
                onClick={() => onSelectCourse(course.id)}
                style={{
                  backgroundColor: '#141A28',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  padding: '16px',
                  cursor: 'pointer',
                  display: 'flex',
                  gap: '14px',
                  alignItems: 'center',
                  transition: 'all 0.18s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#A594FF';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div 
                  style={{
                    width: '70px',
                    height: '70px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    flexShrink: 0,
                    backgroundColor: '#0B0F19',
                  }}
                >
                  <img 
                    src={course.coverUrl} 
                    alt={course.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ color: '#A594FF', fontSize: '11px', fontWeight: 600 }}>
                    CURSO • {course.category}
                  </span>
                  <h4 
                    style={{
                      color: '#FFFFFF',
                      fontSize: '14px',
                      fontWeight: 600,
                      marginTop: '2px',
                      marginBottom: '6px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {course.title}
                  </h4>

                  {/* Progress bar */}
                  <div style={{ width: '100%', height: '4px', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{ width: `${course.progress}%`, height: '100%', backgroundColor: '#A594FF' }} />
                  </div>
                  <span style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px', display: 'block' }}>
                    {course.progress}% concluído
                  </span>
                </div>
              </div>
            ))}

            {inProgressMovies.map(movie => (
              <div
                key={movie.id}
                onClick={() => onOpenMovie && onOpenMovie(movie.id)}
                style={{
                  backgroundColor: '#141A28',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  padding: '16px',
                  cursor: 'pointer',
                  display: 'flex',
                  gap: '14px',
                  alignItems: 'center',
                }}
              >
                <div style={{ width: '70px', height: '70px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                  <img src={movie.coverUrl} alt={movie.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ color: '#10B981', fontSize: '11px', fontWeight: 600 }}>FILME</span>
                  <h4 style={{ color: '#FFFFFF', fontSize: '14px', fontWeight: 600, margin: '2px 0 6px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {movie.title}
                  </h4>
                  <div style={{ width: '100%', height: '4px', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: '999px' }}>
                    <div style={{ width: `${movie.progress}%`, height: '100%', backgroundColor: '#10B981' }} />
                  </div>
                  <span style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px', display: 'block' }}>
                    {movie.progress}% assistido
                  </span>
                </div>
              </div>
            ))}

            {inProgressDocs.map(doc => (
              <div
                key={doc.id}
                onClick={() => onOpenDocument && onOpenDocument(doc.id)}
                style={{
                  backgroundColor: '#141A28',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  padding: '16px',
                  cursor: 'pointer',
                  display: 'flex',
                  gap: '14px',
                  alignItems: 'center',
                }}
              >
                <div style={{ width: '70px', height: '70px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1B2338', flexShrink: 0 }}>
                  <BookOpen size={28} color="#A594FF" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ color: '#F59E0B', fontSize: '11px', fontWeight: 600 }}>DOCUMENTO PDF</span>
                  <h4 style={{ color: '#FFFFFF', fontSize: '14px', fontWeight: 600, margin: '2px 0 6px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {doc.title}
                  </h4>
                  <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                    Página {doc.lastReadPage} de {doc.totalPages}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
