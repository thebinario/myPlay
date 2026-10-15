/**
 * MIDOTECA — Fase 5: tela de Configurações (versão mínima).
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import { SettingsView } from '../components/settings/SettingsView';
import { MOCK_LIBRARY, mockLibraryService } from '../services/mockData';
import type { LibraryRepository } from '../services/contracts';
import { LibraryProvider } from '../services/LibraryContext';
import { MockLibraryService } from '../services/mockData';

function renderSettings(repository?: LibraryRepository) {
  return render(
    <LibraryProvider repository={repository}>
      <SettingsView />
    </LibraryProvider>,
  );
}

describe('SettingsView', () => {
  beforeEach(() => mockLibraryService.resetAll());

  it('exibe contagem de itens catalogados', () => {
    const courses = MOCK_LIBRARY.filter((i) => i.type === 'course').length;
    renderSettings();
    expect(screen.getByTestId('settings-view')).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`${courses} cursos`))).toBeInTheDocument();
  });

  it('restaura os dados de exemplo ao clicar em restaurar', async () => {
    const user = userEvent.setup();
    const repository = new MockLibraryService();
    const course = repository.getItems('course')[0];
    repository.saveCourse({ ...repository.getCourseById(course.id)!, title: 'Alterado' });

    renderSettings(repository);
    await user.click(screen.getByTestId('settings-reset-library'));

    expect(screen.getByTestId('settings-reset-feedback')).toBeInTheDocument();
    expect(repository.getCourseById(course.id)?.title).toBe(course.title);
  });
});
