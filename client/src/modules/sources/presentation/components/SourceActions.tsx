import React, { useState } from 'react';
import { PlugZap, RefreshCw, Trash2, Unplug } from 'lucide-react';
import type { LibrarySource } from '@/core/domain/library-source';
import { Button } from '@/shared/ui/components/Button';
import { SourceRemoveConfirmation } from '@/modules/sources/presentation/components/SourceRemoveConfirmation';

interface SourceActionsProps {
  source: LibrarySource;
  showDisconnectSimulation: boolean;
  onCheck(id: string): void;
  onReconnect(id: string): void;
  onDisconnect(id: string): void;
  onRemove(id: string): void;
}

export const SourceActions: React.FC<SourceActionsProps> = ({
  source,
  showDisconnectSimulation,
  onCheck,
  onReconnect,
  onDisconnect,
  onRemove,
}) => {
  const [confirming, setConfirming] = useState(false);
  const isConnected = source.status === 'connected';

  if (confirming) {
    return (
      <SourceRemoveConfirmation
        sourceId={source.id}
        name={source.name}
        onRemove={(id) => {
          onRemove(id);
          setConfirming(false);
        }}
        onCancel={() => setConfirming(false)}
      />
    );
  }

  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onCheck(source.id)}
        disabled={source.status === 'checking'}
      >
        <RefreshCw size={13} style={{ marginRight: '6px' }} aria-hidden />
        Verificar
      </Button>
      {isConnected ? (
        showDisconnectSimulation && (
          <Button variant="secondary" size="sm" onClick={() => onDisconnect(source.id)}>
            <Unplug size={13} style={{ marginRight: '6px' }} aria-hidden />
            Simular desconexão
          </Button>
        )
      ) : (
        <Button variant="secondary" size="sm" onClick={() => onReconnect(source.id)}>
          <PlugZap size={13} style={{ marginRight: '6px' }} aria-hidden />
          Reconectar
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        aria-label={`Retirar fonte ${source.name}`}
        onClick={() => setConfirming(true)}
      >
        <Trash2 size={13} style={{ marginRight: '6px' }} aria-hidden />
        Retirar
      </Button>
    </div>
  );
};
