import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type {
  OrganizationSuggestionRepository,
  OrganizationSuggestionStateView,
} from '@/modules/courses/domain/organization-suggestion';
import { OrganizationSuggestionProvider } from '@/modules/courses/presentation/OrganizationSuggestionProvider';
import { CourseAiOrganizer } from '@/modules/courses/presentation/CourseAiOrganizer';

const lessons = [
  { id: 'l1', title: 'Live 01-09-2023' },
  { id: 'l2', title: 'Aula 01 - Boas-vindas' },
  { id: 'l3', title: 'Aula 02 - Instalação' },
];

/** Núcleo em memória: a sugestão fica pronta na leitura seguinte ao pedido. */
function fakeRepository(initial: OrganizationSuggestionStateView) {
  let state = initial;
  const repository: OrganizationSuggestionRepository = {
    get: vi.fn(async () => state),
    request: vi.fn(async (courseId: string) => {
      state = {
        available: true,
        suggestion: {
          courseId,
          status: 'ready',
          modelId: 'qwen',
          error: null,
          modules: [
            { title: 'Lives', lessonIds: ['l1'] },
            { title: 'Introdução', lessonIds: ['l2', 'l3'] },
          ],
        },
      };
    }),
    apply: vi.fn(async () => {
      state = { available: true, suggestion: null };
    }),
    dismiss: vi.fn(async () => {
      state = { available: true, suggestion: null };
    }),
  };
  return repository;
}

function renderOrganizer(repository: OrganizationSuggestionRepository) {
  render(
    <OrganizationSuggestionProvider repository={repository}>
      <CourseAiOrganizer courseId="c1" lessons={lessons} pollMs={5} />
    </OrganizationSuggestionProvider>,
  );
}

describe('CourseAiOrganizer — Reorganizar com IA', () => {
  it('pede a sugestão e mostra os módulos propostos com as aulas de cada um', async () => {
    const user = userEvent.setup();
    const repository = fakeRepository({ available: true, suggestion: null });
    renderOrganizer(repository);

    await user.click(await screen.findByRole('button', { name: 'Reorganizar com IA' }));

    expect(repository.request).toHaveBeenCalledWith('c1');
    const proposal = await screen.findByRole('list', { name: 'Módulos sugeridos pela IA' });
    expect(proposal).toHaveTextContent('Lives');
    expect(proposal).toHaveTextContent('1 aula');
    expect(proposal).toHaveTextContent('Introdução');
    expect(proposal).toHaveTextContent('2 aulas');
    expect(proposal).toHaveTextContent('Aula 01 - Boas-vindas → Aula 02 - Instalação');
  });

  it('aplica a sugestão aprovada', async () => {
    const user = userEvent.setup();
    const repository = fakeRepository({ available: true, suggestion: null });
    renderOrganizer(repository);
    await user.click(await screen.findByRole('button', { name: 'Reorganizar com IA' }));

    await user.click(await screen.findByRole('button', { name: 'Aplicar sugestão' }));

    expect(repository.apply).toHaveBeenCalledWith('c1');
    expect(await screen.findByRole('button', { name: 'Reorganizar com IA' })).toBeEnabled();
  });

  it('descarta a sugestão sem aplicar', async () => {
    const user = userEvent.setup();
    const repository = fakeRepository({ available: true, suggestion: null });
    renderOrganizer(repository);
    await user.click(await screen.findByRole('button', { name: 'Reorganizar com IA' }));

    await user.click(await screen.findByRole('button', { name: 'Descartar' }));

    expect(repository.dismiss).toHaveBeenCalledWith('c1');
    expect(repository.apply).not.toHaveBeenCalled();
  });

  it('mostra o andamento enquanto a IA trabalha', async () => {
    renderOrganizer(
      fakeRepository({
        available: true,
        suggestion: { courseId: 'c1', status: 'running', modules: [], modelId: null, error: null },
      }),
    );

    expect(await screen.findByRole('status')).toHaveTextContent('A IA está analisando as aulas');
  });

  it('mostra a falha e permite tentar de novo', async () => {
    const user = userEvent.setup();
    const repository = fakeRepository({
      available: true,
      suggestion: {
        courseId: 'c1',
        status: 'failed',
        modules: [],
        modelId: null,
        error: 'modelo indisponível',
      },
    });
    renderOrganizer(repository);

    expect(await screen.findByRole('alert')).toHaveTextContent('modelo indisponível');
    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(repository.request).toHaveBeenCalledWith('c1');
  });

  it('mostra o motivo quando o núcleo recusa aplicar (curso mudou)', async () => {
    const user = userEvent.setup();
    const repository = fakeRepository({ available: true, suggestion: null });
    repository.apply = vi.fn(async () => {
      throw new Error('O curso mudou desde a sugestão. Peça uma nova sugestão.');
    });
    renderOrganizer(repository);
    await user.click(await screen.findByRole('button', { name: 'Reorganizar com IA' }));

    await user.click(await screen.findByRole('button', { name: 'Aplicar sugestão' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('O curso mudou');
  });

  it('explica como ligar a IA quando ela está indisponível', async () => {
    renderOrganizer(fakeRepository({ available: false, suggestion: null }));

    expect(await screen.findByRole('button', { name: 'Reorganizar com IA' })).toBeDisabled();
    expect(screen.getByText(/Ative a IA local em Configurações/)).toBeInTheDocument();
  });
});
