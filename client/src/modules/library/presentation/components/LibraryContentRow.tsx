import React from 'react';
import { CheckCircle2, Circle, FileText, Play } from 'lucide-react';
import type { Document } from '@/core/domain/library';

interface LibraryContentRowProps {
  title: string;
  detail: string;
  icon: React.ReactNode;
  onClick?: () => void;
  actionLabel?: string;
  isComplete?: boolean;
  onToggleComplete?: () => void;
}

export const LibraryContentRow: React.FC<LibraryContentRowProps> = ({
  title,
  detail,
  icon,
  onClick,
  actionLabel,
  isComplete,
  onToggleComplete,
}) => {
  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    padding: '14px 18px',
    color: '#E2E8F0',
    textAlign: 'left',
    background: 'transparent',
    border: 0,
    borderTop: '1px solid rgba(255,255,255,0.06)',
    cursor: onClick && !actionLabel ? 'pointer' : 'default',
  };
  const content = (
    <>
      {icon}
      <span style={{ flex: 1 }}>{title}</span>
      <span style={{ color: '#64748B', fontSize: 13 }}>{detail}</span>
    </>
  );

  return (
    <div style={rowStyle}>
      {onToggleComplete && (
        <button
          type="button"
          aria-label={`Marcar ${title} como ${isComplete ? 'não concluído' : 'concluído'}`}
          title={isComplete ? 'Concluído' : 'Marcar como concluído'}
          onClick={onToggleComplete}
          style={completionStyle(isComplete)}
        >
          {isComplete ? <CheckCircle2 size={18} /> : <Circle size={18} />}
        </button>
      )}
      {actionLabel ? (
        <>
          <span style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
            {content}
          </span>
          <button type="button" onClick={onClick} disabled={!onClick} style={actionStyle}>
            <Play size={14} fill="currentColor" />
            {actionLabel}
          </button>
        </>
      ) : (
        <button type="button" onClick={onClick} disabled={!onClick} style={contentButtonStyle}>
          {content}
        </button>
      )}
    </div>
  );
};

export const LibraryDocumentRow: React.FC<{
  document: Document;
  onOpen?: (documentId: string) => void;
  onToggleRead?: (documentId: string) => void;
}> = ({ document, onOpen, onToggleRead }) => (
  <LibraryContentRow
    title={document.title}
    detail={document.totalPages > 0 ? `${document.totalPages} páginas` : 'PDF'}
    icon={<FileText size={16} color="#A594FF" />}
    onClick={onOpen ? () => onOpen(document.id) : undefined}
    isComplete={document.isRead ?? !!document.readingState?.completedAt}
    onToggleComplete={onToggleRead ? () => onToggleRead(document.id) : undefined}
  />
);

const completionStyle = (isComplete?: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 4,
  border: 0,
  borderRadius: '50%',
  background: 'transparent',
  color: isComplete ? '#10B981' : '#64748B',
  cursor: 'pointer',
});

const contentButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  flex: 1,
  minWidth: 0,
  padding: 0,
  color: 'inherit',
  textAlign: 'left',
  background: 'transparent',
  border: 0,
  cursor: 'pointer',
};

const actionStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '7px 12px',
  color: '#A594FF',
  background: 'rgba(165,148,255,0.12)',
  border: 0,
  borderRadius: 7,
  fontWeight: 600,
  cursor: 'pointer',
};
