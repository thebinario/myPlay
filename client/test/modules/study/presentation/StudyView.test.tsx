import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { StudyProvider } from '@/modules/study/presentation/providers/StudyProvider';
import { StudyView } from '@/modules/study/presentation/views/StudyView';
import {
  createFakeStudyRepository,
  dayVariants,
  libraryTrack,
  sampleTracks,
  sampleWeek,
} from '@/modules/study/presentation/stories/study-fixtures';
import type { StudyDay } from '@/modules/study/domain/study';

function renderView(state: Parameters<typeof createFakeStudyRepository>[0] = {}) {
  const repository = createFakeStudyRepository(state);
  const onOpenLesson = vi.fn();
  render(
    <StudyProvider repository={repository}>
      <StudyView onOpenLesson={onOpenLesson} />
    </StudyProvider>,
  );
  return { repository, onOpenLesson };
}

const focusCard = () => screen.findByRole('region', { name: 'O que estudar agora' });

describe('study/presentation — StudyView (Hoje)', () => {
  it('mostra o foco atual decidido pelo núcleo e inicia o cronômetro com a atividade do bloco', async () => {
    const { repository } = renderView({ day: dayVariants.now });
    const card = await focusCard();
    expect(within(card).getByText('Agora')).toBeInTheDocument();
    expect(within(card).getByText('Hack The Box — Labs')).toBeInTheDocument();
    expect(within(card).getByText(/faltam 1h/)).toBeInTheDocument();
    expect(within(card).getByText('Máquina Easy da semana')).toBeInTheDocument();
    expect(within(card).getByRole('link', { name: /Abrir Hack The Box/ })).toHaveAttribute(
      'href',
      'https://app.hackthebox.com',
    );

    fireEvent.click(within(card).getByRole('button', { name: 'Iniciar cronômetro' }));
    await waitFor(() => expect(repository.calls.startTimer).toEqual([['htb', 'lab']]));
  });

  it('num bloco de curso, continua da próxima aula no player', async () => {
    const { onOpenLesson } = renderView({ day: dayVariants.catchUp });
    const card = await focusCard();
    expect(within(card).getByText('Recuperar')).toBeInTheDocument();
    fireEvent.click(within(card).getByRole('button', { name: /Continuar: Aula 2/ }));
    expect(onOpenLesson).toHaveBeenCalledWith('course-web', 'l2');
  });

  it('numa trilha de biblioteca inteira, continua do curso atual dela', async () => {
    const day = dayVariants.catchUp;
    const { onOpenLesson } = renderView({
      day: {
        ...day,
        blocks: day.blocks.map((item, index) =>
          index === 0
            ? {
                ...item,
                track: libraryTrack,
                nextLesson: {
                  courseId: 'course-android',
                  courseTitle: 'Android Hacking',
                  lessonId: 'la3',
                  title: 'Aula 3 — Root',
                  moduleTitle: 'Módulo 2',
                },
              }
            : item,
        ),
      },
    });
    const card = await focusCard();
    expect(
      within(card).getByText(/Android Hacking · Módulo 2 · Aula 3 — Root/),
    ).toBeInTheDocument();
    fireEvent.click(within(card).getByRole('button', { name: /Continuar: Aula 3/ }));
    expect(onOpenLesson).toHaveBeenCalledWith('course-android', 'la3');
  });

  it('com tudo em dia, mostra o próximo bloco e permite adiantar', async () => {
    const { repository } = renderView({ day: dayVariants.next });
    const card = await focusCard();
    expect(within(card).getByText(/às 19:00/)).toBeInTheDocument();
    fireEvent.click(within(card).getByRole('button', { name: 'Adiantar agora' }));
    await waitFor(() => expect(repository.calls.startTimer).toEqual([['htb', 'lab']]));
  });

  it('dia concluído e dia livre', async () => {
    renderView({ day: dayVariants.done });
    expect(await screen.findByText('Meta de hoje cumprida')).toBeInTheDocument();
  });

  it('sem nada planejado, leva ao editor do cronograma', async () => {
    renderView({ day: dayVariants.free });
    fireEvent.click(await screen.findByRole('button', { name: 'Montar cronograma' }));
    expect(await screen.findByRole('button', { name: 'Salvar cronograma' })).toBeInTheDocument();
  });

  it('sem trilhas, convida a criar a primeira', async () => {
    renderView({ day: dayVariants.free, tracks: [] });
    fireEvent.click(await screen.findByRole('button', { name: 'Criar primeira trilha' }));
    expect(await screen.findByRole('button', { name: 'Criar trilha' })).toBeInTheDocument();
  });

  it('cronômetro em andamento: parar salva, descartar não registra', async () => {
    const { repository } = renderView({ day: dayVariants.withTimer });
    const timer = await screen.findByRole('region', { name: 'Cronômetro' });
    expect(within(timer).getByText('25:12')).toBeInTheDocument();
    fireEvent.click(within(timer).getByRole('button', { name: 'Parar e salvar' }));
    await waitFor(() => expect(repository.calls.stopTimer).toEqual([undefined]));
    const discard = within(timer).getByRole('button', { name: 'Descartar' });
    await waitFor(() => expect(discard).toBeEnabled());
    fireEvent.click(discard);
    await waitFor(() => expect(repository.calls.stopTimer).toEqual([undefined, { discard: true }]));
  });

  it('mostra o progresso do dia e a sequência de dias', async () => {
    renderView({ day: dayVariants.now, week: sampleWeek({ streakDays: 4 }) });
    expect(await screen.findByText('1h 30min de 2h 30min')).toBeInTheDocument();
    expect(screen.getByText('4 dias seguidos')).toBeInTheDocument();
  });

  it('registra tempo manual (ex.: aula na HackingClub) e mostra o erro do núcleo', async () => {
    const { repository } = renderView({
      day: dayVariants.now,
      failWith: 'O total do dia passaria de 24 h',
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Registrar tempo' }));
    const form = screen.getByRole('form', { name: 'Registrar tempo de estudo' });
    fireEvent.change(within(form).getByLabelText('Trilha'), { target: { value: 'club' } });
    fireEvent.change(within(form).getByLabelText('Data'), { target: { value: '2026-11-24' } });
    fireEvent.change(within(form).getByLabelText('Horas'), { target: { value: '1' } });
    fireEvent.change(within(form).getByLabelText('Minutos'), { target: { value: '15' } });
    fireEvent.change(within(form).getByLabelText('Atividade'), { target: { value: 'lesson' } });
    fireEvent.change(within(form).getByLabelText('Observação'), {
      target: { value: 'Módulo XSS' },
    });
    fireEvent.click(within(form).getByRole('button', { name: 'Salvar registro' }));

    await waitFor(() =>
      expect(repository.calls.logSession).toEqual([
        {
          trackId: 'club',
          date: '2026-11-24',
          minutes: 75,
          activity: 'lesson',
          note: 'Módulo XSS',
        },
      ]),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('O total do dia passaria de 24 h');
  });

  it('exclui um registro do dia', async () => {
    const { repository } = renderView({ day: dayVariants.now });
    fireEvent.click(
      await screen.findByRole('button', { name: 'Excluir registro de Hack The Box — Labs' }),
    );
    await waitFor(() => expect(repository.calls.deleteSession).toEqual(['s2']));
  });

  it('navega pelos dias da semana e volta para hoje', async () => {
    const repository = createFakeStudyRepository({ day: dayVariants.now });
    const getDay = vi.spyOn(repository, 'getDay');
    render(
      <StudyProvider repository={repository}>
        <StudyView onOpenLesson={() => {}} />
      </StudyProvider>,
    );
    fireEvent.click(await screen.findByRole('button', { name: /^Seg 23/ }));
    await waitFor(() => expect(getDay).toHaveBeenLastCalledWith('2026-11-23'));
    getDay.mockResolvedValueOnce({ ...dayVariants.now, isToday: false } as StudyDay);
    fireEvent.click(await screen.findByRole('button', { name: /^Ter 24/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Voltar para hoje' }));
    await waitFor(() => expect(getDay).toHaveBeenLastCalledWith(null));
  });
});

describe('study/presentation — StudyView (Cronograma)', () => {
  it('adiciona um bloco em vários dias e salva a semana no núcleo', async () => {
    const { repository } = renderView({ blocks: [] });
    fireEvent.click(await screen.findByRole('button', { name: 'Cronograma' }));
    const form = await screen.findByRole('form', { name: 'Novo bloco' });
    fireEvent.change(within(form).getByLabelText('Trilha'), { target: { value: 'htb' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Seg' }));
    fireEvent.click(within(form).getByRole('button', { name: 'Qua' }));
    fireEvent.change(within(form).getByLabelText('Início'), { target: { value: '19:30' } });
    fireEvent.change(within(form).getByLabelText('Duração (min)'), { target: { value: '90' } });
    fireEvent.change(within(form).getByLabelText('Atividade'), { target: { value: 'lab' } });
    fireEvent.change(within(form).getByLabelText('Foco'), { target: { value: 'Máquina Easy' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Adicionar ao cronograma' }));

    expect(screen.getByText('Alterações não salvas')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar cronograma' }));
    await waitFor(() => expect(repository.calls.saveSchedule).toHaveLength(1));
    expect(repository.calls.saveSchedule[0]).toEqual([
      expect.objectContaining({
        trackId: 'htb',
        weekday: 1,
        startMinute: 1170,
        durationMinutes: 90,
        activity: 'lab',
        focus: 'Máquina Easy',
      }),
      expect.objectContaining({ trackId: 'htb', weekday: 3, startMinute: 1170 }),
    ]);
  });

  it('remove um bloco existente e mostra a recusa do núcleo', async () => {
    const { repository } = renderView({ failWith: 'Há blocos sobrepostos na quarta' });
    fireEvent.click(await screen.findByRole('button', { name: 'Cronograma' }));
    fireEvent.click(
      await screen.findByRole('button', { name: 'Remover Pentest Web de Quarta às 07:00' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Salvar cronograma' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Há blocos sobrepostos na quarta');
    expect(repository.calls.saveSchedule[0].map((block) => block.id)).toEqual(['b2', 'b3']);
  });
});

describe('study/presentation — StudyView (Trilhas)', () => {
  it('cria uma trilha de plataforma externa a partir do atalho Hack The Box', async () => {
    const { repository } = renderView();
    fireEvent.click(await screen.findByRole('button', { name: 'Trilhas' }));
    const form = await screen.findByRole('form', { name: 'Nova trilha' });
    fireEvent.click(within(form).getByRole('button', { name: 'Plataforma externa' }));
    fireEvent.click(within(form).getByRole('button', { name: 'Hack The Box' }));
    fireEvent.click(within(form).getByRole('button', { name: 'Criar trilha' }));
    await waitFor(() =>
      expect(repository.calls.saveTrack).toEqual([
        expect.objectContaining({
          kind: 'external',
          title: 'Hack The Box',
          platform: 'Hack The Box',
          url: 'https://app.hackthebox.com',
        }),
      ]),
    );
  });

  it('lista os cursos agrupados pela biblioteca, como na estrutura da Biblioteca', async () => {
    renderView();
    fireEvent.click(await screen.findByRole('button', { name: 'Trilhas' }));
    const list = await screen.findByRole('listbox', { name: 'Cursos da biblioteca' });

    const groups = await within(list).findAllByRole('group');
    expect(groups.map((group) => group.getAttribute('aria-label'))).toEqual([
      'Hacking',
      'Produtividade e Gestão do Tempo',
      'Cursos avulsos',
    ]);
    const hacking = within(groups[0]);
    expect(hacking.getByRole('option', { name: /Pentest Web/ })).toBeInTheDocument();
    expect(hacking.getByRole('option', { name: /Forense › FOR 508/ })).toHaveTextContent(
      '3 módulos · 24 aulas',
    );
  });

  it('pesquisa o curso no núcleo pelo nome do curso ou da biblioteca', async () => {
    const { repository } = renderView();
    fireEvent.click(await screen.findByRole('button', { name: 'Trilhas' }));
    fireEvent.change(await screen.findByRole('searchbox', { name: 'Pesquisar curso' }), {
      target: { value: 'gestao' },
    });

    await waitFor(() => expect(repository.calls.listCourses).toContain('gestao'));
    const list = screen.getByRole('listbox', { name: 'Cursos da biblioteca' });
    await waitFor(() =>
      expect(
        within(list)
          .getAllByRole('group')
          .map((g) => g.getAttribute('aria-label')),
      ).toEqual(['Produtividade e Gestão do Tempo']),
    );

    fireEvent.change(screen.getByRole('searchbox', { name: 'Pesquisar curso' }), {
      target: { value: 'kubernetes' },
    });
    expect(await screen.findByText('Nenhum curso encontrado.')).toBeInTheDocument();
  });

  it('cria a trilha de uma biblioteca inteira', async () => {
    const { repository } = renderView();
    fireEvent.click(await screen.findByRole('button', { name: 'Trilhas' }));
    const form = await screen.findByRole('form', { name: 'Nova trilha' });
    const list = within(form).getByRole('listbox', { name: 'Cursos da biblioteca' });
    const loose = await within(list).findByRole('group', { name: 'Cursos avulsos' });
    expect(within(loose).queryByRole('option', { name: /Biblioteca inteira/ })).toBeNull();

    fireEvent.click(within(list).getByRole('option', { name: /Biblioteca inteira: Hacking/ }));
    expect(within(form).getByText('Hacking › todos os cursos')).toBeInTheDocument();
    fireEvent.click(within(form).getByRole('button', { name: 'Criar trilha' }));
    await waitFor(() =>
      expect(repository.calls.saveTrack).toEqual([
        expect.objectContaining({
          kind: 'course',
          sourceId: 'src-hacking',
          courseId: null,
          title: 'Hacking',
        }),
      ]),
    );
  });

  it('identifica a trilha de biblioteca inteira na lista de trilhas', async () => {
    renderView({ tracks: [...sampleTracks, libraryTrack] });
    fireEvent.click(await screen.findByRole('button', { name: 'Trilhas' }));
    const list = await screen.findByRole('region', { name: 'Suas trilhas' });
    expect(await within(list).findByText(/Biblioteca inteira/)).toBeInTheDocument();
  });

  it('cria a trilha de um curso da biblioteca e arquiva outra', async () => {
    const { repository } = renderView();
    fireEvent.click(await screen.findByRole('button', { name: 'Trilhas' }));
    const form = await screen.findByRole('form', { name: 'Nova trilha' });
    fireEvent.click(await within(form).findByRole('option', { name: /Pentest Web/ }));
    expect(within(form).getByRole('option', { name: /Pentest Web/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(within(form).getByText('Hacking › Pentest Web')).toBeInTheDocument();
    fireEvent.click(within(form).getByRole('button', { name: 'Criar trilha' }));
    await waitFor(() =>
      expect(repository.calls.saveTrack).toEqual([
        expect.objectContaining({ kind: 'course', courseId: 'course-web', title: 'Pentest Web' }),
      ]),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Arquivar HackingClub — Aulas' }));
    await waitFor(() => expect(repository.calls.archiveTrack).toEqual(['club']));
  });
});
