import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from 'storybook/test';
import type { StudyDay } from '@/modules/study/domain/study';
import { StudyProvider } from '@/modules/study/presentation/providers/StudyProvider';
import { StudyView, type StudyTab } from '@/modules/study/presentation/views/StudyView';
import { createFakeStudyRepository, dayVariants, sampleWeek } from './study-fixtures';

interface StoryArgs {
  day: StudyDay;
  tab: StudyTab;
  noTracks?: boolean;
  failWith?: string;
}

const meta: Meta<StoryArgs> = {
  title: 'Study/StudyView',
  parameters: { layout: 'fullscreen' },
  render: ({ day, tab, noTracks, failWith }) => (
    <div style={{ backgroundColor: '#0D111B', minHeight: '100vh' }}>
      <StudyProvider
        repository={createFakeStudyRepository({
          day,
          week: sampleWeek(),
          tracks: noTracks ? [] : undefined,
          failWith,
        })}
      >
        <StudyView initialTab={tab} onOpenLesson={() => {}} />
      </StudyProvider>
    </div>
  ),
  args: { day: dayVariants.now, tab: 'today' },
};

export default meta;
type Story = StoryObj<StoryArgs>;

/** Bloco em andamento: a resposta é "Agora", com o foco e o atalho da plataforma. */
export const Now: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const card = await canvas.findByRole('region', { name: 'O que estudar agora' });
    await expect(within(card).getByText('Agora')).toBeInTheDocument();
    await expect(within(card).getByRole('button', { name: 'Iniciar cronômetro' })).toBeEnabled();
  },
};

/** Um bloco da manhã ficou para trás: recuperar vem antes do próximo. */
export const CatchUpCourse: Story = { args: { day: dayVariants.catchUp } };

/** Tudo em dia; o próximo bloco é mais tarde e dá para adiantar. */
export const NextLater: Story = { args: { day: dayVariants.next } };

export const DayDone: Story = { args: { day: dayVariants.done } };

export const NothingPlanned: Story = { args: { day: dayVariants.free } };

/** Cronômetro rodando (persistido no núcleo). */
export const TimerRunning: Story = { args: { day: dayVariants.withTimer } };

/** Primeiro acesso: sem trilhas. */
export const FirstAccess: Story = { args: { day: dayVariants.free, noTracks: true } };

/** Registro manual (ex.: aula feita na HackingClub). */
export const ManualEntry: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole('button', { name: 'Registrar tempo' }));
    await expect(canvas.getByRole('form', { name: 'Registrar tempo de estudo' })).toBeVisible();
  },
};

export const ManualEntryRejected: Story = {
  args: { failWith: 'O total do dia passaria de 24 h; revise os registros' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole('button', { name: 'Registrar tempo' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Salvar registro' }));
    await expect(await canvas.findByRole('alert')).toHaveTextContent('24 h');
  },
};

/** Editor semanal do cronograma. */
export const ScheduleEditor: Story = { args: { tab: 'schedule' } };

export const ScheduleRejected: Story = {
  args: { tab: 'schedule', failWith: 'Há blocos sobrepostos na quarta; ajuste os horários' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole('button', { name: 'Salvar cronograma' }));
    await expect(await canvas.findByRole('alert')).toHaveTextContent('sobrepostos');
  },
};

/** Trilhas: cursos da biblioteca e plataformas como Hack The Box e HackingClub. */
/** Nova trilha de curso: cursos agrupados por biblioteca, com pesquisa no núcleo. */
export const TrackCoursePicker: Story = {
  args: { tab: 'tracks' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const form = await canvas.findByRole('form', { name: 'Nova trilha' });
    const list = await within(form).findByRole('listbox', { name: 'Cursos da biblioteca' });
    await expect(await within(list).findByRole('group', { name: 'Hacking' })).toBeVisible();
    await userEvent.type(
      within(form).getByRole('searchbox', { name: 'Pesquisar curso' }),
      'forense',
    );
    const option = await within(list).findByRole('option', { name: /Forense › FOR 508/ });
    await userEvent.click(option);
    await expect(option).toHaveAttribute('aria-selected', 'true');
    await expect(within(form).getByText('Hacking › Forense › FOR 508')).toBeVisible();
  },
};

/** Nova trilha cobrindo uma biblioteca inteira (todos os cursos dela). */
export const TrackWholeLibrary: Story = {
  args: { tab: 'tracks' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const form = await canvas.findByRole('form', { name: 'Nova trilha' });
    const option = await within(form).findByRole('option', { name: 'Biblioteca inteira: Hacking' });
    await userEvent.click(option);
    await expect(option).toHaveAttribute('aria-selected', 'true');
    await expect(within(form).getByText('Hacking › todos os cursos')).toBeVisible();
    await expect(within(form).getByRole('button', { name: 'Criar trilha' })).toBeEnabled();
  },
};

/** Pesquisa sem resultado. */
export const TrackCoursePickerEmpty: Story = {
  args: { tab: 'tracks' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(
      await canvas.findByRole('searchbox', { name: 'Pesquisar curso' }),
      'kubernetes',
    );
    await expect(await canvas.findByText('Nenhum curso encontrado.')).toBeVisible();
  },
};

export const Tracks: Story = {
  args: { tab: 'tracks' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const form = await canvas.findByRole('form', { name: 'Nova trilha' });
    await userEvent.click(within(form).getByRole('button', { name: 'Plataforma externa' }));
    await userEvent.click(within(form).getByRole('button', { name: 'HackingClub' }));
    await expect(within(form).getByLabelText('Plataforma')).toHaveValue('HackingClub');
  },
};
