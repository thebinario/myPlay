import React from 'react';
import { FileText } from 'lucide-react';
import type { Document } from '@/core/domain/library';

interface LibraryContentRowProps {
  title: string;
  detail: string;
  icon: React.ReactNode;
  onClick?: () => void;
}

export const LibraryContentRow: React.FC<LibraryContentRowProps> = ({
  title,
  detail,
  icon,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={!onClick}
    style={{
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
      cursor: onClick ? 'pointer' : 'default',
    }}
  >
    {icon}
    <span style={{ flex: 1 }}>{title}</span>
    <span style={{ color: '#64748B', fontSize: 13 }}>{detail}</span>
  </button>
);

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
