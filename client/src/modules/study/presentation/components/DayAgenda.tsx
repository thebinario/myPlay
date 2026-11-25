import React from 'react';
import { Play } from 'lucide-react';
import { ProgressBar } from '@/shared/ui/components/ProgressBar';
import type {
  PlannedBlockItem,
  PlannedBlockStatus,
  StudyActivity,
  StudyDay,
} from '@/modules/study/domain/study';
import { ACTIVITY_LABEL, formatClock, formatMinutes } from './study-format';
import { Card, CardTitle, STUDY_THEME, TrackDot } from './study-ui';

interface DayAgendaProps {
  day: StudyDay;
  busy?: boolean;
  onStartTimer: (trackId: string, activity: StudyActivity | null) => void;
  onOpenLesson: (courseId: string, lessonId: string) => void;
}

const STATUS: Record<PlannedBlockStatus, { label: string; color: string }> = {
  done: { label: 'Feito', color: STUDY_THEME.success },
  now: { label: 'Agora', color: STUDY_THEME.accent },
  upcoming: { label: 'A seguir', color: STUDY_THEME.muted },
  missed: { label: 'Pendente', color: STUDY_THEME.warning },
};

const iconButton: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 32,
  height: 32,
  borderRadius: '9px',
  border: `1px solid ${STUDY_THEME.border}`,
  backgroundColor: 'transparent',
  color: STUDY_THEME.strong,
  cursor: 'pointer',
  flexShrink: 0,
};

const AgendaRow: React.FC<{
  item: PlannedBlockItem;
  actionable: boolean;
  busy: boolean;
  onStart: () => void;
}> = ({ item, actionable, busy, onStart }) => {
  const status = STATUS[item.status];
  const activity = item.block.activity ? ACTIVITY_LABEL[item.block.activity] : null;
  return (
    <li
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        padding: '12px 0',
        borderTop: `1px solid ${STUDY_THEME.border}`,
      }}
    >
      <span
        style={{
          width: 92,
          flexShrink: 0,
          color: STUDY_THEME.text,
          fontSize: '13px',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {formatClock(item.block.startMinute)}–{formatClock(item.endMinute)}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TrackDot color={item.track.color} />
          <span style={{ color: STUDY_THEME.strong, fontSize: '14px', fontWeight: 600 }}>
            {item.track.title}
          </span>
          <span style={{ color: status.color, fontSize: '11px', fontWeight: 700 }}>
            {status.label}
          </span>
        </div>
        <div style={{ color: STUDY_THEME.muted, fontSize: '12px', margin: '3px 0 7px' }}>
          {[activity, item.block.focus, item.nextLesson && `Próxima: ${item.nextLesson.title}`]
            .filter(Boolean)
            .join(' · ') || formatMinutes(item.block.durationMinutes)}
        </div>
        <ProgressBar value={item.progressPercent} progressColor={item.track.color} height="4px" />
      </div>
      <span style={{ color: STUDY_THEME.muted, fontSize: '12px', width: 92, textAlign: 'right' }}>
        {formatMinutes(item.loggedMinutes)} / {formatMinutes(item.block.durationMinutes)}
      </span>
      {actionable && (
        <button
          type="button"
          disabled={busy}
          aria-label={`Estudar ${item.track.title} agora`}
          title="Estudar agora"
          onClick={onStart}
          style={iconButton}
        >
          <Play size={14} aria-hidden="true" />
        </button>
      )}
    </li>
  );
};

/** Blocos do dia com o status e o progresso que o núcleo calculou. */
export const DayAgenda: React.FC<DayAgendaProps> = ({
  day,
  busy = false,
  onStartTimer,
  onOpenLesson,
}) => (
  <Card label="Agenda do dia">
    <CardTitle>Agenda do dia</CardTitle>
    {day.blocks.length === 0 ? (
      <p style={{ margin: 0, color: STUDY_THEME.muted, fontSize: '13px' }}>
        Nenhum bloco no cronograma para este dia.
      </p>
    ) : (
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {day.blocks.map((item) => (
          <AgendaRow
            key={item.block.id}
            item={item}
            busy={busy}
            actionable={
              day.isToday && item.status !== 'done' && day.timer?.trackId !== item.track.id
            }
            onStart={() =>
              item.track.courseId && item.nextLesson
                ? onOpenLesson(item.track.courseId, item.nextLesson.lessonId)
                : onStartTimer(item.track.id, item.block.activity)
            }
          />
        ))}
      </ul>
    )}
  </Card>
);
