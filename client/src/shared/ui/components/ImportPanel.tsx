import React from 'react';
import { Play, Pause, RotateCcw, RefreshCw } from 'lucide-react';
import type { ImportViewModel } from '@/core/contracts/import';
import type { ImportScenario } from '@/core/domain/library-source';
import { IMPORT_PHASE_LABEL } from '@/core/domain/library-source';
import { ProgressBar } from '@/shared/ui/components/ProgressBar';
import { Button } from '@/shared/ui/components/Button';

const SCENARIOS: { id: ImportScenario; label: string }[] = [
  { id: 'normal', label: 'Conteúdos encontrados' },
  { id: 'empty', label: 'Fonte vazia' },
  { id: 'offline', label: 'Fonte desconectada' },
  { id: 'denied', label: 'Permissão negada' },
  { id: 'error', label: 'Erro recuperável' },
];

const ERROR_PHASES = ['disconnected', 'denied', 'error'];

export interface ImportPanelProps {
  flow: ImportViewModel;
  /** Exibe o seletor de cenário (demonstração). */
  showScenario?: boolean;
}

export const ImportPanel: React.FC<ImportPanelProps> = ({ flow, showScenario = true }) => {
  const { state, isSimulated } = flow;
  const isError = ERROR_PHASES.includes(state.phase);
  const isRunning = state.phase === 'scanning';
  const isPaused = state.phase === 'paused';
  const isTerminal = state.phase === 'done' || state.phase === 'empty';

  return (
    <section
      data-testid="import-panel"
      aria-label="Fluxo de importação e descoberta"
      style={{
        backgroundColor: '#131A27',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
      >
        <span style={{ color: '#F0F4FC', fontSize: '14px', fontWeight: 600 }}>
          Importação e descoberta
        </span>
        <span
          data-testid="import-phase"
          aria-live="polite"
          style={{ color: isError ? '#F87171' : '#A594FF', fontSize: '12px', fontWeight: 600 }}
        >
          {IMPORT_PHASE_LABEL[state.phase]}
        </span>
      </div>

      {state.phase !== 'idle' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <ProgressBar value={state.progress} height="6px" />
          <span style={{ color: '#94A3B8', fontSize: '12px' }}>
            {state.discovered.length} conteúdo(s) descoberto(s) · {state.progress}%
          </span>
        </div>
      )}

      {state.message && (
        <p
          role={isError ? 'alert' : 'status'}
          style={{
            margin: 0,
            color: isError ? '#F87171' : '#94A3B8',
            fontSize: '13px',
          }}
        >
          {state.message}
        </p>
      )}

      {state.phase === 'idle' && (
        <p style={{ margin: 0, color: '#94A3B8', fontSize: '13px' }}>
          A descoberta acontece em segundo plano. Você pode continuar usando o aplicativo.
        </p>
      )}

      {state.discovered.length > 0 && (
        <ul
          aria-label="Conteúdos descobertos"
          style={{
            margin: 0,
            paddingLeft: '18px',
            color: '#94A3B8',
            fontSize: '12px',
            display: 'grid',
            gap: '2px',
          }}
        >
          {state.discovered.slice(-6).map((item) => (
            <li key={item.id}>{item.title}</li>
          ))}
        </ul>
      )}

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {state.phase === 'idle' && (
          <Button variant="secondary" size="sm" onClick={flow.start}>
            <Play size={13} style={{ marginRight: '6px' }} aria-hidden />
            Iniciar descoberta
          </Button>
        )}
        {isRunning && isSimulated && (
          <Button variant="secondary" size="sm" onClick={flow.pause}>
            <Pause size={13} style={{ marginRight: '6px' }} aria-hidden />
            Pausar
          </Button>
        )}
        {isPaused && (
          <Button variant="secondary" size="sm" onClick={flow.resume}>
            <Play size={13} style={{ marginRight: '6px' }} aria-hidden />
            Retomar
          </Button>
        )}
        {isError && (
          <Button variant="secondary" size="sm" onClick={flow.retry}>
            <RefreshCw size={13} style={{ marginRight: '6px' }} aria-hidden />
            Tentar novamente
          </Button>
        )}
        {(isTerminal || isError) && (
          <Button variant="ghost" size="sm" onClick={flow.reset}>
            <RotateCcw size={13} style={{ marginRight: '6px' }} aria-hidden />
            Nova análise
          </Button>
        )}
      </div>

      {showScenario && isSimulated && (
        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '320px' }}>
          <span style={{ color: '#64748B', fontSize: '11px' }}>
            Simular condição (demonstração)
          </span>
          <select
            aria-label="Simular condição da fonte"
            value={state.scenario}
            onChange={(event) => flow.setScenario(event.target.value as ImportScenario)}
            style={{
              padding: '8px 10px',
              backgroundColor: '#0D111B',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: '#F8FAFC',
              fontSize: '12px',
            }}
          >
            {SCENARIOS.map((scenario) => (
              <option key={scenario.id} value={scenario.id}>
                {scenario.label}
              </option>
            ))}
          </select>
        </label>
      )}
    </section>
  );
};

ImportPanel.displayName = 'ImportPanel';
