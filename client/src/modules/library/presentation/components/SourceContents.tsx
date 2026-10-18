import React from 'react';
import type { Collection } from '@/core/domain/collection';
import type { Course, LibraryItem } from '@/core/domain/library';
import { CollectionsGrid } from './CollectionsGrid';
import { CoursesGrid } from './CoursesGrid';
import { LibraryContentsList } from './LibraryContentsList';

interface SourceContentsProps {
  items: LibraryItem[];
  collections: Collection[];
  onOpenCollection: (collectionId: string) => void;
  onSelectCourse: (courseId: string) => void;
  onPlayLesson?: (courseId: string, lessonId: string) => void;
  onOpenMovie?: (movieId: string) => void;
  onOpenDocument?: (docId: string) => void;
  onToggleLesson?: (courseId: string, lessonId: string) => void;
  onToggleDocumentRead?: (documentId: string) => void;
  onEditCourse?: (courseId: string) => void;
}

/**
 * Conteúdo de uma fonte (biblioteca): segue o drill-down
 * `Fontes › Coleções › Curso`. Mostra as coleções da fonte e, abaixo, os cursos
 * que não pertencem a nenhuma coleção. Quando a fonte não tem coleções e possui
 * um único curso, abre direto o conteúdo (módulos e aulas) desse curso.
 */
export const SourceContents: React.FC<SourceContentsProps> = ({
  items,
  collections,
  onOpenCollection,
  onSelectCourse,
  onPlayLesson,
  onOpenMovie,
  onOpenDocument,
  onToggleLesson,
  onToggleDocumentRead,
  onEditCourse,
}) => {
  const courses = items.filter((item): item is Course => item.type === 'course');
  const standalone = items.filter((item) => item.type !== 'course');
  const collectionIds = new Set(collections.map((collection) => collection.id));
  const looseCourses = courses.filter(
    (course) => !course.collectionId || !collectionIds.has(course.collectionId),
  );
  const singleCourse = collections.length === 0 && courses.length === 1;

  const listProps = {
    onSelectCourse,
    onPlayLesson,
    onOpenMovie,
    onOpenDocument,
    onToggleLesson,
    onToggleDocumentRead,
    onEditCourse,
  };

  const sections: Array<{ key: string; node: React.ReactNode }> = [];
  if (collections.length > 0) {
    sections.push({
      key: 'collections',
      node: <CollectionsGrid collections={collections} onOpenCollection={onOpenCollection} />,
    });
  }

  if (singleCourse) {
    sections.push({ key: 'single-course', node: <LibraryContentsList items={items} {...listProps} /> });
  } else {
    if (looseCourses.length > 0) {
      sections.push({
        key: 'courses',
        node: <CoursesGrid courses={looseCourses} onSelectCourse={onSelectCourse} />,
      });
    }
    if (standalone.length > 0) {
      sections.push({
        key: 'standalone',
        node: <LibraryContentsList items={standalone} {...listProps} />,
      });
    }
  }

  if (sections.length === 0) {
    sections.push({ key: 'all', node: <LibraryContentsList items={items} {...listProps} /> });
  }

  return (
    <>
      {sections.map((section, index) => (
        <div key={section.key} style={{ marginTop: index === 0 ? 0 : 24 }}>
          {section.node}
        </div>
      ))}
    </>
  );
};
