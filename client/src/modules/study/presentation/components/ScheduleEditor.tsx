import React from 'react';
import { Save, X } from 'lucide-react';
import { Button } from '@/shared/ui/components/Button';
import type { StudyTrackView } from '@/modules/study/domain/study';
import { useScheduleDraft } from '@/modules/study/presentation/hooks/useScheduleDraft';
import { BlockForm } from './BlockForm';
import {
  ACTIVITY_LABEL,
  WEEKDAY_LONG,
  WEEKDAY_SHORT,
  WEEK_ORDER,
  formatClock,
} from './study-format';
import { Card, CardTitle, ErrorNote, STUDY_THEME, TrackDot } from './study-ui';

interface ScheduleEditorProps {
  onCreateTrack: () => void;
}

const UNKNOWN_TRACK: StudyTrackView = {
  id: '',
  title: 'Trilha arquivada',
  kind: 'other',
  courseId: null,
  sourceId: null,
  platform: null,
  url: null,
  color: '#64748B',
  archivedAt: null,
};

/** Aba "Cronograma": a semana em colunas, editada como rascunho e salva no núcleo. */
export const ScheduleEditor: React.FC<ScheduleEditorProps> = ({ onCreateTrack }) => {
  const draft = useScheduleDraft();
  const trackOf = (id: string) => draft.tracks.find((track) => track.id === id) ?? UNKNOWN_TRACK;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Card label="Semana">
        <CardTitle
          aside={
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {draft.dirty && (
                <span style={{ color: STUDY_THEME.warning, fontSize: '12px', fontWeight: 600 }}>
                  Alterações não salvas
                </span>
              )}
              {draft.saved && !draft.dirty && (
                <span style={{ color: STUDY_THEME.success, fontSize: '12px', fontWeight: 600 }}>
                  Cronograma salvo
                </span>
              )}
              <Button disabled={draft.saving} onClick={() => void draft.save()}>
                <Save size={14} style={{ marginRight: 6 }} aria-hidden="true" />
                Salvar cronograma
              </Button>
            </div>
          }
        >
          Semana de estudos
        </CardTitle>
        <ErrorNote message={draft.error} />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, minmax(120px, 1fr))',
            gap: '8px',
            marginTop: '12px',
            overflowX: 'auto',
          }}
        >
          {WEEK_ORDER.map((weekday) => {
            const blocks = draft.blocks
              .filter((block) => block.weekday === weekday)
              .sort((a, b) => a.startMinute - b.startMinute);
            return (
              <div key={weekday} aria-label={WEEKDAY_LONG[weekday]} role="group">
                <div
                  style={{
                    color: STUDY_THEME.muted,
                    fontSize: '12px',
                    fontWeight: 700,
                    marginBottom: '8px',
                  }}
                >
                  {WEEKDAY_SHORT[weekday]}
                </div>
                {blocks.length === 0 && (
                  <div style={{ color: STUDY_THEME.faint, fontSize: '12px' }}>Livre</div>
                )}
                {blocks.map((block, index) => {
                  const track = trackOf(block.trackId);
                  return (
                    <div
                      key={block.id ?? `${weekday}-${index}`}
                      style={{
                        position: 'relative',
                        marginBottom: '6px',
                        padding: '8px 26px 8px 9px',
                        borderRadius: '9px',
                        backgroundColor: `${track.color}1F`,
                        borderLeft: `3px solid ${track.color}`,
                      }}
                    >
                      <div style={{ color: STUDY_THEME.strong, fontSize: '12px', fontWeight: 600 }}>
                        {formatClock(block.startMinute)}–
                        {formatClock(block.startMinute + block.durationMinutes)}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          color: STUDY_THEME.text,
                          fontSize: '12px',
                        }}
                      >
                        <TrackDot color={track.color} size={7} />
                        {track.title}
                      </div>
                      {(block.activity || block.focus) && (
                        <div style={{ color: STUDY_THEME.muted, fontSize: '11px', marginTop: 2 }}>
                          {[block.activity && ACTIVITY_LABEL[block.activity], block.focus]
                            .filter(Boolean)
                            .join(' · ')}
                        </div>
                      )}
                      <button
                        type="button"
                        aria-label={`Remover ${track.title} de ${WEEKDAY_LONG[weekday]} às ${formatClock(block.startMinute)}`}
                        onClick={() => draft.remove(block)}
                        style={{
                          position: 'absolute',
                          top: 6,
                          right: 4,
                          background: 'none',
                          border: 'none',
                          color: STUDY_THEME.muted,
                          cursor: 'pointer',
                          padding: 2,
                        }}
                      >
                        <X size={13} aria-hidden="true" />
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </Card>

      <Card label="Adicionar bloco">
        <CardTitle>Adicionar bloco</CardTitle>
        {draft.tracks.length === 0 ? (
          <p style={{ margin: 0, color: STUDY_THEME.muted, fontSize: '13px' }}>
            Crie uma trilha antes de montar o cronograma.{' '}
            <Button size="sm" variant="secondary" onClick={onCreateTrack}>
              Criar trilha
            </Button>
          </p>
        ) : (
          <BlockForm tracks={draft.tracks} onAdd={draft.add} />
        )}
      </Card>
    </div>
  );
};
