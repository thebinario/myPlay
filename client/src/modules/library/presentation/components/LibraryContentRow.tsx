import React from 'react';
import { FileText, Play } from 'lucide-react';
import type { Document } from '@/core/domain/library';

interface LibraryContentRowProps {
  title: string;
  detail: string;
  icon: React.ReactNode;
  onClick?: () => void;
  actionLabel?: string;
}

export const LibraryContentRow: React.FC<LibraryContentRowProps> = ({
  title,
  detail,
  icon,
  onClick,
  actionLabel,
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

  if (actionLabel) {
    return (
      <div style={rowStyle}>
        {content}
        <button type="button" onClick={onClick} disabled={!onClick} style={actionStyle}>
          <Play size={14} fill="currentColor" />
          {actionLabel}
        </button>
      </div>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={!onClick} style={rowStyle}>
      {content}
    </button>
  );
};

export const LibraryDocumentRow: React.FC<{
  document: Document;
  onOpen?: (documentId: string) => void;
}> = ({ document, onOpen }) => (
  <LibraryContentRow
    title={document.title}
    detail={document.totalPages > 0 ? `${document.totalPages} páginas` : 'PDF'}
    icon={<FileText size={16} color="#A594FF" />}
    onClick={onOpen ? () => onOpen(document.id) : undefined}
  />
);

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
