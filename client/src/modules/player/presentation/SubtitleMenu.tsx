import React from 'react';
import { Check, Subtitles, Upload } from 'lucide-react';
import type { SubtitleTrack } from '@/core/domain/library';
import { IconButton } from '@/shared/ui/IconButton';

interface SubtitleMenuProps {
  subtitles: SubtitleTrack[];
  selectedSubtitleId: string | null;
  onSelect: (subtitleId: string | null) => void;
  onImport: () => void;
}

export const SubtitleMenu: React.FC<SubtitleMenuProps> = ({
  subtitles,
  selectedSubtitleId,
  onSelect,
  onImport,
}) => (
  <div
    data-testid="subtitles-floating-menu"
    style={{
      position: 'absolute',
      bottom: '72px',
      right: '110px',
      width: '240px',
      backgroundColor: '#141A28',
      border: '1px solid rgba(165, 148, 255, 0.3)',
      borderRadius: '10px',
      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6), 0 0 16px rgba(165, 148, 255, 0.15)',
      padding: '8px',
      zIndex: 100,
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
    }}
  >
    <div
      style={{
        fontSize: '11px',
        fontWeight: 700,
        color: '#A594FF',
        padding: '6px 8px',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        marginBottom: '4px',
      }}
    >
      Legendas e Áudio
    </div>

    <IconButton icon={Check} onClick={() => onSelect(null)} variant="violet">
      <span>Desativar legendas</span>
      {selectedSubtitleId === null && <Check size={14} color="#A594FF" />}
    </IconButton>

    {subtitles.map((track) => {
      const isSelected = selectedSubtitleId === track.id;
      return (
        <IconButton
          icon={Subtitles}
          key={track.id}
          onClick={() => onSelect(track.id)}
          variant={isSelected ? 'violet' : 'muted'}
        >
          <span>{track.label}</span>
          {isSelected && <Check size={14} color="#A594FF" />}
        </IconButton>
      );
    })}

    <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', margin: '4px 0' }} />

    <IconButton
      icon={Upload}
      onClick={onImport}
      variant="muted"
      onMouseEnter={(e) => {
        e.currentTarget.style.color = '#FFFFFF';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = '#94A3B8';
      }}
    >
      <Upload size={13} />
      <span>Importar arquivo .srt / .vtt</span>
    </IconButton>
  </div>
);
