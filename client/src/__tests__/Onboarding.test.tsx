/**
 * MIDOTECA — primeiro acesso: gate no shell e controles de demonstração ocultos no desktop.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import App from '@/app/App';
import { ONBOARDING_STORAGE_KEY } from '@/modules/onboarding/infrastructure/onboarding-storage';

describe('MIDOTECA — primeiro acesso', () => {
  it('abre o onboarding quando o primeiro acesso ainda não foi concluído', () => {
    localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    render(<App />);

    expect(screen.getByTestId('onboarding-view')).toBeInTheDocument();
    expect(screen.getByText(/Bem-vindo à Midoteca/)).toBeInTheDocument();
  });

  it('não bloqueia: pular registra a conclusão e libera a biblioteca', async () => {
    const user = userEvent.setup();
    localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Configurar depois' }));

    expect(screen.queryByTestId('onboarding-view')).not.toBeInTheDocument();
    expect(localStorage.getItem(ONBOARDING_STORAGE_KEY)).toBe('complete');
  });

  it('não expõe o atalho de demonstração no runtime desktop', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByLabelText('Configurações'));
    expect(screen.getByTestId('settings-view')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Abrir primeiro acesso/ })).not.toBeInTheDocument();
  });
});
