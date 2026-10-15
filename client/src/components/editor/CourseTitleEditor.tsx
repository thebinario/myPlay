import React from 'react';
import { GraduationCap } from 'lucide-react';

interface CourseTitleEditorProps {
  title: string;
  onChange: (title: string) => void;
}

export const CourseTitleEditor: React.FC<CourseTitleEditorProps> = ({ title, onChange }) => (
  <div
    style={{
      backgroundColor: '#141A28',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '16px',
      padding: '24px 32px',
      marginBottom: '32px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span
        style={{
          backgroundColor: 'rgba(165, 148, 255, 0.15)',
          color: '#A594FF',
          fontSize: '11px',
          fontWeight: 600,
          padding: '3px 8px',
          borderRadius: '6px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        <GraduationCap size={13} />
        Editor de Curso
      </span>
      <span style={{ color: '#64748B', fontSize: '12px' }}>
        Edição direta no item com suporte a reordenação
      </span>
    </div>

    <div>
      <label
        htmlFor="course-title-input"
        style={{
          fontSize: '11px',
          color: '#8B949E',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        Título do Curso (Edição Inline)
      </label>
      <input
        id="course-title-input"
        type="text"
        value={title}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '8px',
          color: '#FFFFFF',
          fontSize: '22px',
          fontWeight: 700,
          padding: '8px 12px',
          marginTop: '4px',
          outline: 'none',
          transition: 'border-color 0.15s',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = '#A594FF';
          e.currentTarget.style.backgroundColor = 'rgba(165, 148, 255, 0.04)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
        }}
      />
    </div>
  </div>
);
