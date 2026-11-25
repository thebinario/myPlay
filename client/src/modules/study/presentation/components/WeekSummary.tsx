import React from 'react';
import { Flame } from 'lucide-react';
import { ProgressBar } from '@/shared/ui/components/ProgressBar';
import type { StudyDay, StudyWeek } from '@/modules/study/domain/study';
import { WEEKDAY_SHORT, formatDayOfMonth, formatMinutes } from './study-format';
import { Card, CardTitle, STUDY_THEME } from './study-ui';

interface WeekSummaryProps {
  day: StudyDay;
  week: StudyWeek;
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
}

function dayColor(metPlan: boolean | null, logged: number): string {
  if (metPlan === true) return STUDY_THEME.success;
  if (metPlan === false) return logged > 0 ? STUDY_THEME.warning : STUDY_THEME.danger;
  return logged > 0 ? STUDY_THEME.accent : 'rgba(255, 255, 255, 0.12)';
}

/** Progresso do dia, sequência e a semana (planejado × feito), como o núcleo calculou. */
export const WeekSummary: React.FC<WeekSummaryProps> = ({
  day,
  week,
  selectedDate,
  onSelectDate,
}) => (
  <Card label="Resumo da semana">
    <CardTitle
      aside={
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: week.streakDays > 0 ? STUDY_THEME.warning : STUDY_THEME.faint,
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          <Flame size={15} aria-hidden="true" />
          {week.streakDays === 1 ? '1 dia seguido' : `${week.streakDays} dias seguidos`}
        </span>
      }
    >
      {day.isToday ? 'Hoje' : 'Dia selecionado'}
    </CardTitle>

    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
      <span style={{ color: STUDY_THEME.strong, fontSize: '14px', fontWeight: 600 }}>
        {formatMinutes(day.loggedMinutes)} de {formatMinutes(day.plannedMinutes)}
      </span>
      <span style={{ color: STUDY_THEME.muted, fontSize: '13px' }}>{day.progressPercent}%</span>
    </div>
    <ProgressBar value={day.progressPercent} progressColor={STUDY_THEME.success} height="8px" />

    <div
      role="group"
      aria-label="Dias da semana"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '6px',
        marginTop: '18px',
      }}
    >
      {week.days.map((item) => {
        const selected = (selectedDate ?? (item.isToday ? item.date : null)) === item.date;
        const ratio =
          item.plannedMinutes > 0
            ? Math.min(1, item.loggedMinutes / item.plannedMinutes)
            : item.loggedMinutes > 0
              ? 1
              : 0;
        return (
          <button
            key={item.date}
            type="button"
            aria-label={`${WEEKDAY_SHORT[item.weekday]} ${formatDayOfMonth(item.date)}: ${formatMinutes(item.loggedMinutes)} de ${formatMinutes(item.plannedMinutes)}`}
            aria-pressed={selected}
            onClick={() => onSelectDate(item.isToday ? null : item.date)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 0',
              borderRadius: '10px',
              border: `1px solid ${selected ? STUDY_THEME.accent : 'transparent'}`,
              backgroundColor: item.isToday ? STUDY_THEME.cardRaised : 'transparent',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <span style={{ fontSize: '11px', color: STUDY_THEME.muted }}>
              {WEEKDAY_SHORT[item.weekday]}
            </span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: STUDY_THEME.strong }}>
              {formatDayOfMonth(item.date)}
            </span>
            <span
              aria-hidden="true"
              style={{
                width: '6px',
                height: '36px',
                borderRadius: '999px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'flex-end',
                overflow: 'hidden',
              }}
            >
              <span
                style={{
                  width: '100%',
                  height: `${Math.round(ratio * 100)}%`,
                  backgroundColor: dayColor(item.metPlan, item.loggedMinutes),
                }}
              />
            </span>
          </button>
        );
      })}
    </div>
    <p style={{ margin: '14px 0 0', color: STUDY_THEME.muted, fontSize: '12px' }}>
      Semana: {formatMinutes(week.totalLoggedMinutes)} de {formatMinutes(week.totalPlannedMinutes)}{' '}
      planejados
    </p>
    {selectedDate && (
      <button
        type="button"
        onClick={() => onSelectDate(null)}
        style={{
          marginTop: '10px',
          background: 'none',
          border: 'none',
          padding: 0,
          color: STUDY_THEME.accent,
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        Voltar para hoje
      </button>
    )}
  </Card>
);
