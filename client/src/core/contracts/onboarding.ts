/**
 * Contrato do estado de primeiro acesso.
 *
 * Define se a configuração inicial já foi concluída. É o mecanismo testável que
 * o shell usa para decidir se abre o onboarding.
 * Ver docs/ARCHITECTURE.md §7.
 */
export interface OnboardingRepository {
  isCompleted(): boolean;
  complete(): void;
  reset(): void;
}
