import React, { useState } from 'react';
import { PenLine, PlayCircle, Plus, Timer, Trash2, type LucideIcon } from 'lucide-react';
import { Button } from '@/shared/ui/components/Button';
import type {
  LogSessionCommand,
  StudySessionSource,
  StudySessionView,
  StudyTrackView,
} from '@/modules/study/domain/study';
import { LogSessionForm } from './LogSessionForm';
import { ACTIVITY_LABEL, formatMinutes } from './study-format';
import { Card, CardTitle, STUDY_THEME, TrackDot } from './study-ui';

interface SessionLogProps {
  date: string;
  sessions: StudySessionView[];
  tracks: StudyTrackView[];
  busy?: boolean;
  onLog: (command: LogSessionCommand) => Promise<boolean>;
  onDelete: (sessionId: string) => void;
}

const SOURCE: Record<StudySessionSource, { label: string; icon: LucideIcon }> = {
  timer: { label: 'Cronômetro', icon: Timer },
  manual: { label: 'Manual', icon: PenLine },
  player: { label: 'Player', icon: PlayCircle },
};

/** Registros do dia (cronômetro, manual e player) e o formulário de registro manual. */
export const SessionLog: React.FC<SessionLogProps> = ({
  date,
  sessions,
  tracks,
  busy = false,
  onLog,
  onDelete,
}) => {
  const [adding, setAdding] = useState(false);
  return (
    <Card label="Registros do dia">
      <CardTitle
        aside={
          !adding && (
            <Button
              size="sm"
              variant="secondary"
              disabled={tracks.length === 0}
              onClick={() => setAdding(true)}
            >
              <Plus size={13} style={{ marginRight: 4 }} aria-hidden="true" />
              Registrar tempo
            </Button>
          )
        }
      >
        Registros do dia
      </CardTitle>

      {sessions.length === 0 && !adding && (
        <p style={{ margin: 0, color: STUDY_THEME.muted, fontSize: '13px' }}>
          Nada registrado ainda. Use o cronômetro, assista às aulas no player ou registre o tempo
          estudado em outra plataforma.
        </p>
      )}

      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {sessions.map((session) => {
          const source = SOURCE[session.source];
          const Icon = source.icon;
          return (
            <li
              key={session.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 0',
                borderTop: `1px solid ${STUDY_THEME.border}`,
              }}
            >
              <Icon size={16} color={STUDY_THEME.muted} aria-label={source.label} />
              <TrackDot color={session.track.color} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: STUDY_THEME.strong, fontSize: '13px', fontWeight: 600 }}>
                  {session.track.title}
                </div>
                <div style={{ color: STUDY_THEME.muted, fontSize: '12px' }}>
                  {[ACTIVITY_LABEL[session.activity], source.label, session.note]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              </div>
              <span style={{ color: STUDY_THEME.text, fontSize: '13px', fontWeight: 600 }}>
                {formatMinutes(Math.floor(session.durationMs / 60_000))}
              </span>
              <button
                type="button"
                disabled={busy}
                aria-label={`Excluir registro de ${session.track.title}`}
                title="Excluir registro"
                onClick={() => onDelete(session.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: STUDY_THEME.faint,
                  cursor: 'pointer',
                  padding: 4,
                }}
              >
                <Trash2 size={15} aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>

      {adding && (
        <LogSessionForm
          tracks={tracks}
          defaultDate={date}
          busy={busy}
          onSubmit={onLog}
          onCancel={() => setAdding(false)}
        />
      )}
    </Card>
  );
};
