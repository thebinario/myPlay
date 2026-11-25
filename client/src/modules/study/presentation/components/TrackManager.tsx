import React from 'react';
import { Archive, ExternalLink } from 'lucide-react';
import { useStudyTracks } from '@/modules/study/presentation/hooks/useStudyTracks';
import { TrackForm } from './TrackForm';
import { TRACK_KIND_LABEL } from './study-format';
import { Card, CardTitle, ErrorNote, STUDY_THEME, TrackDot } from './study-ui';

/** Aba "Trilhas": o que você estuda (cursos, plataformas, outros). */
export const TrackManager: React.FC = () => {
  const { tracks, error, busy, save, archive } = useStudyTracks();

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(300px, 1fr)',
        gap: '20px',
        alignItems: 'start',
      }}
    >
      <Card label="Suas trilhas">
        <CardTitle>Suas trilhas</CardTitle>
        {tracks.length === 0 && (
          <p style={{ margin: 0, color: STUDY_THEME.muted, fontSize: '13px' }}>
            Nenhuma trilha ainda. Os cursos assistidos no player também viram trilhas sozinhos.
          </p>
        )}
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {tracks.map((track) => (
            <li
              key={track.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 0',
                borderTop: `1px solid ${STUDY_THEME.border}`,
              }}
            >
              <TrackDot color={track.color} size={12} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: STUDY_THEME.strong, fontSize: '14px', fontWeight: 600 }}>
                  {track.title}
                </div>
                <div style={{ color: STUDY_THEME.muted, fontSize: '12px' }}>
                  {[
                    TRACK_KIND_LABEL[track.kind],
                    track.sourceId ? 'Biblioteca inteira' : null,
                    track.platform,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              </div>
              {track.url && (
                <a
                  href={track.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Abrir ${track.platform ?? track.title}`}
                  style={{ color: STUDY_THEME.muted, display: 'inline-flex' }}
                >
                  <ExternalLink size={15} aria-hidden="true" />
                </a>
              )}
              <button
                type="button"
                disabled={busy}
                aria-label={`Arquivar ${track.title}`}
                title="Arquivar (o histórico de tempo é mantido)"
                onClick={() => void archive(track.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: STUDY_THEME.faint,
                  cursor: 'pointer',
                  padding: 4,
                }}
              >
                <Archive size={15} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      </Card>

      <Card label="Criar trilha">
        <CardTitle>Nova trilha</CardTitle>
        <TrackForm busy={busy} onSubmit={save} />
        <ErrorNote message={error} />
      </Card>
    </div>
  );
};
