/**
 * Reprodução do bug: no runtime desktop (Electron) não havia como abrir o
 * seletor de diretório nativo para escolher a pasta/HD da biblioteca — o painel
 * de fontes só aceitava um caminho digitado à mão e usava o runner mockado.
 *
 * Estes testes fixam o contrato esperado: quando o runtime injeta um
 * `DirectoryPicker`, o painel oferece "Procurar pasta…", abre o seletor e usa o
 * caminho escolhido; sem o seletor (browser/Storybook) o botão não aparece.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import type { DirectoryPicker } from '@/core/contracts/library-sources';
import { SourcesProvider } from '@/modules/sources/presentation/providers/SourcesProvider';
import { LibrarySourcesPanel } from '@/modules/sources/presentation/components/LibrarySourcesPanel';
import { useLibrarySources } from '@/modules/sources/presentation/hooks/useLibrarySources';
import { useImportFlow } from '@/modules/sources/presentation/hooks/useImportFlow';
import { createInMemorySourcesRepository } from '@/modules/sources/infrastructure/mock/mock-library-sources.repository';
import { IpcLibrarySourcesRepository } from '@/modules/sources/infrastructure/ipc/ipc-library-sources.repository';
import { IpcImportRunner } from '@/modules/sources/infrastructure/ipc/ipc-import-runner';
import { createFakeBridge } from '@/modules/sources/infrastructure/ipc/fake-library-sources-bridge';
import { AddSourceForm } from '@/shared/ui/components/AddSourceForm';

function Harness() {
  const viewModel = useLibrarySources();
  const importFlow = useImportFlow(false);
  return <LibrarySourcesPanel viewModel={viewModel} importFlow={importFlow} />;
}

function renderPanel(options: { picker?: DirectoryPicker } = {}) {
  const repository = createInMemorySourcesRepository([]);
  render(
    <SourcesProvider repository={repository} picker={options.picker}>
      <Harness />
    </SourcesProvider>,
  );
  return repository;
}

describe('LibrarySourcesPanel — seleção de pasta pelo SO (desktop)', () => {
  it('mostra o motivo devolvido pelo backend quando a biblioteca não é confirmada', async () => {
    const user = userEvent.setup();
    const source = {
      id: 'local-source', path: '/Volumes/Study', name: 'Study', status: 'connected' as const,
      itemCount: 0, lastScannedAt: null,
    };
    render(
      <AddSourceForm
        onAdd={() => ({ ok: true, source })}
        onAdded={() => Promise.reject(new Error('Path is not readable'))}
      />,
    );

    await user.type(screen.getByLabelText('Caminho da pasta'), '/Volumes/Study');
    await user.click(screen.getByRole('button', { name: /Adicionar pasta/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Path is not readable');
  });

  it('inicia a varredura após a confirmação do backend quando ele normaliza o caminho', async () => {
    const user = userEvent.setup();
    const source = {
      id: 'kernel-source', rootPath: '/private/var/library', displayName: 'library',
      status: 'active' as const, lastScanAt: null,
    };
    const scan = vi.fn(() => ({
      sourceId: source.id, status: 'completed' as const, discovered: 0,
      created: 0, updated: 0, moved: 0, unchanged: 0, missing: 0, errors: 0, durationMs: 0,
    }));
    const bridge = createFakeBridge({
      'sources.list': () => [source],
      'indexing.status': () => null,
      'sources.add': () => source,
      'indexing.scan': scan,
    });
    const repository = new IpcLibrarySourcesRepository(bridge);
    const runner = new IpcImportRunner(bridge);
    render(
      <SourcesProvider repository={repository} runner={runner}>
        <Harness />
      </SourcesProvider>,
    );

    await user.type(screen.getByLabelText('Caminho da pasta'), '/Volumes/Study');
    await user.click(screen.getByRole('button', { name: /Adicionar pasta/ }));

    expect(await screen.findByTestId('import-phase')).toHaveTextContent('Fonte vazia');
    expect(scan).toHaveBeenCalledWith({ sourceId: source.id });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('abre o seletor de diretório e preenche o caminho escolhido', async () => {
    const user = userEvent.setup();
    const pick = vi.fn(async () => '/Volumes/HD/Biblioteca');
    renderPanel({ picker: { pickDirectory: pick } });

    await user.click(screen.getByRole('button', { name: /Procurar pasta/ }));

    expect(pick).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Caminho da pasta')).toHaveValue('/Volumes/HD/Biblioteca');
  });

  it('adiciona ao catálogo a pasta escolhida no seletor do SO', async () => {
    const user = userEvent.setup();
    renderPanel({ picker: { pickDirectory: async () => '/Volumes/HD/Filmes' } });

    await user.click(screen.getByRole('button', { name: /Procurar pasta/ }));
    await user.click(screen.getByRole('button', { name: /Adicionar pasta/ }));

    expect(screen.getByText('/Volumes/HD/Filmes')).toBeInTheDocument();
  });

  it('inicia a varredura automaticamente depois de criar uma biblioteca', async () => {
    const user = userEvent.setup();
    renderPanel({ picker: { pickDirectory: async () => '/Volumes/HD/Cursos' } });

    await user.click(screen.getByRole('button', { name: /Procurar pasta/ }));
    await user.click(screen.getByRole('button', { name: /Adicionar pasta/ }));

    expect(await screen.findByTestId('import-phase')).toHaveTextContent('Descobrindo arquivos');
  });

  it('não mostra o botão de seleção quando o runtime não oferece o seletor', () => {
    renderPanel();

    expect(screen.queryByRole('button', { name: /Procurar pasta/ })).not.toBeInTheDocument();
  });
});
