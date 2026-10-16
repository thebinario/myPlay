import type { AddSourceInput, AddSourceResult } from '@/core/contracts/library-sources';
import {
  createLibrarySource,
  isDuplicateSource,
  normalizeSourcePath,
} from '@/modules/sources/domain/source-rules';
import type { SourcesDependencies } from '@/modules/sources/application/dependencies';

/**
 * Adiciona uma fonte à biblioteca.
 *
 * Regra: caminho obrigatório e não duplicado. Nunca toca no filesystem — apenas
 * registra a referência no catálogo (regra de ouro: catálogo não apaga arquivo).
 */
export function addSource(deps: SourcesDependencies, input: AddSourceInput): AddSourceResult {
  const path = normalizeSourcePath(input.path ?? '');
  if (!path) {
    return { ok: false, error: 'invalid' };
  }
  if (isDuplicateSource(deps.repository.list(), path)) {
    return { ok: false, error: 'duplicate' };
  }
  const source = createLibrarySource(path, {
    name: input.name,
    libraryType: input.libraryType,
  });
  deps.repository.save(source);
  return { ok: true, source };
}
