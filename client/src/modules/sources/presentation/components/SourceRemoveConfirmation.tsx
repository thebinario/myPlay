import React from 'react';
import { Button } from '@/shared/ui/components/Button';

interface SourceRemoveConfirmationProps {
  sourceId: string;
  name: string;
  onRemove(id: string): void;
  onCancel(): void;
}

export const SourceRemoveConfirmation: React.FC<SourceRemoveConfirmationProps> = ({
  sourceId,
  name,
  onRemove,
  onCancel,
}) => (
  <div
    role="alert"
    style={{
      backgroundColor: 'rgba(239, 68, 68, 0.12)',
      border: '1px solid rgba(239, 68, 68, 0.3)',
      borderRadius: '8px',
      padding: '12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
    }}
  >
    <span style={{ color: '#F8FAFC', fontSize: '13px' }}>
      Retirar “{name}” do catálogo? Nenhum arquivo físico será excluído.
    </span>
    <div style={{ display: 'flex', gap: '8px' }}>
      <Button
        variant="danger"
        size="sm"
        data-testid={`source-confirm-remove-${sourceId}`}
        onClick={() => onRemove(sourceId)}
      >
        Confirmar retirada
      </Button>
      <Button variant="secondary" size="sm" onClick={onCancel}>
        Cancelar
      </Button>
    </div>
  </div>
);
