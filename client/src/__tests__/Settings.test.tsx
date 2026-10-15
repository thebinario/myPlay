/**
 * MIDOTECA — Fase 5: tela de Configurações (versão mínima).
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import { SettingsView } from '@/features/settings/presentation/SettingsView';
import { MOCK_LIBRARY, mockLibraryService } from '@/features/library/infrastructure/mockLibraryRepository';
import type { LibraryRepository } from '@/core/ports/libraryRepository';
import { LibraryProvider } from '@/features/library/presentation/LibraryProvider';
import { MockLibraryService } from '@/features/library/infrastructure/mockLibraryRepository';

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
