import React, { useState } from 'react';
import { FolderOpen, FolderPlus } from 'lucide-react';
import type { AddSourceInput, AddSourceResult } from '@/core/contracts/library-sources';
import { Button } from '@/shared/ui/components/Button';

export interface AddSourceFormProps {
  onAdd: (input: AddSourceInput) => AddSourceResult;
  /**
   * Abre o seletor de pasta do sistema operacional. Presente apenas no runtime
   * desktop; ausente em browser/Storybook (só entrada manual).
   */
  onPickDirectory?: () => Promise<string | null>;
  /** Rótulo do campo, usado para testes e leitores de tela. */
  label?: string;
  inputId?: string;
}

export const AddSourceForm: React.FC<AddSourceFormProps> = ({
  onAdd,
  onPickDirectory,
  label = 'Caminho da pasta',
  inputId = 'source-path-input',
}) => {
  const [path, setPath] = useState('');
  const [feedback, setFeedback] = useState<{ kind: 'error' | 'success'; text: string } | null>(
    null,
  );

  const pick = async () => {
    if (!onPickDirectory) return;
    const picked = await onPickDirectory();
    if (picked) setPath(picked);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const result = onAdd({ path });
    if (result.ok) {
      setPath('');
      setFeedback({ kind: 'success', text: `Fonte “${result.source.name}” adicionada.` });
      return;
    }
    setFeedback({
      kind: 'error',
      text:
        result.error === 'duplicate'
          ? 'Esta pasta já está na biblioteca.'
          : 'Informe um caminho válido.',
    });
  };

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <label htmlFor={inputId} style={{ color: '#94A3B8', fontSize: '12px' }}>
        {label}
      </label>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <input
          id={inputId}
          value={path}
          onChange={(event) => setPath(event.target.value)}
          placeholder="Ex.: F:/Biblioteca"
          style={{
            flex: '1 1 240px',
            minWidth: '180px',
            padding: '9px 12px',
            backgroundColor: '#0D111B',
            border: '1px solid #334155',
            borderRadius: '8px',
            color: '#F8FAFC',
            fontSize: '13px',
            outline: 'none',
          }}
        />
        {onPickDirectory && (
          <Button type="button" variant="secondary" size="md" onClick={pick}>
            <FolderOpen size={15} style={{ marginRight: '6px' }} aria-hidden />
            Procurar pasta
          </Button>
        )}
        <Button type="submit" variant="secondary" size="md" disabled={!path.trim()}>
          <FolderPlus size={15} style={{ marginRight: '6px' }} aria-hidden />
          Adicionar pasta
        </Button>
      </div>
      {!onPickDirectory && (
        <p style={{ color: '#64748B', fontSize: '12px', margin: 0 }}>
          Demonstração: nenhuma pasta real do computador é acessada.
        </p>
      )}
      {feedback && (
        <span
          role={feedback.kind === 'error' ? 'alert' : 'status'}
          style={{
            color: feedback.kind === 'error' ? '#F87171' : '#10B981',
            fontSize: '12px',
            fontWeight: 600,
          }}
        >
          {feedback.text}
        </span>
      )}
    </form>
  );
};

AddSourceForm.displayName = 'AddSourceForm';
