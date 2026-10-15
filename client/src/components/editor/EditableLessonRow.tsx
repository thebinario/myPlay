import React from 'react';
import type { Lesson } from '../../types/library';

interface EditableLessonRowProps {
  lesson: Lesson;
  index: number;
  moduleId: string;
  modules: { id: string; title: string }[];
  onTitleChange: (moduleId: string, lessonId: string, title: string) => void;
  onMoveToModule: (sourceModuleId: string, lessonId: string, targetModuleId: string) => void;
}

export const EditableLessonRow: React.FC<EditableLessonRowProps> = ({
  lesson,
  index,
  moduleId,
  modules,
  onTitleChange,
  onMoveToModule,
}) => (
  <div
    style={{
      backgroundColor: '#121622',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      borderRadius: '8px',
      padding: '10px 14px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    }}
  >
    <span style={{ fontSize: '11px', color: '#64748B', width: '20px' }}>{index + 1}.</span>

    <input
      aria-label={`Título da aula ${lesson.title}`}
      type="text"
      value={lesson.title}
      onChange={(e) => onTitleChange(moduleId, lesson.id, e.target.value)}
      style={{
        flex: 1,
        backgroundColor: 'transparent',
        border: '1px solid transparent',
        borderRadius: '4px',
        color: '#E2E8F0',
        fontSize: '13px',
        padding: '4px 6px',
        outline: 'none',
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = '#A594FF';
        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = 'transparent';
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    />

    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <label htmlFor={`move-select-${lesson.id}`} style={{ fontSize: '11px', color: '#64748B' }}>
        Módulo:
      </label>
      <select
        id={`move-select-${lesson.id}`}
        aria-label={`Mover aula "${lesson.title}" para o módulo`}
        value={moduleId}
        onChange={(e) => onMoveToModule(moduleId, lesson.id, e.target.value)}
        style={{
          backgroundColor: '#1A2234',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          color: '#A594FF',
          fontSize: '11px',
          borderRadius: '6px',
          padding: '4px 8px',
          outline: 'none',
          cursor: 'pointer',
        }}
      >
        {modules.map((targetMod) => (
          <option key={targetMod.id} value={targetMod.id}>
            {targetMod.title}
          </option>
        ))}
      </select>
    </div>
  </div>
);
