import React, { useState } from 'react';
import { ChevronRight, WifiOff } from 'lucide-react';
import type { SearchResult } from '@/core/domain/library';
import { KIND_COLORS, KIND_ICONS, KIND_LABELS } from '@/features/search/presentation/searchKinds';

interface SearchResultCardProps {
  result: SearchResult;
  onClick: () => void;
}

export const SearchResultCard: React.FC<SearchResultCardProps> = ({ result, onClick }) => {
  const [hovered, setHovered] = useState(false);
  const color = KIND_COLORS[result.kind];

  return (
    <div
      data-testid={`result-${result.kind}-${result.itemId}`}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      role="button"
      tabIndex={0}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        backgroundColor: hovered ? '#131A27' : 'rgba(255, 255, 255, 0.02)',
        border: `1.5px solid ${hovered ? color : 'rgba(255,255,255,0.06)'}`,
        borderRadius: '10px',
        padding: '12px 16px',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
    >
      <div
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '8px',
          overflow: 'hidden',
          flexShrink: 0,
          backgroundColor: '#1A2234',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {result.coverUrl ? (
          <img
            src={result.coverUrl}
            alt={result.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <span style={{ color }}>{KIND_ICONS[result.kind]}</span>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              color,
              letterSpacing: '0.6px',
              textTransform: 'uppercase',
            }}
          >
            {KIND_LABELS[result.kind]}
          </span>
          {!result.available && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                fontSize: '10px',
                color: '#EF4444',
                fontWeight: 600,
              }}
            >
              <WifiOff size={10} />
              Indisponível
            </span>
          )}
        </div>
        <p
          style={{
            color: '#F0F4FC',
            fontSize: '14px',
            fontWeight: 600,
            margin: '0 0 3px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {result.title}
        </p>
        <p
          style={{
            color: '#64748B',
            fontSize: '12px',
            margin: 0,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {result.context}
        </p>
        {result.progressLabel && (
          <span
            style={{
              display: 'inline-block',
              marginTop: '5px',
              fontSize: '10px',
              color,
              fontWeight: 600,
              backgroundColor: `${color}18`,
              padding: '2px 8px',
              borderRadius: '4px',
            }}
          >
            {result.progressLabel}
          </span>
        )}
      </div>

      <ChevronRight size={16} color="#475569" />
    </div>
  );
};
