import React, { useId, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/shared/ui/components/Button';
import type { BlockDraft, StudyActivity, StudyTrackView } from '@/modules/study/domain/study';
import { ACTIVITY_LABEL, WEEKDAY_SHORT, WEEK_ORDER, parseClock } from './study-format';
import { Chip, Field, fieldStyle } from './study-ui';

interface BlockFormProps {
  tracks: StudyTrackView[];
  onAdd: (blocks: BlockDraft[]) => void;
}

const ACTIVITIES = Object.keys(ACTIVITY_LABEL) as StudyActivity[];
const WEEK_POSITION: readonly number[] = WEEK_ORDER;

/** Novo bloco do cronograma, repetido nos dias marcados. Validação final no núcleo. */
export const BlockForm: React.FC<BlockFormProps> = ({ tracks, onAdd }) => {
  const id = useId();
  const [trackId, setTrackId] = useState(tracks[0]?.id ?? '');
  const [days, setDays] = useState<number[]>([]);
  const [start, setStart] = useState('19:00');
  const [duration, setDuration] = useState('60');
  const [activity, setActivity] = useState<StudyActivity | ''>('');
  const [focus, setFocus] = useState('');
  const selectedTrack = trackId || tracks[0]?.id || '';
  const startMinute = parseClock(start);
  const durationMinutes = Number(duration);
  const ready = !!selectedTrack && days.length > 0 && startMinute !== null && durationMinutes > 0;

  const toggleDay = (weekday: number) =>
    setDays((current) =>
      current.includes(weekday) ? current.filter((day) => day !== weekday) : [...current, weekday],
    );

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!ready || startMinute === null) return;
    onAdd(
      [...days]
        .sort((a, b) => WEEK_POSITION.indexOf(a) - WEEK_POSITION.indexOf(b))
        .map((weekday) => ({
          trackId: selectedTrack,
          weekday,
          startMinute,
          durationMinutes,
          activity: activity || null,
          focus: focus.trim() || null,
        })),
    );
    setDays([]);
    setFocus('');
  };

  return (
    <form
      aria-label="Novo bloco"
      onSubmit={submit}
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '12px',
      }}
    >
      <Field label="Trilha" htmlFor={`${id}-track`} style={{ gridColumn: 'span 2' }}>
        <select
          id={`${id}-track`}
          value={selectedTrack}
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
      <Field label="Início" htmlFor={`${id}-start`}>
        <input
          id={`${id}-start`}
          type="time"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          style={fieldStyle}
        />
      </Field>
      <Field label="Duração (min)" htmlFor={`${id}-duration`}>
        <input
          id={`${id}-duration`}
          type="number"
          min={5}
          max={720}
          step={5}
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
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
          <option value="">Qualquer</option>
          {ACTIVITIES.map((value) => (
            <option key={value} value={value}>
              {ACTIVITY_LABEL[value]}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Foco" htmlFor={`${id}-focus`} style={{ gridColumn: 'span 2' }}>
        <input
          id={`${id}-focus`}
          value={focus}
          placeholder="Ex.: 1 máquina Easy, módulo 3"
          onChange={(e) => setFocus(e.target.value)}
          style={fieldStyle}
        />
      </Field>
      <div
        role="group"
        aria-label="Dias"
        style={{ gridColumn: '1 / -1', display: 'flex', gap: '6px', flexWrap: 'wrap' }}
      >
        {WEEK_ORDER.map((weekday) => (
          <Chip
            key={weekday}
            label={WEEKDAY_SHORT[weekday]}
            pressed={days.includes(weekday)}
            onClick={() => toggleDay(weekday)}
          />
        ))}
      </div>
      <div style={{ gridColumn: '1 / -1' }}>
        <Button type="submit" variant="secondary" disabled={!ready}>
          <Plus size={14} style={{ marginRight: 6 }} aria-hidden="true" />
          Adicionar ao cronograma
        </Button>
      </div>
    </form>
  );
};
