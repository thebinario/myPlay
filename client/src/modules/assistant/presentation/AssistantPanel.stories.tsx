import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from 'storybook/test';
import type {
  AnswerView,
  AssistantRepository,
  AnswerSourceView,
} from '@/modules/assistant/domain/assistant';
import { AssistantProvider } from '@/modules/assistant/presentation/AssistantProvider';
import { AssistantPanel } from '@/modules/assistant/presentation/AssistantPanel';

const video: AnswerSourceView = {
  index: 1,
  label: 'Docker do Zero · Instalação no Windows (04:12)',
  sourceKind: 'subtitle',
  snippet: 'baixe o Docker Desktop e habilite o WSL 2',
  lessonId: 'l1',
  courseId: 'c1',
  documentId: null,
  page: null,
  startMs: 252_000,
};

const pdf: AnswerSourceView = {
  ...video,
  index: 2,
  label: 'Apostila Docker.pdf · página 7',
  sourceKind: 'pdf',
  lessonId: null,
  courseId: null,
  documentId: 'd1',
  page: 7,
  startMs: null,
};

const answer: AnswerView = {
  text: 'Baixe o Docker Desktop e habilite o WSL 2 antes de instalar [1]. A apostila traz o passo a passo com capturas [2].',
  sources: [video, pdf],
  citations: [video, pdf],
};

const answering = (result: AnswerView | null, error?: string): AssistantRepository => ({
  ask: (_input, handlers) => {
    setTimeout(() => {
      if (error) return handlers.onError(error);
      if (!result) return;
      handlers.onToken(result.text);
      handlers.onDone(result);
    }, 50);
    return { cancel: async () => {} };
  },
});

const meta: Meta<typeof AssistantPanel> = {
  title: 'Assistant/AssistantPanel',
  component: AssistantPanel,
  tags: ['autodocs'],
  parameters: { background: { default: '#0D111B' } },
  args: {
    initialQuestion: 'Como instalo o Docker no Windows?',
    onOpenLessonAt: fn(),
    onOpenDocumentAt: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof AssistantPanel>;

const withRepository = (repository: AssistantRepository): Story['decorators'] => [
  (Story) => (
    <AssistantProvider repository={repository}>
      <Story />
    </AssistantProvider>
  ),
];

/** Resposta com citações; clicar abre o vídeo no instante citado. */
export const WithCitations: Story = {
  decorators: withRepository(answering(answer)),
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Perguntar à biblioteca' }));
    await userEvent.click(await canvas.findByRole('button', { name: /\[1\] Docker do Zero/ }));
    await expect(args.onOpenLessonAt).toHaveBeenCalledWith('c1', 'l1', 252);
  },
};

/** Nada relevante na biblioteca: resposta honesta, sem citações. */
export const NoSources: Story = {
  decorators: withRepository(
    answering({
      text: 'Não encontrei nada sobre isso na sua biblioteca. Tente outras palavras ou verifique se o conteúdo já foi indexado.',
      sources: [],
      citations: [],
    }),
  ),
};

/** Gerando: o modelo ainda não respondeu (primeiro uso pode baixar o modelo). */
export const Answering: Story = {
  decorators: withRepository(answering(null)),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Perguntar à biblioteca' }));
    await expect(await canvas.findByText('Procurando nos seus cursos e PDFs…')).toBeTruthy();
  },
};

/** Erro devolvido pelo núcleo. */
export const Failed: Story = {
  decorators: withRepository(answering(null, 'Não foi possível carregar o modelo local.')),
};
