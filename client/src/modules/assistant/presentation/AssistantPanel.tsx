import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import type { AnswerSourceView, AssistantScope } from '@/modules/assistant/domain/assistant';
import { useAssistantSession } from '@/modules/assistant/presentation/hooks/useAssistantSession';

interface AssistantPanelProps {
  /** Pergunta inicial (ex.: o texto digitado na Pesquisa). */
  initialQuestion?: string;
  scope?: AssistantScope;
  onOpenLessonAt: (courseId: string, lessonId: string, seconds: number) => void;
  onOpenDocumentAt: (documentId: string, page: number) => void;
}

const panelStyle: React.CSSProperties = {
  background: '#141A28',
  border: '1px solid rgba(165,148,255,0.25)',
  borderRadius: '12px',
  padding: '14px 16px',
  display: 'grid',
  gap: '10px',
  marginTop: '20px',
};

const buttonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  background: 'rgba(165,148,255,0.15)',
  color: '#C4B5FD',
  border: 'none',
  borderRadius: '8px',
  padding: '6px 12px',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
  justifySelf: 'start',
};

/**
 * Pergunta à biblioteca: o núcleo recupera trechos e o modelo local responde
 * citando-os. Cada citação abre o vídeo no instante ou o PDF na página.
 */
export const AssistantPanel: React.FC<AssistantPanelProps> = ({
  initialQuestion = '',
  scope,
  onOpenLessonAt,
  onOpenDocumentAt,
}) => {
  const session = useAssistantSession(scope);
  const [question, setQuestion] = useState(initialQuestion);
  useEffect(() => setQuestion(initialQuestion), [initialQuestion]);
  if (!session.available) return null;

  const open = (source: AnswerSourceView) => {
    if (source.sourceKind === 'pdf' && source.documentId) {
      onOpenDocumentAt(source.documentId, source.page ?? 1);
    } else if (source.courseId && source.lessonId) {
      onOpenLessonAt(source.courseId, source.lessonId, Math.floor((source.startMs ?? 0) / 1000));
    }
  };

  const text = session.answer?.text ?? session.streamed;

  return (
    <section aria-label="Assistente da biblioteca" style={panelStyle}>
      <button
        type="button"
        style={buttonStyle}
        disabled={!question.trim() || session.status === 'answering'}
        onClick={() => session.ask(question)}
      >
        <Sparkles size={14} />
        Perguntar à biblioteca
      </button>
      {session.status === 'answering' && !text && (
        <p style={{ color: '#64748B', fontSize: '12px', margin: 0 }}>
          Procurando nos seus cursos e PDFs…
        </p>
      )}
      {text && (
        <p
          data-testid="assistant-answer"
          style={{ color: '#E2E8F0', fontSize: '14px', lineHeight: 1.6, margin: 0 }}
        >
          {text}
        </p>
      )}
      {session.status === 'answering' && (
        <button
          type="button"
          onClick={session.cancel}
          style={{ ...buttonStyle, background: 'none' }}
        >
          Parar
        </button>
      )}
      {session.error && (
        <p role="alert" style={{ color: '#F87171', fontSize: '12px', margin: 0 }}>
          {session.error}
        </p>
      )}
      {session.answer && session.answer.citations.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {session.answer.citations.map((source) => (
            <button
              key={source.index}
              type="button"
              onClick={() => open(source)}
              style={{
                background: '#1A2234',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#CBD5E1',
                borderRadius: '999px',
                padding: '3px 10px',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              {`[${source.index}] ${source.label}`}
            </button>
          ))}
        </div>
      )}
    </section>
  );
};
