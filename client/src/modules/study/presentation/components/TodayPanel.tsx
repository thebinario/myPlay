import React from 'react';
import { Route } from 'lucide-react';
import { Button } from '@/shared/ui/components/Button';
import { useStudyToday } from '@/modules/study/presentation/hooks/useStudyToday';
import { DayAgenda } from './DayAgenda';
import { FocusCard } from './FocusCard';
import { SessionLog } from './SessionLog';
import { TimerBar } from './TimerBar';
import { WeekSummary } from './WeekSummary';
import { Card, ErrorNote, STUDY_THEME } from './study-ui';

interface TodayPanelProps {
  onOpenLesson: (courseId: string, lessonId: string) => void;
  onPlanSchedule: () => void;
  onCreateTrack: () => void;
}

const Notice: React.FC<React.PropsWithChildren> = ({ children }) => (
  <Card>
    <p style={{ margin: 0, color: STUDY_THEME.muted, fontSize: '14px' }}>{children}</p>
  </Card>
);

/** Aba "Hoje": abrir e já saber o que estudar, cronometrar e registrar. */
export const TodayPanel: React.FC<TodayPanelProps> = ({
  onOpenLesson,
  onPlanSchedule,
  onCreateTrack,
}) => {
  const today = useStudyToday();
  const { day, week, tracks } = today;

  if (!today.available) {
    return <Notice>O cronograma de estudos está disponível no aplicativo desktop.</Notice>;
  }
  if (!day || !week) {
    return <Notice>{today.loadError ?? 'Carregando o seu dia…'}</Notice>;
  }
  if (tracks.length === 0 && day.sessions.length === 0) {
    return (
      <Card label="Comece por aqui" style={{ textAlign: 'center', padding: '40px 24px' }}>
        <Route size={28} color={STUDY_THEME.accent} aria-hidden="true" />
        <h2 style={{ color: STUDY_THEME.strong, margin: '12px 0 6px', fontSize: '20px' }}>
          Organize o que você estuda
        </h2>
        <p
          style={{
            color: STUDY_THEME.muted,
            margin: '0 auto 20px',
            maxWidth: 460,
            fontSize: '14px',
          }}
        >
          Crie trilhas para os cursos da biblioteca e para plataformas como Hack The Box e
          HackingClub. Depois, distribua-as na semana e acompanhe o tempo de cada dia.
        </p>
        <Button onClick={onCreateTrack}>Criar primeira trilha</Button>
      </Card>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.6fr) minmax(280px, 1fr)',
        gap: '20px',
        alignItems: 'start',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
        {day.timer && (
          <TimerBar
            timer={day.timer}
            busy={today.busy}
            onStop={() => void today.stopTimer()}
            onDiscard={() => void today.discardTimer()}
          />
        )}
        <FocusCard
          day={day}
          busy={today.busy}
          onStartTimer={(trackId, activity) => void today.startTimer(trackId, activity)}
          onOpenLesson={onOpenLesson}
          onPlanSchedule={onPlanSchedule}
        />
        <ErrorNote message={today.error} />
        <DayAgenda
          day={day}
          busy={today.busy}
          onStartTimer={(trackId, activity) => void today.startTimer(trackId, activity)}
          onOpenLesson={onOpenLesson}
        />
        <SessionLog
          date={day.date}
          sessions={day.sessions}
          tracks={tracks}
          busy={today.busy}
          onLog={today.logSession}
          onDelete={(sessionId) => void today.deleteSession(sessionId)}
        />
      </div>
      <WeekSummary
        day={day}
        week={week}
        selectedDate={today.selectedDate}
        onSelectDate={today.selectDate}
      />
    </div>
  );
};
