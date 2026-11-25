import React, { useState } from 'react';
import { CalendarDays, Clock3, Route } from 'lucide-react';
import { ScheduleEditor } from '@/modules/study/presentation/components/ScheduleEditor';
import { TodayPanel } from '@/modules/study/presentation/components/TodayPanel';
import { TrackManager } from '@/modules/study/presentation/components/TrackManager';
import { STUDY_THEME } from '@/modules/study/presentation/components/study-ui';
import { formatDateLong, todayInput } from '@/modules/study/presentation/components/study-format';

export type StudyTab = 'today' | 'schedule' | 'tracks';

interface StudyViewProps {
  onOpenLesson: (courseId: string, lessonId: string) => void;
  initialTab?: StudyTab;
}

const TABS = [
  { id: 'today', label: 'Hoje', icon: Clock3 },
  { id: 'schedule', label: 'Cronograma', icon: CalendarDays },
  { id: 'tracks', label: 'Trilhas', icon: Route },
] as const;

/** Tela "Estudos": o que estudar agora, o cronograma da semana e as trilhas. */
export const StudyView: React.FC<StudyViewProps> = ({ onOpenLesson, initialTab = 'today' }) => {
  const [tab, setTab] = useState<StudyTab>(initialTab);

  return (
    <div style={{ padding: '32px 40px 60px', maxWidth: 1240, boxSizing: 'border-box' }}>
      <header style={{ marginBottom: '22px' }}>
        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 700, color: STUDY_THEME.strong }}>
          Estudos
        </h1>
        <p style={{ margin: '6px 0 0', color: STUDY_THEME.muted, fontSize: '14px' }}>
          {formatDateLong(todayInput())} · siga o cronograma e registre o seu tempo
        </p>
      </header>

      <nav
        aria-label="Seções de estudos"
        style={{ display: 'flex', gap: '6px', marginBottom: '22px' }}
      >
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={active}
              onClick={() => setTab(id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 16px',
                borderRadius: '10px',
                border: `1px solid ${active ? STUDY_THEME.accent : STUDY_THEME.border}`,
                backgroundColor: active ? 'rgba(165, 148, 255, 0.14)' : 'transparent',
                color: active ? STUDY_THEME.strong : STUDY_THEME.text,
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <Icon size={16} aria-hidden="true" />
              {label}
            </button>
          );
        })}
      </nav>

      {tab === 'today' && (
        <TodayPanel
          onOpenLesson={onOpenLesson}
          onPlanSchedule={() => setTab('schedule')}
          onCreateTrack={() => setTab('tracks')}
        />
      )}
      {tab === 'schedule' && <ScheduleEditor onCreateTrack={() => setTab('tracks')} />}
      {tab === 'tracks' && <TrackManager />}
    </div>
  );
};
