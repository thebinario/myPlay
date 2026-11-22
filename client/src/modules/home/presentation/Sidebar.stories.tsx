import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from 'storybook/test';
import { Sidebar } from '@/modules/home/presentation/Sidebar';

const meta: Meta<typeof Sidebar> = {
  title: 'Components/Sidebar',
  component: Sidebar,
  tags: ['autodocs'],
  parameters: {
    controls: { sortBy: ['required', 'default'] },
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div style={{ display: 'flex', height: '100vh', background: '#0B0E17' }}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    currentTab: {
      control: {
        type: 'radio',
        options: ['home', 'library', 'course-details', 'player', 'search', 'settings'],
      },
    },
    onNavigate: { action: 'navigate' },
    onToggleCollapsed: { action: 'toggle' },
  },
};

export default meta;
type Story = StoryObj<typeof Sidebar>;

/** Expandida, como no protótipo: Biblioteca ativa, Ctrl K na pesquisa e "Minha conta". */
export const Expanded: Story = {
  args: { currentTab: 'library', onNavigate: fn(), onToggleCollapsed: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Biblioteca' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(canvas.getByText('Ctrl K')).toBeInTheDocument();
    await expect(canvas.getByText('Sincronizado')).toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: 'Recolher menu' }));
    await expect(args.onToggleCollapsed).toHaveBeenCalled();
  },
};

/** Recolhida: só ícones; o nome aparece no tooltip. */
export const Collapsed: Story = {
  args: { currentTab: 'library', collapsed: true, onNavigate: fn(), onToggleCollapsed: fn() },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByText('Biblioteca')).not.toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: 'Biblioteca' })).toHaveAttribute(
      'title',
      'Biblioteca',
    );
    await expect(canvas.getByRole('button', { name: 'Expandir menu' })).toBeInTheDocument();
  },
};

/** Detalhe de curso conta como Biblioteca. */
export const CourseDetails: Story = {
  args: { currentTab: 'course-details', onNavigate: fn() },
};

export const HomeTab: Story = { args: { currentTab: 'home', onNavigate: fn() } };

export const SettingsTab: Story = { args: { currentTab: 'settings', onNavigate: fn() } };

/** O núcleo está processando: a conta mostra "Atualizando…" com o ponto âmbar. */
export const Syncing: Story = {
  args: { currentTab: 'home', syncing: true, onNavigate: fn() },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('Atualizando…')).toBeInTheDocument();
  },
};

/** Recolhida enquanto processa: ponto âmbar no avatar. */
export const CollapsedSyncing: Story = {
  args: { currentTab: 'search', collapsed: true, syncing: true, onNavigate: fn() },
};
