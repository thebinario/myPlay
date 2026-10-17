import React from 'react';
import { BookOpen, ChevronDown, Film } from 'lucide-react';
import type { Document, LibraryItem, Movie } from '@/core/domain/library';
import { LibraryCourseContents } from './LibraryCourseContents';
import { LibraryContentRow, LibraryDocumentRow } from './LibraryContentRow';

interface LibraryContentsListProps {
  items: LibraryItem[];
  onSelectCourse: (courseId: string) => void;
  onPlayLesson?: (courseId: string, lessonId: string) => void;
  onOpenMovie?: (movieId: string) => void;
  onOpenDocument?: (documentId: string) => void;
  onToggleLesson?: (courseId: string, lessonId: string) => void;
  onToggleDocumentRead?: (documentId: string) => void;
  onEditCourse?: (courseId: string) => void;
}

export const LibraryContentsList: React.FC<LibraryContentsListProps> = ({
  items,
  onSelectCourse,
  onPlayLesson,
  onOpenMovie,
  onOpenDocument,
  onToggleLesson,
  onToggleDocumentRead,
  onEditCourse,
}) => {
  const courses = items.filter((item) => item.type === 'course');
  const movies = items.filter((item): item is Movie => item.type === 'movie');
  const documents = items.filter((item): item is Document => item.type === 'document');
  const nestedDocumentIds = new Set(
    courses.flatMap((course) => [
      ...(course.documents ?? []).map((document) => document.id),
      ...course.modules.flatMap((module) => (module.documents ?? []).map((doc) => doc.id)),
    ]),
  );
  const standaloneDocuments = documents.filter((doc) => !nestedDocumentIds.has(doc.id));
  const hasStandalone = movies.length > 0 || standaloneDocuments.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {courses.length === 0 && !hasStandalone && (
        <p style={{ color: '#94A3B8' }}>Nenhum vídeo ou PDF encontrado nesta biblioteca.</p>
      )}
      {courses.map((course, index) => (
        <LibraryCourseContents
          key={course.id}
          course={course}
          onSelectCourse={onSelectCourse}
          onPlayLesson={onPlayLesson}
          onOpenDocument={onOpenDocument}
          onToggleLesson={onToggleLesson}
          onToggleDocumentRead={onToggleDocumentRead}
          onOpenMovie={onOpenMovie}
          onEditCourse={onEditCourse}
          extraMovies={index === 0 ? movies : []}
          extraDocuments={index === 0 ? standaloneDocuments : []}
        />
      ))}
      {courses.length === 0 && hasStandalone && (
        <details open style={sectionStyle}>
          <summary style={headerStyle}>
            <BookOpen size={19} color="#A594FF" />
            <strong>Conteúdos</strong>
            <span style={countStyle}>
              {movies.length} vídeos · {standaloneDocuments.length} PDFs
            </span>
            <ChevronDown size={17} color="#94A3B8" />
          </summary>
          {movies.map((movie) => (
            <LibraryContentRow
              key={movie.id}
              title={movie.title}
              detail="Vídeo"
              icon={<Film size={16} color="#A594FF" />}
              onClick={onOpenMovie ? () => onOpenMovie(movie.id) : undefined}
              actionLabel="Reproduzir"
            />
          ))}
          {standaloneDocuments.map((document) => (
            <LibraryDocumentRow
              key={document.id}
              document={document}
              onOpen={onOpenDocument}
              onToggleRead={onToggleDocumentRead}
            />
          ))}
        </details>
      )}
    </div>
  );
};

const sectionStyle: React.CSSProperties = {
  overflow: 'hidden',
  backgroundColor: '#141A28',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12,
};
const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '18px 20px',
  color: '#F0F4FC',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
  cursor: 'pointer',
  listStyle: 'none',
};
const countStyle: React.CSSProperties = { marginLeft: 'auto', color: '#94A3B8', fontSize: 13 };

LibraryContentsList.displayName = 'LibraryContentsList';
