import React from 'react';
import type { DuplicateLessonView } from '@/modules/library/domain/duplicates';
import { useDuplicateGroups } from '@/modules/library/presentation/hooks/useDuplicateGroups';

const KIND_LABEL = {
  exact: 'Cópia idêntica',
  perceptual: 'Mesmo conteúdo recodificado',
} as const;

const groupStyle: React.CSSProperties = {
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '10px',
  padding: '12px 14px',
  display: 'grid',
  gap: '8px',
};

const mutedStyle: React.CSSProperties = { color: '#64748B', fontSize: '12px', margin: 0 };

function lessonLabel(lesson: DuplicateLessonView): string {
  const state = lesson.completedAt
    ? 'assistida'
    : lesson.watchedRatio
      ? `${Math.round(lesson.watchedRatio * 100)}% assistida`
      : 'não assistida';
  return `${lesson.courseTitle} · ${lesson.lessonTitle} — ${state}`;
}

/**
 * Lista os grupos de conteúdo duplicado calculados pelo backend (hash e
 * impressão perceptual), com o progresso de cada cópia.
 */
export const DuplicateGroupsPanel: React.FC = () => {
  const { groups, status, loading, error, reload } = useDuplicateGroups();

  return (
    <section aria-labelledby="duplicates-title" style={{ display: 'grid', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 id="duplicates-title" style={{ color: '#F0F4FC', fontSize: '14px', margin: 0 }}>
          Conteúdo duplicado
        </h3>
        <button
          type="button"
          onClick={reload}
          style={{
            background: 'none',
            border: '1px solid rgba(255,255,255,0.12)',
            color: '#A594FF',
            borderRadius: '6px',
            padding: '4px 10px',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          Atualizar
        </button>
      </div>
      {status && (
        <p data-testid="duplicate-analysis-status" style={mutedStyle}>
          {`${status.analyzed} analisados · ${status.pending} na fila`}
          {status.failed > 0 ? ` · ${status.failed} com erro` : ''}
        </p>
      )}
      {error && <p style={{ ...mutedStyle, color: '#F87171' }}>{error}</p>}
      {!loading && !error && groups.length === 0 && (
        <p style={mutedStyle}>Nenhum conteúdo duplicado encontrado.</p>
      )}
      {groups.map((group) => (
        <div key={group.members[0].mediaFileId} style={groupStyle} data-testid="duplicate-group">
          <span style={{ color: '#A594FF', fontSize: '12px', fontWeight: 600 }}>
            {KIND_LABEL[group.kind]}
          </span>
          {group.members.map((member) => (
            <div key={member.mediaFileId} style={{ display: 'grid', gap: '2px' }}>
              <span style={{ color: '#F0F4FC', fontSize: '13px' }}>{member.relativePath}</span>
              {member.lessons.map((lesson) => (
                <span key={lesson.lessonId} style={mutedStyle}>
                  {lessonLabel(lesson)}
                </span>
              ))}
            </div>
          ))}
        </div>
      ))}
    </section>
  );
};
