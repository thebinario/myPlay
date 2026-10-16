import { FileText } from 'lucide-react';
import type { Document } from '@/core/domain/library';

interface EditableDocumentRowProps {
  document: Document;
  index: number;
  onTitleChange: (documentId: string, title: string) => void;
}

export function EditableDocumentRow({ document, index, onTitleChange }: EditableDocumentRowProps) {
  return (
    <div
      aria-label={`PDF ${document.title}`}
      style={{
        backgroundColor: '#121622',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '8px',
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        color: '#E2E8F0',
        fontSize: '13px',
      }}
    >
      <span style={{ fontSize: '11px', color: '#64748B', width: '20px' }}>{index + 1}.</span>
      <FileText size={15} color="#A594FF" />
      <input
        aria-label={`Título do PDF ${document.title}`}
        value={document.title}
        onChange={(event) => onTitleChange(document.id, event.target.value)}
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
      />
      <span style={{ marginLeft: 'auto', color: '#64748B', fontSize: '11px' }}>PDF</span>
    </div>
  );
}
