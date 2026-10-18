import React from 'react';
import { ChevronDown, Film, Play } from 'lucide-react';
import type { Course, CourseModule, Document, Movie } from '@/core/domain/library';
import { CourseProgressCard } from '@/modules/courses/presentation/CourseProgressCard';
import { LibraryContentRow, LibraryDocumentRow } from './LibraryContentRow';
import { libraryCourseContentsStyles as styles } from './library-course-contents.styles';

interface LibraryCourseContentsProps {
  course: Course;
  onSelectCourse: (courseId: string) => void;
  onPlayLesson?: (courseId: string, lessonId: string) => void;
  onOpenDocument?: (documentId: string) => void;
  onToggleLesson?: (courseId: string, lessonId: string) => void;
  onToggleDocumentRead?: (documentId: string) => void;
  onOpenMovie?: (movieId: string) => void;
  onEditCourse?: (courseId: string) => void;
  extraMovies?: Movie[];
  extraDocuments?: Document[];
}

export const LibraryCourseContents: React.FC<LibraryCourseContentsProps> = ({
  course,
  onSelectCourse,
  onPlayLesson,
  onOpenDocument,
  onToggleLesson,
  onToggleDocumentRead,
  onOpenMovie,
  onEditCourse,
  extraMovies = [],
  extraDocuments = [],
}) => {
  const moduleDocumentIds = new Set(
    course.modules.flatMap((module) => (module.documents ?? []).map((document) => document.id)),
  );
  const courseDocuments = (course.documents ?? []).filter(
    (document) => !moduleDocumentIds.has(document.id),
  );
  const hasRealModules = course.modules.length > 0;
  const modules: CourseModule[] = hasRealModules
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
    <div style={styles.contents}>
      <CourseProgressCard
        course={course}
        contentCount={`${videoCount} vídeos · ${pdfCount} PDFs`}
        onOpenCourse={onSelectCourse}
        onPlayLesson={onPlayLesson}
        onEditCourse={onEditCourse}
      />
      <section style={styles.section}>
        {modules.map((module, index) => {
          const moduleDocuments = [
            ...(module.documents ?? []),
            ...(index === 0 ? courseDocuments : []),
            ...(index === 0 ? extraDocuments : []),
          ];
          const moduleMovies = index === 0 ? extraMovies : [];
          return (
            <details key={module.id} open style={styles.module}>
              <summary style={styles.moduleHeader}>
                <span>{hasRealModules ? `Módulo ${index + 1} · ${module.title}` : 'Módulo'}</span>
                {modules.length > 1 && (
                  <span style={styles.moduleCount}>
                    {module.lessons.length + moduleMovies.length} vídeos · {moduleDocuments.length}{' '}
                    PDFs
                  </span>
                )}
                <ChevronDown size={17} color="#94A3B8" />
              </summary>
              {module.lessons.map((lesson) => (
                <LibraryContentRow
                  key={lesson.id}
                  title={lesson.title}
                  detail={`${Math.floor(lesson.duration / 60)}:${String(lesson.duration % 60).padStart(2, '0')}`}
                  icon={<Play size={16} color="#A594FF" />}
                  onClick={onPlayLesson ? () => onPlayLesson(course.id, lesson.id) : undefined}
                  actionLabel="Reproduzir"
                  isComplete={lesson.completed}
                  onToggleComplete={
                    onToggleLesson ? () => onToggleLesson(course.id, lesson.id) : undefined
                  }
                />
              ))}
              {moduleMovies.map((movie) => (
                <LibraryContentRow
                  key={movie.id}
                  title={movie.title}
                  detail="Vídeo"
                  icon={<Film size={16} color="#A594FF" />}
                  onClick={onOpenMovie ? () => onOpenMovie(movie.id) : undefined}
                  actionLabel="Reproduzir"
                />
              ))}
              {moduleDocuments.map((document) => (
                <LibraryDocumentRow
                  key={document.id}
                  document={document}
                  onOpen={onOpenDocument}
                  onToggleRead={onToggleDocumentRead}
                />
              ))}
            </details>
          );
        })}
      </section>
    </div>
  );
};
