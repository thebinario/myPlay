import React from 'react';
import type { Course } from '@/core/domain/library';
import { useCourseEditor } from '@/modules/courses/presentation/hooks/useCourseEditor';
import { EditorActions } from '@/modules/courses/presentation/EditorActions';
import { CourseTitleEditor } from '@/modules/courses/presentation/CourseTitleEditor';
import { DraggableModule } from '@/modules/courses/presentation/DraggableModule';

interface CourseEditorViewProps {
  initialCourse: Course;
  onSave: (course: Course) => void;
  onBack: () => void;
}

export const CourseEditorView: React.FC<CourseEditorViewProps> = ({
  initialCourse,
  onSave,
  onBack,
}) => {
  const editor = useCourseEditor(initialCourse, onSave);
  const { course } = editor;
  const allModules = course.modules.map((m) => ({ id: m.id, title: m.title }));

  return (
    <div style={{ padding: '32px 40px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      <EditorActions
        historyLength={editor.historyLength}
        showSavedFeedback={editor.showSavedFeedback}
        onBack={onBack}
        onUndo={editor.handleUndo}
        onDiscard={editor.handleDiscardChanges}
        onSave={editor.handleSaveAll}
      />

      <CourseTitleEditor title={course.title} onChange={editor.handleCourseTitleChange} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF' }}>
            Estrutura de Módulos e Aulas
          </h2>
          <span style={{ fontSize: '12px', color: '#8B949E' }}>
            Arraste pelas alças ou use os botões para reordenar
          </span>
        </div>

        {course.modules.map((mod, modIdx) => (
          <DraggableModule
            key={mod.id}
            module={mod}
            index={modIdx}
            totalModules={course.modules.length}
            allModules={allModules}
            isDragTarget={
              editor.dragOverModuleIndex === modIdx && editor.draggedModuleIndex !== modIdx
            }
            onDragStart={editor.handleDragStartModule}
            onDragOver={editor.handleDragOverModule}
            onDrop={editor.handleDropModule}
            onModuleTitleChange={editor.handleModuleTitleChange}
            onLessonTitleChange={editor.handleLessonTitleChange}
            onMoveModule={editor.moveModule}
            onMoveLessonToModule={editor.moveLessonToModule}
          />
        ))}
      </div>
    </div>
  );
};
