/**
 * MIDOTECA — gerenciamento de bibliotecas e fontes (integração de apresentação).
 * Exercita o provider local, os casos de uso e o fluxo de importação juntos.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import type { LibrarySource } from '@/core/domain/library-source';
import { SourcesProvider } from '@/modules/sources/presentation/providers/SourcesProvider';
import { LibrarySourcesPanel } from '@/modules/sources/presentation/components/LibrarySourcesPanel';
import { useLibrarySources } from '@/modules/sources/presentation/hooks/useLibrarySources';
import { useImportFlow } from '@/modules/sources/presentation/hooks/useImportFlow';
import { createInMemorySourcesRepository } from '@/modules/sources/infrastructure/mock/mock-library-sources.repository';

function makeSource(overrides: Partial<LibrarySource> = {}): LibrarySource {
  return {
    id: 'src-1',
    path: 'D:/Cursos',
    name: 'Cursos',
    status: 'connected',
    itemCount: 4,
    lastScannedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function Harness() {
  const viewModel = useLibrarySources();
  const importFlow = useImportFlow(false);
  return <LibrarySourcesPanel viewModel={viewModel} importFlow={importFlow} />;
}

function renderPanel(seed: LibrarySource[] = []) {
  const repository = createInMemorySourcesRepository(seed);
  render(
    <SourcesProvider repository={repository}>
      <Harness />
    </SourcesProvider>,
  );
  return repository;
}

describe('LibrarySourcesPanel', () => {
  it('adiciona uma fonte e a exibe no catálogo', async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.type(screen.getByLabelText('Caminho da pasta'), 'D:/Filmes');
    await user.click(screen.getByRole('button', { name: /Adicionar pasta/ }));

    expect(screen.getByText('D:/Filmes')).toBeInTheDocument();
    expect(screen.queryByText(/Nenhuma fonte cadastrada/)).not.toBeInTheDocument();
  });

  it('avisa quando a fonte informada já existe', async () => {
    const user = userEvent.setup();
    renderPanel([makeSource()]);

    const input = screen.getByLabelText('Caminho da pasta');
    await user.type(input, 'd:/cursos/');
    await user.click(screen.getByRole('button', { name: /Adicionar pasta/ }));

    expect(screen.getByRole('alert')).toHaveTextContent(/já está na biblioteca/i);
  });

  it('retira a fonte do catálogo apenas após confirmação', async () => {
    const user = userEvent.setup();
    renderPanel([makeSource()]);

    await user.click(screen.getByRole('button', { name: 'Retirar fonte Cursos' }));
    expect(screen.getByText(/Nenhum arquivo físico será excluído/)).toBeInTheDocument();

    await user.click(screen.getByTestId('source-confirm-remove-src-1'));

    expect(screen.queryByTestId('source-card-src-1')).not.toBeInTheDocument();
    expect(screen.getByText(/Nenhuma fonte cadastrada/)).toBeInTheDocument();
  });

  it('mantém a fonte desconectada no catálogo preservando o histórico', async () => {
    const user = userEvent.setup();
    renderPanel([makeSource()]);

    await user.click(screen.getByRole('button', { name: /Simular desconexão/ }));

    expect(screen.getByTestId('source-status-src-1')).toHaveTextContent('Desconectada');
    expect(screen.getByTestId('source-card-src-1')).toBeInTheDocument();
    expect(screen.getByText('4 conteúdos conhecidos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reconectar/ })).toBeInTheDocument();
  });

  it('conduz o fluxo de importação com pausa e retomada', async () => {
    const user = userEvent.setup();
    renderPanel([makeSource()]);

    await user.click(screen.getByRole('button', { name: /Importar \/ atualizar catálogo/ }));
    await user.click(screen.getByRole('button', { name: /Iniciar descoberta/ }));

    expect(screen.getByTestId('import-phase')).toHaveTextContent('Descobrindo arquivos');

    await user.click(screen.getByRole('button', { name: /Pausar/ }));
    expect(screen.getByTestId('import-phase')).toHaveTextContent('Processamento pausado');

    await user.click(screen.getByRole('button', { name: /Retomar/ }));
    expect(screen.getByTestId('import-phase')).toHaveTextContent('Descobrindo arquivos');
  });

  it('exibe estado obrigatório de fonte desconectada e permite tentar novamente', async () => {
    const user = userEvent.setup();
    renderPanel([makeSource()]);

    await user.click(screen.getByRole('button', { name: /Importar \/ atualizar catálogo/ }));
    await user.selectOptions(screen.getByLabelText('Simular condição da fonte'), 'offline');
    await user.click(screen.getByRole('button', { name: /Iniciar descoberta/ }));

    expect(screen.getByTestId('import-phase')).toHaveTextContent('Fonte desconectada');
    expect(screen.getByRole('button', { name: /Tentar novamente/ })).toBeInTheDocument();
  });
});
