import { useState } from 'react';
import { Icon } from 'lucide-react';

interface SearchFieldProps {
  placeholder?: string;
  onChange: (query: string) => void;
  onClear?: () => void;
  disabled?: boolean;
}

export const SearchField = ({ 
  placeholder = 'Pesquisar cursos, aulas e documentos...', 
  onChange, 
  onClear, 
  disabled = false, 
  className 
}: SearchFieldProps) => {
  const [query, setQuery] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    onChange(value);
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
        <input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={handleChange}
          disabled={disabled}
          style={{
            width: '100%',
            padding: '8px 12px 8px 36px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            color: '#F8FAFC',
            fontSize: '13px',
            outline: 'none',
            transition: 'border-color 0.15s ease',
          }}
        />
        <Icon
          name="Search"
          size={16}
          color="#64748B"
          style={{ margin: '0 8px' }}
        />
      </div>
      {query && onClear && (
        <button
          type="button"
          onClick={onClear}
          style={{
            position: 'absolute',
            right: '8px',
            width: '20px',
            height: '20px',
            border: 'none',
            background: 'transparent',
            color: '#64748B',
            fontSize: '12px',
            cursor: 'pointer',
            padding: '4px',
            '&:hover': { color: '#FFFFFF' },
          }}
        >
          <Icon name="X" size={14} />
        </button>
      )}
    </div>
  );
};

SearchField.displayName = 'SearchField';