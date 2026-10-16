import { canCheckAvailability } from '@/modules/sources/domain/source-rules';
import type { SourcesDependencies } from '@/modules/sources/application/dependencies';

/**
 * Verifica a disponibilidade de uma fonte (IO via contrato) e atualiza o
 * status. Uma fonte desconectada continua no catálogo após a verificação.
 */
export async function checkSourceAvailability(
  deps: SourcesDependencies,
  id: string,
): Promise<void> {
  const source = deps.repository.getById(id);
  if (!source || !canCheckAvailability(source)) return;

  deps.repository.save({ ...source, status: 'checking' });
  const status = await deps.repository.probe(id);
  const current = deps.repository.getById(id);
  if (current) {
    deps.repository.save({ ...current, status });
  }
}
