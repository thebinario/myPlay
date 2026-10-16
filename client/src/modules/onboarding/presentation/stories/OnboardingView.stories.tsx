import { useMemo } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { OnboardingView } from '@/modules/onboarding/presentation/views/OnboardingView';
import { SourcesProvider } from '@/modules/sources/presentation/providers/SourcesProvider';
import { useLibrarySources } from '@/modules/sources/presentation/hooks/useLibrarySources';
import { useImportFlow } from '@/modules/sources/presentation/hooks/useImportFlow';
import { createInMemorySourcesRepository } from '@/modules/sources/infrastructure/mock/mock-library-sources.repository';
import { SOURCES_SEED } from '@/modules/sources/infrastructure/seed/sources-seed';
import type { OnboardingStep } from '@/modules/onboarding/domain/onboarding';

function OnboardingShowcase({ step }: { step: OnboardingStep }) {
  const repository = useMemo(() => createInMemorySourcesRepository(SOURCES_SEED), []);
  return (
    <SourcesProvider repository={repository}>
      <Inner step={step} />
    </SourcesProvider>
  );
}

function Inner({ step }: { step: OnboardingStep }) {
  const sources = useLibrarySources();
  const importFlow = useImportFlow(false);
  return (
    <OnboardingView
      sources={sources}
      importFlow={importFlow}
      onFinish={() => {}}
      onSkip={() => {}}
      initialStep={step}
    />
  );
}

const meta: Meta<typeof OnboardingView> = {
  title: 'Modules/Onboarding/OnboardingView',
  component: OnboardingView,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen', background: { default: '#0D111B' } },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Welcome: Story = {
  render: () => <OnboardingShowcase step="welcome" />,
};

export const Sources: Story = {
  render: () => <OnboardingShowcase step="sources" />,
};

export const Discovery: Story = {
  render: () => <OnboardingShowcase step="discovery" />,
};

export const Complete: Story = {
  render: () => <OnboardingShowcase step="complete" />,
};
