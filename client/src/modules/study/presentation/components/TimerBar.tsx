import React from 'react';
import { Square, Timer, X } from 'lucide-react';
import { Button } from '@/shared/ui/components/Button';
import type { ActiveTimerView } from '@/modules/study/domain/study';
import { useLiveElapsed } from '@/modules/study/presentation/hooks/useLiveElapsed';
import { ACTIVITY_LABEL, formatElapsed } from './study-format';
import { Card, STUDY_THEME, TrackDot } from './study-ui';

interface TimerBarProps {
  timer: ActiveTimerView;
  busy?: boolean;
  onStop: () => void;
  onDiscard: () => void;
}

/** Cronômetro em andamento (persistido no núcleo; sobrevive a fechar o app). */
export const TimerBar: React.FC<TimerBarProps> = ({ timer, busy = false, onStop, onDiscard }) => {
  const elapsed = useLiveElapsed(timer.elapsedMs) ?? timer.elapsedMs;
  return (
    <Card
      label="Cronômetro"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        flexWrap: 'wrap',
        padding: '14px 18px',
        borderColor: `${STUDY_THEME.success}55`,
      }}
    >
      <Timer size={22} color={STUDY_THEME.success} aria-hidden="true" />
      <div style={{ flex: 1, minWidth: 160 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TrackDot color={timer.track.color} />
          <strong style={{ color: STUDY_THEME.strong, fontSize: '14px' }}>
            {timer.track.title}
          </strong>
        </div>
        <span style={{ color: STUDY_THEME.muted, fontSize: '12px' }}>
          {ACTIVITY_LABEL[timer.activity]} · cronometrando
        </span>
      </div>
      <span
        style={{
          fontVariantNumeric: 'tabular-nums',
          fontSize: '26px',
          fontWeight: 700,
          color: STUDY_THEME.strong,
        }}
      >
        {formatElapsed(elapsed)}
      </span>
      <div style={{ display: 'flex', gap: '8px' }}>
        <Button disabled={busy} onClick={onStop}>
          <Square size={13} style={{ marginRight: 6 }} aria-hidden="true" />
          Parar e salvar
        </Button>
        <Button variant="ghost" disabled={busy} onClick={onDiscard}>
          <X size={14} style={{ marginRight: 4 }} aria-hidden="true" />
          Descartar
        </Button>
      </div>
    </Card>
  );
};
