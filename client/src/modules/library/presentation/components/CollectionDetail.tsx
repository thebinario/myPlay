import React from 'react';
import { ArrowLeft } from 'lucide-react';
import type { Collection } from '@/core/domain/collection';
import { CoursesGrid } from './CoursesGrid';
import { LibraryCourseContents } from './LibraryCourseContents';

interface CollectionDetailProps {
  collection: Collection;
  backLabel: string;
  onBack: () => void;
  onSelectCourse: (courseId: string) => void;
  onPlayLesson?: (courseId: string, lessonId: string) => void;
  onOpenMovie?: (movieId: string) => void;
  onOpenDocument?: (docId: string) => void;
  onToggleLesson?: (courseId: string, lessonId: string) => void;
  onToggleDocumentRead?: (documentId: string) => void;
  onEditCourse?: (courseId: string) => void;
}

/**
 * Detalhe de uma coleção: mostra a grade de cursos quando há vários e, quando
 * a coleção tem um único curso, abre direto o conteúdo desse curso (módulos e
 * aulas) — pulando o passo intermediário de escolher o curso.
 */
export const CollectionDetail: React.FC<CollectionDetailProps> = ({
  collection,
  backLabel,
  onBack,
  onSelectCourse,
  onPlayLesson,
  onOpenMovie,
  onOpenDocument,
  onToggleLesson,
  onToggleDocumentRead,
  onEditCourse,
}) => (
  <>
    <button type="button" onClick={onBack} style={styles.back}>
      <ArrowLeft size={15} style={styles.backIcon} aria-hidden />
      {backLabel}
    </button>
    <h2 style={styles.title}>{collection.title}</h2>
    {collection.courses.length > 1 ? (
      <CoursesGrid courses={collection.courses} onSelectCourse={onSelectCourse} />
    ) : (
      <LibraryCourseContents
        course={collection.courses[0]}
        onSelectCourse={onSelectCourse}
        onPlayLesson={onPlayLesson}
        onOpenDocument={onOpenDocument}
        onToggleLesson={onToggleLesson}
        onToggleDocumentRead={onToggleDocumentRead}
        onOpenMovie={onOpenMovie}
        onEditCourse={onEditCourse}
      />
    )}
  </>
);

const styles: Record<string, React.CSSProperties> = {
  back: {
    background: 'transparent',
    border: 0,
    color: '#94A3B8',
    cursor: 'pointer',
    padding: 0,
    marginBottom: 12,
  },
  backIcon: {
    verticalAlign: 'middle',
    marginRight: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: '#FFFFFF',
    marginBottom: 20,
  },
};
