import type { Meta, StoryObj } from '@storybook/react';
import { LibrarySourcesPanel } from '@/modules/sources/presentation/components/LibrarySourcesPanel';
import type { SourcesViewModel } from '@/core/contracts/library-sources';
import type { ImportViewModel } from '@/core/contracts/import';
import { INITIAL_IMPORT_STATE, type LibrarySource } from '@/core/domain/library-source';
import { SOURCES_SEED } from '@/modules/sources/infrastructure/seed/sources-seed';

const noop = () => {};

function sourcesViewModel(sources: LibrarySource[]): SourcesViewModel {
  return {
    sources,
    addSource: () => ({ ok: false, error: 'invalid' }),
    removeSource: noop,
    renameSource: async () => {},
    reconnectSource: noop,
    disconnectSource: noop,
    checkSource: noop,
  };
}

const importViewModel: ImportViewModel = {
  state: INITIAL_IMPORT_STATE,
  isSimulated: true,
  start: noop,
  pause: noop,
  resume: noop,
  retry: noop,
  setScenario: noop,
  advance: noop,
  reset: noop,
};

const meta: Meta<typeof LibrarySourcesPanel> = {
  title: 'Modules/Sources/LibrarySourcesPanel',
  component: LibrarySourcesPanel,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen', background: { default: '#0D111B' } },
  decorators: [
    (Story) => (
      <div style={{ padding: '24px', maxWidth: '720px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof LibrarySourcesPanel>;

export const Default: Story = {
  args: {
    viewModel: sourcesViewModel(SOURCES_SEED),
    importFlow: importViewModel,
  },
};

export const Empty: Story = {
  args: {
    viewModel: sourcesViewModel([]),
    importFlow: importViewModel,
  },
};

export const AllStatuses: Story = {
  args: {
    viewModel: sourcesViewModel([
      { ...SOURCES_SEED[0] },
      { ...SOURCES_SEED[1] },
      {
        id: 'demo-checking',
        path: 'F:/Pendrive',
        name: 'Pendrive',
        status: 'checking',
        itemCount: 0,
        lastScannedAt: null,
      },
      {
        id: 'demo-unavailable',
        path: 'G:/Antigo',
        name: 'Antigo',
        status: 'unavailable',
        itemCount: 7,
        lastScannedAt: '2026-01-04T10:00:00Z',
      },
    ]),
    importFlow: importViewModel,
  },
};
