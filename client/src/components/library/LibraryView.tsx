import React, { useState, useMemo } from 'react';
import { 
  LibraryItem, 
  Course, 
  Movie, 
  Document 
} from '../../types/library';
import { 
  Search, 
  GraduationCap, 
  Film, 
  FileText, 
  Clock, 
  BookOpen, 
  SlidersHorizontal 
} from 'lucide-react';

interface LibraryViewProps {
  items: LibraryItem[];
  onSelectCourse: (courseId: string) => void;
  onOpenMovie?: (movieId: string) => void;
  onOpenDocument?: (docId: string) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({ 
  items, 
  onSelectCourse, 
  onOpenMovie, 
  onOpenDocument 
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'course' | 'movie' | 'document'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesTab = activeTab === 'all' || item.type === activeTab;
      if (!matchesTab) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchDesc = item.description.toLowerCase().includes(q);
      const matchCategory = item.category.toLowerCase().includes(q);
      const matchTags = item.tags.some(tag => tag.toLowerCase().includes(q));

      return matchTitle || matchDesc || matchCategory || matchTags;
    });
  }, [items, activeTab, searchQuery]);

  const tabs = [
    { id: 'all' as const, label: 'Todos', icon: SlidersHorizontal },
    { id: 'course' as const, label: 'Cursos', icon: GraduationCap },
    { id: 'movie' as const, label: 'Filmes', icon: Film },
    { id: 'document' as const, label: 'Documentos', icon: FileText },
  ];

  const formatSeconds = (sec: number): string => {
    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes > 0 ? `${minutes}m` : ''}`;
    }
    return `${minutes}m`;
  };

  const handleItemClick = (item: LibraryItem) => {
    if (item.type === 'course') {
      onSelectCourse(item.id);
    } else if (item.type === 'movie' && onOpenMovie) {
      onOpenMovie(item.id);
    } else if (item.type === 'document' && onOpenDocument) {
      onOpenDocument(item.id);
    }
  };

  return (
    <div style={{ padding: '32px 40px', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
      {/* Header bar */}
      <div 
        style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        <div>
          <h1 
            style={{
              fontSize: '28px',
              fontWeight: 700,
              color: '#FFFFFF',
              letterSpacing: '-0.5px',
              marginBottom: '6px',
            }}
          >
            Biblioteca
          </h1>
          <p style={{ color: '#94A3B8', fontSize: '14px' }}>
            Organize e acesse seus cursos, documentários cinematográficos e materiais de estudo.
          </p>
        </div>

        {/* Search input with functional minimalism */}
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#141A28',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            padding: '8px 14px',
            width: '320px',
            transition: 'border-color 0.2s',
          }}
        >
          <Search size={18} color="#8B949E" style={{ marginRight: '10px', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Buscar em cursos, filmes e documentos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: '#FFFFFF',
              fontSize: '13px',
              width: '100%',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div 
        role="tablist"
        aria-label="Filtros de conteúdo"
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          paddingBottom: '14px',
          marginBottom: '28px',
        }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isSelected}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: isSelected ? 'rgba(165, 148, 255, 0.15)' : 'transparent',
                color: isSelected ? '#A594FF' : '#94A3B8',
                fontWeight: isSelected ? 600 : 500,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.18s ease-in-out',
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                  e.currentTarget.style.color = '#FFFFFF';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#94A3B8';
                }
              }}
            >
              <Icon size={16} strokeWidth={isSelected ? 2.3 : 1.8} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Cards Grid */}
      {filteredItems.length === 0 ? (
        <div 
          style={{
            padding: '64px 20px',
            textAlign: 'center',
            backgroundColor: '#121622',
            borderRadius: '12px',
            border: '1px dashed rgba(255, 255, 255, 0.1)',
          }}
        >
          <BookOpen size={40} color="#64748B" style={{ marginBottom: '12px' }} />
          <h3 style={{ color: '#F0F4FC', fontSize: '16px', marginBottom: '6px' }}>
            Nenhum conteúdo encontrado
          </h3>
          <p style={{ color: '#64748B', fontSize: '13px' }}>
            Tente buscar por outro termo ou selecione uma aba de categoria diferente.
          </p>
        </div>
      ) : (
        <div 
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
            gap: '24px',
          }}
        >
          {filteredItems.map((item) => {
            const isCourse = item.type === 'course';
            const course = isCourse ? (item as Course) : null;
            const movie = item.type === 'movie' ? (item as Movie) : null;
            const doc = item.type === 'document' ? (item as Document) : null;

            const progress = isCourse ? course!.progress : movie ? movie.progress : doc ? Math.round((doc.lastReadPage / doc.totalPages) * 100) : 0;

            return (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                style={{
                  backgroundColor: '#141A28',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.borderColor = 'rgba(165, 148, 255, 0.4)';
                  e.currentTarget.style.boxShadow = '0 12px 28px rgba(0, 0, 0, 0.4), 0 0 20px rgba(165, 148, 255, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Thumbnail / Cover */}
                <div style={{ position: 'relative', width: '100%', height: '160px', backgroundColor: '#0B0F19' }}>
                  {item.coverUrl ? (
                    <img
                      src={item.coverUrl}
                      alt={item.title}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        opacity: 0.88,
                      }}
                    />
                  ) : (
                    <div 
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'linear-gradient(135deg, #1A2234 0%, #101624 100%)',
                      }}
                    >
                      <FileText size={40} color="#A594FF" />
                    </div>
                  )}

                  {/* Badge de Categoria */}
                  <div 
                    style={{
                      position: 'absolute',
                      top: '10px',
                      left: '10px',
                      backgroundColor: 'rgba(13, 17, 27, 0.85)',
                      backdropFilter: 'blur(8px)',
                      color: '#A594FF',
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '4px 8px',
                      borderRadius: '6px',
                      border: '1px solid rgba(165, 148, 255, 0.2)',
                    }}
                  >
                    {item.category}
                  </div>

                  {/* Type Indicator */}
                  <div 
                    style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      backgroundColor: 'rgba(13, 17, 27, 0.85)',
                      backdropFilter: 'blur(8px)',
                      color: '#FFFFFF',
                      fontSize: '11px',
                      padding: '4px 6px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {isCourse && <GraduationCap size={13} color="#A594FF" />}
                    {movie && <Film size={13} color="#A594FF" />}
                    {doc && <FileText size={13} color="#A594FF" />}
                  </div>

                  {/* Duration / Pages Pill */}
                  <div 
                    style={{
                      position: 'absolute',
                      bottom: '8px',
                      right: '10px',
                      backgroundColor: 'rgba(0, 0, 0, 0.75)',
                      backdropFilter: 'blur(6px)',
                      color: '#E2E8F0',
                      fontSize: '11px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {isCourse && (
                      <>
                        <Clock size={11} />
                        {formatSeconds(course!.totalDuration)}
                      </>
                    )}
                    {movie && (
                      <>
                        <Clock size={11} />
                        {formatSeconds(movie.duration)}
                      </>
                    )}
                    {doc && (
                      <>
                        <BookOpen size={11} />
                        {doc.totalPages} págs
                      </>
                    )}
                  </div>
                </div>

                {/* Progress Bar in Violet */}
                <div 
                  style={{
                    width: '100%',
                    height: '3px',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <div 
                    style={{
                      width: `${progress}%`,
                      height: '100%',
                      backgroundColor: '#A594FF',
                      boxShadow: '0 0 8px #A594FF',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>

                {/* Content body */}
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <h3 
                    style={{
                      fontSize: '15px',
                      fontWeight: 600,
                      color: '#F0F4FC',
                      lineHeight: '1.35',
                      marginBottom: '8px',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {item.title}
                  </h3>

                  <p 
                    style={{
                      fontSize: '12px',
                      color: '#8B949E',
                      lineHeight: '1.45',
                      marginBottom: '14px',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      flex: 1,
                    }}
                  >
                    {item.description}
                  </p>

                  {/* Metadata footer */}
                  <div 
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                      paddingTop: '10px',
                      fontSize: '11px',
                      color: '#94A3B8',
                    }}
                  >
                    <span>
                      {isCourse 
                        ? `${course!.modules.reduce((acc, m) => acc + m.lessons.length, 0)} aulas` 
                        : movie 
                        ? 'Filme Completo' 
                        : `Pág ${doc!.lastReadPage} de ${doc!.totalPages}`}
                    </span>
                    <span style={{ color: progress > 0 ? '#A594FF' : '#64748B', fontWeight: 600 }}>
                      {progress > 0 ? `${progress}%` : 'Não iniciado'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
