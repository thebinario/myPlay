/** Etapas do primeiro acesso. */

export const ONBOARDING_STEPS = ['welcome', 'sources', 'discovery', 'complete'] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export const ONBOARDING_STEP_LABEL: Record<OnboardingStep, string> = {
  welcome: 'Boas-vindas',
  sources: 'Bibliotecas',
  discovery: 'Descoberta',
  complete: 'Concluído',
};

export function stepIndex(step: OnboardingStep): number {
  return ONBOARDING_STEPS.indexOf(step);
}
