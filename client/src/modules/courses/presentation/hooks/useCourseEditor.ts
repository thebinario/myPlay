import { useCallback, useRef, useState } from 'react';
import type { Course } from '@/core/domain/library';
import { useLibraryRepository } from '@/modules/library/presentation/LibraryProvider';
import {
  moveLesson,
  renameCourse,
  renameDocument,
  renameLesson,
  renameModule,
  reorderModules,
} from '@/modules/courses/domain/course-editing';
import { saveCourse } from '@/modules/courses/application/use-cases/save-course';

export interface CourseEditorState {
  course: Course;
  historyLength: number;
  showSavedFeedback: boolean;
  saveError: string | null;
  draggedModuleIndex: number | null;
  dragOverModuleIndex: number | null;
  handleUndo: () => void;
  handleCourseTitleChange: (newTitle: string) => void;
  handleModuleTitleChange: (moduleId: string, newTitle: string) => void;
  handleLessonTitleChange: (moduleId: string, lessonId: string, newTitle: string) => void;
  handleDocumentTitleChange: (documentId: string, newTitle: string) => void;
  moveModule: (fromIndex: number, toIndex: number) => void;
  moveLessonToModule: (sourceModuleId: string, lessonId: string, targetModuleId: string) => void;
  handleDragStartModule: (index: number) => void;
  handleDragOverModule: (event: React.DragEvent, index: number) => void;
  handleDropModule: (dropIndex: number) => void;
  handleSaveAll: () => Promise<void>;
  handleDiscardChanges: () => void;
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/**
 * Hook de apresentação do editor de cursos: mantém o estado de UI (histórico,
 * drag & drop, feedback) e delega as regras de edição ao domínio e a
 * persistência ao caso de uso.
 */
export function useCourseEditor(
  initialCourse: Course,
  onSave: (course: Course) => void,
): CourseEditorState {
  const repository = useLibraryRepository();
  const [course, setCourse] = useState<Course>(() => clone(initialCourse));
  const [history, setHistory] = useState<Course[]>([]);
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [draggedModuleIndex, setDraggedModuleIndex] = useState<number | null>(null);
  const [dragOverModuleIndex, setDragOverModuleIndex] = useState<number | null>(null);

  // Mantém a versão mais recente do curso para compor a pilha de undo.
  const courseRef = useRef(course);
  courseRef.current = course;

  const recordHistory = useCallback((nextCourse: Course) => {
    setHistory((prev) => [...prev, clone(courseRef.current)]);
    setCourse(nextCourse);
    setShowSavedFeedback(false);
    setSaveError(null);
  }, []);

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, prev.length - 1));
    setCourse(previous);
    setShowSavedFeedback(false);
  }, [history]);

  const apply = useCallback(
    (transform: (current: Course) => Course) => {
      const next = transform(courseRef.current);
      if (next === courseRef.current) return;
      recordHistory(next);
    },
    [recordHistory],
  );

  const handleCourseTitleChange = useCallback(
    (newTitle: string) => apply((current) => renameCourse(current, newTitle)),
    [apply],
  );

  const handleModuleTitleChange = useCallback(
    (moduleId: string, newTitle: string) =>
      apply((current) => renameModule(current, moduleId, newTitle)),
    [apply],
  );

  const handleLessonTitleChange = useCallback(
    (moduleId: string, lessonId: string, newTitle: string) =>
      apply((current) => renameLesson(current, moduleId, lessonId, newTitle)),
    [apply],
  );

  const handleDocumentTitleChange = useCallback(
    (documentId: string, newTitle: string) =>
      apply((current) => renameDocument(current, documentId, newTitle)),
    [apply],
  );

  const moveModule = useCallback(
    (fromIndex: number, toIndex: number) =>
      apply((current) => reorderModules(current, fromIndex, toIndex)),
    [apply],
  );

  const moveLessonToModule = useCallback(
    (sourceModuleId: string, lessonId: string, targetModuleId: string) =>
      apply((current) => moveLesson(current, sourceModuleId, lessonId, targetModuleId)),
    [apply],
  );

  const handleDragStartModule = useCallback((index: number) => {
    setDraggedModuleIndex(index);
  }, []);

  const handleDragOverModule = useCallback((event: React.DragEvent, index: number) => {
    event.preventDefault();
    setDragOverModuleIndex(index);
  }, []);

  const handleDropModule = useCallback(
    (dropIndex: number) => {
      if (draggedModuleIndex !== null && draggedModuleIndex !== dropIndex) {
        moveModule(draggedModuleIndex, dropIndex);
      }
      setDraggedModuleIndex(null);
      setDragOverModuleIndex(null);
    },
    [draggedModuleIndex, moveModule],
  );

  const handleSaveAll = useCallback(async () => {
    setSaveError(null);
    try {
      const saved = await saveCourse({ courses: repository }, courseRef.current);
      setCourse(saved);
      onSave(saved);
      setShowSavedFeedback(true);
      window.setTimeout(() => setShowSavedFeedback(false), 3500);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Não foi possível salvar o curso.');
    }
  }, [repository, onSave]);

  const handleDiscardChanges = useCallback(() => {
    setCourse(clone(initialCourse));
    setHistory([]);
    setShowSavedFeedback(false);
    setSaveError(null);
  }, [initialCourse]);

  return {
    course,
    historyLength: history.length,
    showSavedFeedback,
    saveError,
    draggedModuleIndex,
    dragOverModuleIndex,
    handleUndo,
    handleCourseTitleChange,
    handleModuleTitleChange,
    handleLessonTitleChange,
    handleDocumentTitleChange,
    moveModule,
    moveLessonToModule,
    handleDragStartModule,
    handleDragOverModule,
    handleDropModule,
    handleSaveAll,
    handleDiscardChanges,
  };
}
