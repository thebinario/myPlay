import React from 'react';
import type { SearchFilter } from '../../types/library';
import { FILTER_TABS } from './searchKinds';

interface SearchFilterTabsProps {
  filter: SearchFilter;
  onChange: (filter: SearchFilter) => void;
}

export const SearchFilterTabs: React.FC<SearchFilterTabsProps> = ({ filter, onChange }) => (
  <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
    {FILTER_TABS.map((tab) => (
      <button
        key={tab.id}
        aria-label={tab.label}
        onClick={() => onChange(tab.id)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '6px 14px',
          borderRadius: '99px',
          border: '1.5px solid',
          borderColor: filter === tab.id ? '#A594FF' : 'rgba(255,255,255,0.08)',
          backgroundColor: filter === tab.id ? 'rgba(165, 148, 255, 0.12)' : 'transparent',
          color: filter === tab.id ? '#A594FF' : '#94A3B8',
          fontSize: '12px',
          fontWeight: filter === tab.id ? 600 : 500,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
      >
        {tab.icon}
        {tab.label}
      </button>
    ))}
  </div>
);
