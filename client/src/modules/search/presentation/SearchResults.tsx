import React from 'react';
import { BookOpen, Search } from 'lucide-react';
import type { SearchResult, SearchResultKind } from '@/core/domain/library';
import { KIND_COLORS, KIND_ICONS, KIND_LABELS } from '@/modules/search/presentation/searchKinds';
import { SearchResultCard } from '@/modules/search/presentation/SearchResultCard';

interface SearchResultsProps {
  isEmpty: boolean;
  hasResults: boolean;
  grouped: [SearchResultKind, SearchResult[]][];
  onSelect: (result: SearchResult) => void;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  isEmpty,
  hasResults,
  grouped,
  onSelect,
}) => (
  <div style={{ flex: 1, overflowY: 'auto' }}>
    {isEmpty && (
      <div
        data-testid="search-empty-state"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: '60px',
          gap: '12px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            backgroundColor: '#131A27',
            border: '1px solid rgba(165, 148, 255, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '4px',
          }}
        >
          <Search size={28} color="#A594FF" strokeWidth={1.5} />
        </div>
        <p style={{ color: '#F0F4FC', fontSize: '16px', fontWeight: 600 }}>
          O que você quer encontrar?
        </p>
        <p style={{ color: '#64748B', fontSize: '13px', maxWidth: '340px', lineHeight: '1.6' }}>
          Digite o nome de um curso, aula, filme ou documento. A busca é instantânea.
        </p>
      </div>
    )}

    {!isEmpty && !hasResults && (
      <div
        data-testid="search-no-results"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: '60px',
          gap: '12px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            backgroundColor: '#131A27',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '4px',
          }}
        >
          <BookOpen size={28} color="#475569" strokeWidth={1.5} />
        </div>
        <p style={{ color: '#E2E8F0', fontSize: '15px', fontWeight: 600 }}>
          Nenhum resultado encontrado
        </p>
        <p style={{ color: '#64748B', fontSize: '13px', maxWidth: '340px' }}>
          Tente palavras diferentes ou verifique a grafia.
        </p>
      </div>
    )}

    {!isEmpty && hasResults && (
      <div
        data-testid="search-results"
        style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}
      >
        {grouped.map(([kind, items]) => (
          <section key={kind}>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}
            >
              <span style={{ color: KIND_COLORS[kind] }}>{KIND_ICONS[kind]}</span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: KIND_COLORS[kind],
                  letterSpacing: '0.8px',
                  textTransform: 'uppercase',
                }}
              >
                {KIND_LABELS[kind]}S
              </span>
              <span style={{ fontSize: '11px', color: '#475569', fontWeight: 500 }}>
                {items.length} resultado{items.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {items.map((result) => (
                <SearchResultCard
                  key={`${result.kind}-${result.itemId}-${result.lessonId ?? ''}`}
                  result={result}
                  onClick={() => onSelect(result)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    )}
  </div>
);
