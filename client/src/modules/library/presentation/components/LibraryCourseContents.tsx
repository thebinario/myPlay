import React from 'react';
import { ChevronDown, Film, GraduationCap, Play } from 'lucide-react';
import type { Course, CourseModule, Document, Movie } from '@/core/domain/library';
import { LibraryContentRow, LibraryDocumentRow } from './LibraryContentRow';

interface LibraryCourseContentsProps {
  course: Course;
  onSelectCourse: (courseId: string) => void;
  onPlayLesson?: (courseId: string, lessonId: string) => void;
  onOpenDocument?: (documentId: string) => void;
  onOpenMovie?: (movieId: string) => void;
  extraMovies?: Movie[];
  extraDocuments?: Document[];
}

export const LibraryCourseContents: React.FC<LibraryCourseContentsProps> = ({
  course,
  onSelectCourse,
  onPlayLesson,
  onOpenDocument,
  onOpenMovie,
  extraMovies = [],
  extraDocuments = [],
}) => {
  const moduleDocumentIds = new Set(
    course.modules.flatMap((module) => (module.documents ?? []).map((document) => document.id)),
  );
  const courseDocuments = (course.documents ?? []).filter(
    (document) => !moduleDocumentIds.has(document.id),
  );
  const modules: CourseModule[] = course.modules.length
    ? course.modules
    : [
        {
          id: `${course.id}-contents`,
          courseId: course.id,
          title: 'Conteúdos',
          order: 0,
          lessons: [],
          documents: [],
        },
      ];
  const videoCount =
    course.modules.reduce((total, module) => total + module.lessons.length, 0) + extraMovies.length;
  const pdfCount =
    courseDocuments.length +
    course.modules.reduce((total, module) => total + (module.documents?.length ?? 0), 0) +
    extraDocuments.length;

  return (
    <section style={sectionStyle}>
      <header style={headerStyle}>
        <GraduationCap size={19} color="#A594FF" />
        <button type="button" onClick={() => onSelectCourse(course.id)} style={titleStyle}>
          {course.title}
        </button>
        <span style={countStyle}>
          {videoCount} vídeos · {pdfCount} PDFs
        </span>
      </header>
      {modules.map((module, index) => {
        const moduleDocuments = [
          ...(module.documents ?? []),
          ...(index === 0 ? courseDocuments : []),
          ...(index === 0 ? extraDocuments : []),
        ];
        const moduleMovies = index === 0 ? extraMovies : [];
        return (
          <details key={module.id} open style={moduleStyle}>
            <summary style={moduleHeaderStyle}>
              <span>{module.title}</span>
              <span style={moduleCountStyle}>
                {module.lessons.length + moduleMovies.length} vídeos · {moduleDocuments.length} PDFs
              </span>
              <ChevronDown size={17} color="#94A3B8" />
            </summary>
            {module.lessons.map((lesson) => (
              <LibraryContentRow
                key={lesson.id}
                title={lesson.title}
                detail={`${Math.floor(lesson.duration / 60)}:${String(lesson.duration % 60).padStart(2, '0')}`}
                icon={<Play size={16} color="#A594FF" />}
                onClick={onPlayLesson ? () => onPlayLesson(course.id, lesson.id) : undefined}
              />
            ))}
            {moduleMovies.map((movie) => (
              <LibraryContentRow
                key={movie.id}
                title={movie.title}
                detail="Vídeo"
                icon={<Film size={16} color="#A594FF" />}
                onClick={onOpenMovie ? () => onOpenMovie(movie.id) : undefined}
              />
            ))}
            {moduleDocuments.map((document) => (
              <LibraryDocumentRow key={document.id} document={document} onOpen={onOpenDocument} />
            ))}
          </details>
        );
      })}
    </section>
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
};
const titleStyle: React.CSSProperties = {
  padding: 0,
  border: 0,
  background: 'transparent',
  color: 'inherit',
  fontSize: 17,
  fontWeight: 600,
  cursor: 'pointer',
};
const countStyle: React.CSSProperties = { marginLeft: 'auto', color: '#94A3B8', fontSize: 13 };
const moduleStyle: React.CSSProperties = {
  margin: 0,
  borderTop: '1px solid rgba(255,255,255,0.06)',
};
const moduleHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '16px 20px',
  color: '#A594FF',
  fontSize: 15,
  fontWeight: 600,
  cursor: 'pointer',
  listStyle: 'none',
};
const moduleCountStyle: React.CSSProperties = {
  marginLeft: 'auto',
  color: '#94A3B8',
  fontSize: 13,
  fontWeight: 400,
};
