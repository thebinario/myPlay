import React, { useState } from 'react';
import { FolderSearch } from 'lucide-react';
import type { SourcesViewModel } from '@/core/contracts/library-sources';
import type { ImportViewModel } from '@/core/contracts/import';
import { Button } from '@/shared/ui/components/Button';
import { AddSourceForm } from '@/shared/ui/components/AddSourceForm';
import { SourceCard } from '@/modules/sources/presentation/components/SourceCard';
import { ImportPanel } from '@/shared/ui/components/ImportPanel';

export interface LibrarySourcesPanelProps {
  viewModel: SourcesViewModel;
  importFlow: ImportViewModel;
}

/**
 * Gerenciamento de fontes da biblioteca. Sempre visível mostra as fontes
 * cadastradas; a importação só aparece quando solicitada (minimalismo).
 */
export const LibrarySourcesPanel: React.FC<LibrarySourcesPanelProps> = ({
  viewModel,
  importFlow,
}) => {
  const [showImport, setShowImport] = useState(false);
  const { sources } = viewModel;

  return (
    <section
      aria-label="Gerenciamento de bibliotecas"
      style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h3 style={{ color: '#F0F4FC', fontSize: '15px', fontWeight: 600, margin: '0 0 4px' }}>
            Fontes da biblioteca
          </h3>
          <p style={{ color: '#94A3B8', fontSize: '13px', margin: 0 }}>
            Gerencie pastas e HDs sem alterar os arquivos originais.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setShowImport((value) => !value)}>
          <FolderSearch size={14} style={{ marginRight: '6px' }} aria-hidden />
          {showImport ? 'Ocultar importação' : 'Importar / atualizar catálogo'}
        </Button>
      </div>

      <AddSourceForm onAdd={viewModel.addSource} />

      {sources.length === 0 ? (
        <p
          style={{
            padding: '20px',
            color: '#94A3B8',
            fontSize: '13px',
            border: '1px dashed rgba(255,255,255,0.12)',
            borderRadius: '10px',
            margin: 0,
          }}
        >
          Nenhuma fonte cadastrada. Adicione sua primeira biblioteca para começar.
        </p>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {sources.map((source) => (
            <SourceCard
              key={source.id}
              source={source}
              onCheck={viewModel.checkSource}
              onReconnect={viewModel.reconnectSource}
              onDisconnect={viewModel.disconnectSource}
              onRemove={viewModel.removeSource}
            />
          ))}
        </div>
      )}

      {showImport && <ImportPanel flow={importFlow} />}
    </section>
  );
};

LibrarySourcesPanel.displayName = 'LibrarySourcesPanel';
