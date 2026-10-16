import type { SourcesDependencies } from '@/modules/sources/application/dependencies';

/**
 * Retira uma fonte do catálogo.
 *
 * Remove apenas a referência do catálogo simulado; nunca apaga arquivos físicos.
 */
export function removeSource(deps: SourcesDependencies, id: string): void {
  deps.repository.remove(id);
}
