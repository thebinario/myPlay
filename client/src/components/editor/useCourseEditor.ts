import { useCallback, useRef, useState } from 'react';
import type { Course, Lesson } from '../../types/library';
import { useLibraryRepository } from '../../services/LibraryContext';

export interface CourseEditorState {
  course: Course;
  historyLength: number;
  showSavedFeedback: boolean;
  draggedModuleIndex: number | null;
  dragOverModuleIndex: number | null;
  handleUndo: () => void;
  handleCourseTitleChange: (newTitle: string) => void;
  handleModuleTitleChange: (moduleId: string, newTitle: string) => void;
  handleLessonTitleChange: (moduleId: string, lessonId: string, newTitle: string) => void;
  moveModule: (fromIndex: number, toIndex: number) => void;
  moveLessonToModule: (sourceModuleId: string, lessonId: string, targetModuleId: string) => void;
  handleDragStartModule: (index: number) => void;
  handleDragOverModule: (event: React.DragEvent, index: number) => void;
  handleDropModule: (dropIndex: number) => void;
  handleSaveAll: () => void;
  handleDiscardChanges: () => void;
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/** Estado e operações de edição de curso (undo, reordenação, drag & drop, salvar). */
export function useCourseEditor(
  initialCourse: Course,
  onSave: (course: Course) => void,
): CourseEditorState {
  const repository = useLibraryRepository();
  const [course, setCourse] = useState<Course>(() => clone(initialCourse));
  const [history, setHistory] = useState<Course[]>([]);
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);
  const [draggedModuleIndex, setDraggedModuleIndex] = useState<number | null>(null);
  const [dragOverModuleIndex, setDragOverModuleIndex] = useState<number | null>(null);

  // Mantém a versão mais recente do curso para compor a pilha de undo.
  const courseRef = useRef(course);
  courseRef.current = course;

  const recordHistory = useCallback((nextCourse: Course) => {
    setHistory((prev) => [...prev, clone(courseRef.current)]);
    setCourse(nextCourse);
    setShowSavedFeedback(false);
  }, []);

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, prev.length - 1));
    setCourse(previous);
    setShowSavedFeedback(false);
  }, [history]);

  const handleCourseTitleChange = useCallback(
    (newTitle: string) => {
      recordHistory({ ...courseRef.current, title: newTitle });
    },
    [recordHistory],
  );

  const handleModuleTitleChange = useCallback(
    (moduleId: string, newTitle: string) => {
      const current = courseRef.current;
      const modules = current.modules.map((mod) =>
        mod.id === moduleId ? { ...mod, title: newTitle } : mod,
      );
      recordHistory({ ...current, modules });
    },
    [recordHistory],
  );

  const handleLessonTitleChange = useCallback(
    (moduleId: string, lessonId: string, newTitle: string) => {
      const current = courseRef.current;
      const modules = current.modules.map((mod) =>
        mod.id !== moduleId
          ? mod
          : {
              ...mod,
              lessons: mod.lessons.map((les) =>
                les.id === lessonId ? { ...les, title: newTitle } : les,
              ),
            },
      );
      recordHistory({ ...current, modules });
    },
    [recordHistory],
  );

  const moveModule = useCallback(
    (fromIndex: number, toIndex: number) => {
      const current = courseRef.current;
      if (toIndex < 0 || toIndex >= current.modules.length) return;
      const reordered = [...current.modules];
      const [moved] = reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, moved);
      const modules = reordered.map((m, idx) => ({ ...m, order: idx + 1 }));
      recordHistory({ ...current, modules });
    },
    [recordHistory],
  );

  const moveLessonToModule = useCallback(
    (sourceModuleId: string, lessonId: string, targetModuleId: string) => {
      if (sourceModuleId === targetModuleId) return;
      const current = courseRef.current;

      let lessonToMove: Lesson | null = null;
      const intermediate = current.modules.map((mod) => {
        if (mod.id === sourceModuleId) {
          const found = mod.lessons.find((l) => l.id === lessonId);
          if (found) lessonToMove = { ...found, moduleId: targetModuleId };
          return { ...mod, lessons: mod.lessons.filter((l) => l.id !== lessonId) };
        }
        return mod;
      });

      if (!lessonToMove) return;
      const moved = lessonToMove;

      const modules = intermediate.map((mod) =>
        mod.id === targetModuleId ? { ...mod, lessons: [...mod.lessons, moved] } : mod,
      );
      recordHistory({ ...current, modules });
    },
    [recordHistory],
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

  const handleSaveAll = useCallback(() => {
    const saved = repository.saveCourse(courseRef.current);
    onSave(saved);
    setShowSavedFeedback(true);
    window.setTimeout(() => setShowSavedFeedback(false), 3500);
  }, [repository, onSave]);

  const handleDiscardChanges = useCallback(() => {
    setCourse(clone(initialCourse));
    setHistory([]);
    setShowSavedFeedback(false);
  }, [initialCourse]);

  return {
    course,
    historyLength: history.length,
    showSavedFeedback,
    draggedModuleIndex,
    dragOverModuleIndex,
    handleUndo,
    handleCourseTitleChange,
    handleModuleTitleChange,
    handleLessonTitleChange,
    moveModule,
    moveLessonToModule,
    handleDragStartModule,
    handleDragOverModule,
    handleDropModule,
    handleSaveAll,
    handleDiscardChanges,
  };
}
