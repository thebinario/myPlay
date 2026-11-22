import { useState } from 'react';
import { Spinner } from '@/shared/ui/components/Spinner';
import type { ActivitySnapshotView } from '@/modules/activity/domain/activity';
import { ActivityList } from '@/modules/activity/presentation/ActivityList';

interface ActivityIndicatorProps {
  snapshot: ActivitySnapshotView;
}

function summary({ running, queued }: ActivitySnapshotView): string {
  const active = running === 1 ? '1 tarefa em andamento' : `${running} tarefas em andamento`;
  return queued > 0 ? `${active}, ${queued} na fila` : active;
}

/**
 * Indicador de atividade em segundo plano: ícone animado com contador; ao
 * passar o mouse (ou focar) mostra o que o núcleo está processando.
 */
export function ActivityIndicator({ snapshot }: ActivityIndicatorProps) {
  const [open, setOpen] = useState(false);
  if (snapshot.items.length === 0) return null;
  const count = snapshot.running || snapshot.queued;

  return (
    <div
      data-testid="activity-indicator"
      style={{ position: 'relative' }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={summary(snapshot)}
        aria-expanded={open}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        style={{
          position: 'relative',
          background: 'rgba(165, 148, 255, 0.12)',
          border: 'none',
          borderRadius: '10px',
          width: '40px',
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'default',
        }}
      >
        <Spinner size={20} />
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            minWidth: '16px',
            height: '16px',
            padding: '0 4px',
            boxSizing: 'border-box',
            borderRadius: '999px',
            backgroundColor: '#A594FF',
            color: '#0D111B',
            fontSize: '10px',
            fontWeight: 700,
            lineHeight: '16px',
          }}
        >
          {count}
        </span>
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Atividade em segundo plano"
          style={{
            position: 'absolute',
            left: 'calc(100% + 12px)',
            bottom: 0,
            width: '300px',
            maxHeight: '60vh',
            overflowY: 'auto',
            padding: '8px 16px',
            borderRadius: '12px',
            backgroundColor: '#161B2A',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.45)',
            zIndex: 100,
          }}
        >
          <ActivityList items={snapshot.items} />
        </div>
      )}
    </div>
  );
}
