import type { SourcesDependencies } from '@/modules/sources/application/dependencies';

/** Persists a friendly library label without changing its filesystem path. */
export async function renameSource(
  deps: SourcesDependencies,
  id: string,
  name: string,
): Promise<void> {
  const normalized = name.trim();
  if (!normalized) throw new Error('Informe um nome para a biblioteca.');
  await deps.repository.rename(id, normalized);
}
