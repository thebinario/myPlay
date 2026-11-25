import React, { useId, useState } from 'react';
import { Button } from '@/shared/ui/components/Button';
import type {
  LogSessionCommand,
  StudyActivity,
  StudyTrackView,
} from '@/modules/study/domain/study';
import { ACTIVITY_LABEL } from './study-format';
import { Field, fieldStyle } from './study-ui';

interface LogSessionFormProps {
  tracks: StudyTrackView[];
  defaultDate: string;
  busy?: boolean;
  onSubmit: (command: LogSessionCommand) => Promise<boolean>;
  onCancel: () => void;
}

const ACTIVITIES = Object.keys(ACTIVITY_LABEL) as StudyActivity[];

/** Registro manual: tempo estudado fora do app (Hack The Box, HackingClub, livros...). */
export const LogSessionForm: React.FC<LogSessionFormProps> = ({
  tracks,
  defaultDate,
  busy = false,
  onSubmit,
  onCancel,
}) => {
  const id = useId();
  const [trackId, setTrackId] = useState(tracks[0]?.id ?? '');
  const [date, setDate] = useState(defaultDate);
  const [hours, setHours] = useState('0');
  const [minutes, setMinutes] = useState('30');
  const [activity, setActivity] = useState<StudyActivity | ''>('');
  const [note, setNote] = useState('');
  const total = (Number(hours) || 0) * 60 + (Number(minutes) || 0);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const saved = await onSubmit({
      trackId,
      date,
      minutes: total,
      activity: activity || null,
      note: note.trim() || null,
    });
    if (saved) onCancel();
  };

  return (
    <form
      aria-label="Registrar tempo de estudo"
      onSubmit={submit}
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '12px',
        marginTop: '14px',
      }}
    >
      <Field label="Trilha" htmlFor={`${id}-track`} style={{ gridColumn: 'span 2' }}>
        <select
          id={`${id}-track`}
          value={trackId}
          onChange={(e) => setTrackId(e.target.value)}
          style={fieldStyle}
        >
          {tracks.map((track) => (
            <option key={track.id} value={track.id}>
              {track.title}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Data" htmlFor={`${id}-date`}>
        <input
          id={`${id}-date`}
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={fieldStyle}
        />
      </Field>
      <Field label="Horas" htmlFor={`${id}-hours`}>
        <input
          id={`${id}-hours`}
          type="number"
          min={0}
          max={12}
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          style={fieldStyle}
        />
      </Field>
      <Field label="Minutos" htmlFor={`${id}-minutes`}>
        <input
          id={`${id}-minutes`}
          type="number"
          min={0}
          max={59}
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          style={fieldStyle}
        />
      </Field>
      <Field label="Atividade" htmlFor={`${id}-activity`}>
        <select
          id={`${id}-activity`}
          value={activity}
          onChange={(e) => setActivity(e.target.value as StudyActivity | '')}
          style={fieldStyle}
        >
          <option value="">Automática</option>
          {ACTIVITIES.map((value) => (
            <option key={value} value={value}>
              {ACTIVITY_LABEL[value]}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Observação" htmlFor={`${id}-note`} style={{ gridColumn: '1 / -1' }}>
        <input
          id={`${id}-note`}
          value={note}
          placeholder="Ex.: máquina Easy, módulo de XSS"
          onChange={(e) => setNote(e.target.value)}
          style={fieldStyle}
        />
      </Field>
      <div
        style={{ gridColumn: '1 / -1', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}
      >
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={busy || !trackId || total <= 0}>
          Salvar registro
        </Button>
      </div>
    </form>
  );
};
