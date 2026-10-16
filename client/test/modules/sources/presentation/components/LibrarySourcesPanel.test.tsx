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

  it('não mostra o botão de seleção quando o runtime não oferece o seletor', () => {
    renderPanel();

    expect(screen.queryByRole('button', { name: /Procurar pasta/ })).not.toBeInTheDocument();
  });
});
