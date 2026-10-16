/**
 * MIDOTECA — Configurações: a view é de apresentação e recebe seus dados por
 * props (composição feita em `app/`). O comportamento do catálogo é coberto
 * pelos testes de navegação do shell.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { SettingsView } from '@/modules/settings/presentation/views/SettingsView';

describe('SettingsView', () => {
  it('exibe o resumo do catálogo injetado', () => {
    render(<SettingsView librarySummary={{ courses: 3, movies: 1, documents: 2 }} />);
    expect(screen.getByTestId('settings-view')).toBeInTheDocument();
    expect(screen.getByText(/3 cursos/)).toBeInTheDocument();
  });

  it('delega a restauração ao callback e exibe feedback', async () => {
    const user = userEvent.setup();
    const onResetLibrary = vi.fn();
    render(<SettingsView onResetLibrary={onResetLibrary} />);

    await user.click(screen.getByTestId('settings-reset-library'));

    expect(onResetLibrary).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('settings-reset-feedback')).toBeInTheDocument();
  });

  it('renderiza o conteúdo de fontes injetado na seção de bibliotecas', () => {
    render(<SettingsView sourcesSection={<div data-testid="sources-slot" />} />);
    expect(screen.getByTestId('sources-slot')).toBeInTheDocument();
  });
});
