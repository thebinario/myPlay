import React from 'react';
import { ArrowDown, ArrowUp, GripVertical } from 'lucide-react';
import type { CourseModule } from '@/core/domain/library';
import { EditableLessonRow } from '@/features/courses/presentation/EditableLessonRow';

interface DraggableModuleProps {
  module: CourseModule;
  index: number;
  totalModules: number;
  allModules: { id: string; title: string }[];
  isDragTarget: boolean;
  onDragStart: (index: number) => void;
  onDragOver: (event: React.DragEvent, index: number) => void;
  onDrop: (index: number) => void;
  onModuleTitleChange: (moduleId: string, title: string) => void;
  onLessonTitleChange: (moduleId: string, lessonId: string, title: string) => void;
  onMoveModule: (fromIndex: number, toIndex: number) => void;
  onMoveLessonToModule: (sourceModuleId: string, lessonId: string, targetModuleId: string) => void;
}

export const DraggableModule: React.FC<DraggableModuleProps> = ({
  module,
  index,
  totalModules,
  allModules,
  isDragTarget,
  onDragStart,
  onDragOver,
  onDrop,
  onModuleTitleChange,
  onLessonTitleChange,
  onMoveModule,
  onMoveLessonToModule,
}) => {
  const moveButtonStyle = (disabled: boolean): React.CSSProperties => ({
    backgroundColor: 'transparent',
    border: 'none',
    color: disabled ? '#475569' : '#94A3B8',
    cursor: disabled ? 'not-allowed' : 'pointer',
    padding: '4px',
    borderRadius: '4px',
  });

  return (
    <div
      data-testid={`module-section-${module.id}`}
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={() => onDrop(index)}
      style={{
        backgroundColor: '#141A28',
        border: isDragTarget ? '2px dashed #A594FF' : '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        transition: 'all 0.18s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{ cursor: 'grab', color: '#64748B', display: 'flex', alignItems: 'center' }}
          title="Arrastar módulo"
        >
          <GripVertical size={20} />
        </div>

        <div style={{ flex: 1 }}>
          <input
            aria-label={`Título do módulo ${index + 1}`}
            type="text"
            value={module.title}
            onChange={(e) => onModuleTitleChange(module.id, e.target.value)}
            style={{
              width: '100%',
              backgroundColor: 'transparent',
              border: '1px solid transparent',
              borderRadius: '6px',
              color: '#F0F4FC',
              fontSize: '16px',
              fontWeight: 600,
              padding: '4px 8px',
              outline: 'none',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#A594FF';
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'transparent';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            onClick={() => onMoveModule(index, index - 1)}
            disabled={index === 0}
            aria-label={`Mover módulo "${module.title}" para cima`}
            title="Mover para cima"
            style={moveButtonStyle(index === 0)}
          >
            <ArrowUp size={16} />
          </button>
          <button
            onClick={() => onMoveModule(index, index + 1)}
            disabled={index === totalModules - 1}
            aria-label={`Mover módulo "${module.title}" para baixo`}
            title="Mover para baixo"
            style={moveButtonStyle(index === totalModules - 1)}
          >
            <ArrowDown size={16} />
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '32px' }}>
        {module.lessons.map((lesson, lessonIndex) => (
          <EditableLessonRow
            key={lesson.id}
            lesson={lesson}
            index={lessonIndex}
            moduleId={module.id}
            modules={allModules}
            onTitleChange={onLessonTitleChange}
            onMoveToModule={onMoveLessonToModule}
          />
        ))}
      </div>
    </div>
  );
};
