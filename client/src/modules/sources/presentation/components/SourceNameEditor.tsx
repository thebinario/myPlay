import React, { useState } from 'react';
import { Check, Pencil, X } from 'lucide-react';
import { Button } from '@/shared/ui/components/Button';

interface SourceNameEditorProps {
  name: string;
  onSave(name: string): Promise<void>;
}

export const SourceNameEditor: React.FC<SourceNameEditorProps> = ({ name, onSave }) => {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [error, setError] = useState('');

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalized = value.trim();
    if (!normalized) return setError('Informe um nome para a biblioteca.');
    try {
      await onSave(normalized);
      setEditing(false);
      setError('');
    } catch {
      setError('Não foi possível salvar o nome da biblioteca.');
    }
  };

  if (!editing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span>{name}</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={`Editar nome da biblioteca ${name}`}
          onClick={() => {
            setValue(name);
            setEditing(true);
          }}
        >
          <Pencil size={12} aria-hidden />
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={save} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <input
        aria-label="Nome da biblioteca"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        autoFocus
        style={{ minWidth: '120px', padding: '5px 8px', borderRadius: '6px' }}
      />
      <Button type="submit" variant="secondary" size="sm" aria-label="Salvar nome">
        <Check size={13} aria-hidden />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label="Cancelar edição do nome"
        onClick={() => {
          setEditing(false);
          setError('');
        }}
      >
        <X size={13} aria-hidden />
      </Button>
      {error && <span role="alert">{error}</span>}
    </form>
  );
};
