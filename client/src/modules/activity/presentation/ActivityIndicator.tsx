import { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import type { ActivitySnapshotView } from '@/modules/activity/domain/activity';
import { ACTIVITY_KEYFRAMES, ActivityList } from '@/modules/activity/presentation/ActivityList';

interface ActivityIndicatorProps {
  snapshot: ActivitySnapshotView;
  /** Relógio de referência para "há 2 min" (fixo em testes e stories). */
  now?: number;
}

function summary({ running, queued }: ActivitySnapshotView): string {
  if (running === 0 && queued === 0) return 'Atividade';
  const active = running === 1 ? '1 tarefa em andamento' : `${running} tarefas em andamento`;
  return queued > 0 ? `Atividade: ${active}, ${queued} na fila` : `Atividade: ${active}`;
}

function heading(count: number): string {
  if (count === 0) return '';
  return count === 1 ? 'Último processo' : `Últimos ${count} processos`;
}

/** Atualiza o relógio enquanto o painel está aberto, para o "há N min" não envelhecer. */
function useClock(fixed: number | undefined, active: boolean): number {
  const [tick, setTick] = useState(() => Date.now());
  useEffect(() => {
    if (fixed !== undefined || !active) return;
    setTick(Date.now());
    const id = window.setInterval(() => setTick(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, [fixed, active]);
  return fixed ?? tick;
}

/**
 * Menu suspenso de atividade: botão redondo (gira enquanto há trabalho) que
 * abre o painel com o que o núcleo está processando e os últimos encerrados.
 */
export function ActivityIndicator({ snapshot, now }: ActivityIndicatorProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const clock = useClock(now, open);
  const rows = [...snapshot.items, ...snapshot.recent];
  const busy = snapshot.running > 0;

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      data-testid="activity-indicator"
      style={{ position: 'relative', alignSelf: 'flex-start', height: 'fit-content' }}
    >
      <style>{ACTIVITY_KEYFRAMES}</style>
      <button
        type="button"
        aria-label={summary(snapshot)}
        aria-expanded={open}
        aria-haspopup="dialog"
        title="Atividade"
        onClick={() => setOpen((value) => !value)}
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          border: 'none',
          backgroundColor: open ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.07)',
          color: busy ? '#F1F5F9' : '#CBD5E1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'background-color 0.15s ease',
        }}
      >
        <RefreshCw
          size={18}
          strokeWidth={1.75}
          style={busy ? { animation: 'midoteca-activity-spin 1.4s linear infinite' } : undefined}
        />
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Atividade"
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 8px)',
            width: '360px',
            maxHeight: '70vh',
            overflowY: 'auto',
            borderRadius: '12px',
            backgroundColor: '#121726',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.5)',
            zIndex: 100,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 16px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#F1F5F9' }}>Atividade</span>
            <span style={{ fontSize: '12px', color: '#94A3B8' }}>{heading(rows.length)}</span>
          </div>
          {rows.length > 0 ? (
            <ActivityList items={rows} now={clock} />
          ) : (
            <p style={{ margin: 0, padding: '20px 16px', fontSize: '13px', color: '#94A3B8' }}>
              Nenhum processo recente
            </p>
          )}
        </div>
      )}
    </div>
  );
}
