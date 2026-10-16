import type { SourcesDependencies } from '@/modules/sources/application/dependencies';

/**
 * Registra o resultado de uma análise: quantidade de conteúdos conhecidos e a
 * data da última análise. Preserva o histórico quando o HD está desconectado.
 */
export function recordSourceScan(
  deps: SourcesDependencies,
  id: string,
  itemCount: number,
  scannedAt: string,
): void {
  const source = deps.repository.getById(id);
  if (!source) return;
  deps.repository.save({ ...source, itemCount, lastScannedAt: scannedAt });
}
