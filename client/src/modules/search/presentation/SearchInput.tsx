import React from 'react';
import { Search, X } from 'lucide-react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

export const SearchInput: React.FC<SearchInputProps> = ({ value, onChange, onClear, inputRef }) => (
  <div style={{ position: 'relative', marginBottom: '20px' }}>
    <Search
      size={18}
      color="#64748B"
      style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }}
    />
    <input
      ref={inputRef}
      role="searchbox"
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Buscar cursos, aulas, filmes, PDFs…"
      autoComplete="off"
      aria-label="Campo de pesquisa"
      style={{
        width: '100%',
        backgroundColor: '#131A27',
        border: '1.5px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        padding: '14px 48px 14px 48px',
        fontSize: '15px',
        color: '#F0F4FC',
        outline: 'none',
        transition: 'border-color 0.15s ease',
        boxSizing: 'border-box',
      }}
      onFocus={(e) => (e.currentTarget.style.borderColor = '#A594FF')}
      onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)')}
    />
    {value && (
      <button
        aria-label="Limpar pesquisa"
        onClick={onClear}
        style={{
          position: 'absolute',
          right: '12px',
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: '#64748B',
          display: 'flex',
          alignItems: 'center',
          padding: '4px',
          borderRadius: '6px',
        }}
      >
        <X size={16} />
      </button>
    )}
  </div>
);
