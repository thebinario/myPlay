import React from 'react';
import { CalendarPlus, ExternalLink, Play, PartyPopper } from 'lucide-react';
import { Button } from '@/shared/ui/components/Button';
import type {
  PlannedBlockItem,
  StudyActivity,
  StudyDay,
  StudyFocusKind,
} from '@/modules/study/domain/study';
import { ACTIVITY_LABEL, formatClock, formatMinutes } from './study-format';
import { Card, STUDY_THEME, TrackDot } from './study-ui';

interface FocusCardProps {
  day: StudyDay;
  busy?: boolean;
  onStartTimer: (trackId: string, activity: StudyActivity | null) => void;
  onOpenLesson: (courseId: string, lessonId: string) => void;
  onPlanSchedule: () => void;
}

const BADGE: Record<StudyFocusKind, { label: string; color: string }> = {
  now: { label: 'Agora', color: STUDY_THEME.success },
  'catch-up': { label: 'Recuperar', color: STUDY_THEME.warning },
  next: { label: 'Próximo', color: STUDY_THEME.accent },
  done: { label: 'Tudo feito', color: STUDY_THEME.success },
  free: { label: 'Livre', color: STUDY_THEME.muted },
};

function whenText(kind: StudyFocusKind, item: PlannedBlockItem, startsIn: number | null): string {
  const range = `${formatClock(item.block.startMinute)}–${formatClock(item.endMinute)}`;
  const remaining = `faltam ${formatMinutes(item.remainingMinutes)}`;
  if (kind === 'catch-up') return `Ficou pendente das ${range} · ${remaining}`;
  if (kind === 'next') {
    const soon = startsIn !== null ? ` · começa em ${formatMinutes(startsIn)}` : '';
    return `às ${formatClock(item.block.startMinute)}${soon}`;
  }
  return `${range} · ${remaining}`;
}

const Message: React.FC<{ title: string; text: string; action?: React.ReactNode }> = ({
  title,
  text,
  action,
}) => (
  <div>
    <h2 style={{ margin: '10px 0 6px', fontSize: '24px', color: STUDY_THEME.strong }}>{title}</h2>
    <p style={{ margin: 0, color: STUDY_THEME.muted, fontSize: '14px' }}>{text}</p>
    {action && <div style={{ marginTop: '18px' }}>{action}</div>}
  </div>
);

/** Resposta única para "o que estudar agora", decidida pelo núcleo (`day.focus`). */
export const FocusCard: React.FC<FocusCardProps> = ({
  day,
  busy = false,
  onStartTimer,
  onOpenLesson,
  onPlanSchedule,
}) => {
  const focus = day.focus;
  if (!focus) return null;
  const badge = BADGE[focus.kind];
  const item = day.blocks.find((block) => block.block.id === focus.blockId) ?? null;
  const timerOnTrack = !!item && day.timer?.trackId === item.track.id;
  const activity = item?.block.activity ?? null;

  return (
    <Card
      label="O que estudar agora"
      style={{
        borderLeft: `4px solid ${item?.track.color ?? badge.color}`,
        background: `linear-gradient(135deg, ${(item?.track.color ?? badge.color) + '1F'}, ${STUDY_THEME.card} 60%)`,
      }}
    >
      <span
        style={{
          fontSize: '12px',
          fontWeight: 700,
          letterSpacing: '0.6px',
          textTransform: 'uppercase',
          color: badge.color,
        }}
      >
        {badge.label}
      </span>

      {focus.kind === 'done' && (
        <Message
          title="Meta de hoje cumprida"
          text="Tudo o que estava no cronograma foi feito. Estudo extra também fica registrado."
          action={<PartyPopper size={22} color={STUDY_THEME.success} aria-hidden="true" />}
        />
      )}
      {focus.kind === 'free' && (
        <Message
          title="Nada planejado para hoje"
          text="Monte o cronograma da semana para saber sempre o que estudar."
          action={
            <Button onClick={onPlanSchedule}>
              <CalendarPlus size={16} style={{ marginRight: 8 }} aria-hidden="true" />
              Montar cronograma
            </Button>
          }
        />
      )}

      {item && (
        <div>
          <h2
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              margin: '10px 0 6px',
              fontSize: '24px',
              color: STUDY_THEME.strong,
            }}
          >
            <TrackDot color={item.track.color} size={12} />
            <span>{item.track.title}</span>
          </h2>
          <p style={{ margin: 0, color: STUDY_THEME.text, fontSize: '14px' }}>
            {activity ? `${ACTIVITY_LABEL[activity]} · ` : ''}
            {whenText(focus.kind, item, focus.startsInMinutes)}
          </p>
          {item.block.focus && (
            <p style={{ margin: '8px 0 0', color: STUDY_THEME.strong, fontSize: '14px' }}>
              {item.block.focus}
            </p>
          )}
          {item.nextLesson && (
            <p style={{ margin: '8px 0 0', color: STUDY_THEME.muted, fontSize: '13px' }}>
              Próxima aula: {item.nextLesson.moduleTitle} · {item.nextLesson.title}
            </p>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '18px' }}>
            {item.track.courseId && item.nextLesson ? (
              <Button onClick={() => onOpenLesson(item.track.courseId!, item.nextLesson!.lessonId)}>
                <Play size={15} style={{ marginRight: 8 }} aria-hidden="true" />
                Continuar: {item.nextLesson.title}
              </Button>
            ) : timerOnTrack ? (
              <span style={{ color: STUDY_THEME.success, fontSize: '13px', fontWeight: 600 }}>
                Cronômetro em andamento
              </span>
            ) : (
              <Button disabled={busy} onClick={() => onStartTimer(item.track.id, activity)}>
                <Play size={15} style={{ marginRight: 8 }} aria-hidden="true" />
                {focus.kind === 'next' ? 'Adiantar agora' : 'Iniciar cronômetro'}
              </Button>
            )}
            {item.track.url && (
              <a
                href={item.track.url}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: `1px solid ${STUDY_THEME.border}`,
                  color: STUDY_THEME.strong,
                  fontSize: '13px',
                  textDecoration: 'none',
                }}
              >
                <ExternalLink size={14} aria-hidden="true" />
                Abrir {item.track.platform ?? item.track.title}
              </a>
            )}
          </div>
          {item.track.courseId && (
            <p style={{ margin: '12px 0 0', color: STUDY_THEME.faint, fontSize: '12px' }}>
              O tempo assistido no player entra sozinho no registro do dia.
            </p>
          )}
        </div>
      )}
    </Card>
  );
};
