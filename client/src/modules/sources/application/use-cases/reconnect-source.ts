import type { SourcesDependencies } from '@/modules/sources/application/dependencies';

/**
 * Reconecta uma fonte previamente desconectada, preservando o histórico de
 * conteúdos conhecidos (o `itemCount` não é zerado).
 */
export function reconnectSource(deps: SourcesDependencies, id: string): void {
  const source = deps.repository.getById(id);
  if (!source) return;
  deps.repository.save({ ...source, status: 'connected' });
}

/** Marca a fonte como desconectada (simulação de HD removido). */
export function disconnectSource(deps: SourcesDependencies, id: string): void {
  const source = deps.repository.getById(id);
  if (!source) return;
  deps.repository.save({ ...source, status: 'disconnected' });
}
