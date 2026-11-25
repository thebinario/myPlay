import type { Meta, StoryObj } from '@storybook/react';
import { OrganizationSuggestionPanel } from '@/modules/courses/presentation/OrganizationSuggestionPanel';
import type { OrganizationSuggestionView } from '@/modules/courses/domain/organization-suggestion';

const noop = () => {};
const lessonTitles = new Map([
  ['l1', 'Informações sobre a sala'],
  ['l10', 'Live 06-12'],
  ['l11', 'Aula 01 - Seja bem-vindo'],
  ['l17', 'Aula 07 - Especificação dos ativos'],
  ['l18', 'Aula 08 - Módulo 2 - Análise Intermarket e Sentimento'],
  ['l31', 'Aula 21 - Análise de sentimento'],
]);

function suggestion(fields: Partial<OrganizationSuggestionView>): OrganizationSuggestionView {
  return {
    courseId: 'c1',
    status: 'ready',
    modules: [],
    modelId: 'Qwen 2.5 7B',
    error: null,
    ...fields,
  };
}

const meta: Meta<typeof OrganizationSuggestionPanel> = {
  title: 'Modules/Courses/OrganizationSuggestionPanel',
  component: OrganizationSuggestionPanel,
  tags: ['autodocs'],
  parameters: { layout: 'padded', background: { default: '#0D111B' } },
  args: {
    busy: false,
    error: null,
    lessonTitles,
    onRequest: noop,
    onApply: noop,
    onDismiss: noop,
  },
};

export default meta;
type Story = StoryObj<typeof OrganizationSuggestionPanel>;

export const Idle: Story = { args: { state: { available: true, suggestion: null } } };

export const AiUnavailable: Story = { args: { state: { available: false, suggestion: null } } };

export const Working: Story = {
  args: { state: { available: true, suggestion: suggestion({ status: 'running' }) } },
};

export const Ready: Story = {
  args: {
    state: {
      available: true,
      suggestion: suggestion({
        modules: [
          { title: 'Lives', lessonIds: ['l1', 'l10'] },
          { title: 'Introdução e Plataforma', lessonIds: ['l11', 'l17'] },
          { title: 'Análise Intermarket e Sentimento', lessonIds: ['l18', 'l31'] },
        ],
      }),
    },
  },
};

export const Failed: Story = {
  args: {
    state: {
      available: true,
      suggestion: suggestion({ status: 'failed', error: 'O modelo local não pôde ser carregado.' }),
    },
  },
};

export const ApplyRefused: Story = {
  args: {
    ...Ready.args,
    error: 'O curso mudou desde a sugestão. Peça uma nova sugestão.',
  },
};
