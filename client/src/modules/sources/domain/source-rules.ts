import type { LibrarySource, LibraryType } from '@/core/domain/library-source';

/**
 * Regras puras de fontes de biblioteca. Sem IO, sem React, sem framework.
 */

/** Normaliza o caminho para comparação: sem barras finais, separador `/`. */
export function normalizeSourcePath(path: string): string {
  return path
    .trim()
    .replace(/[\\/]+$/, '')
    .replace(/\\/g, '/');
}

/** Deriva um nome legível a partir do caminho informado. */
export function sourceDisplayName(path: string): string {
  const normalized = normalizeSourcePath(path);
  const parts = normalized.split('/').filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : normalized;
}

/** Duas fontes são a mesma quando os caminhos normalizados coincidem (case-insensitive). */
export function isDuplicateSource(sources: LibrarySource[], path: string): boolean {
  const candidate = normalizeSourcePath(path).toLowerCase();
  if (!candidate) return false;
  return sources.some((s) => normalizeSourcePath(s.path).toLowerCase() === candidate);
}

export interface CreateSourceOptions {
  id?: string;
  name?: string;
  libraryType?: LibraryType;
}

/** Cria uma fonte nova (status inicial `connected`, sem conteúdos conhecidos). */
export function createLibrarySource(
  path: string,
  options: CreateSourceOptions = {},
): LibrarySource {
  const normalized = normalizeSourcePath(path);
  return {
    id: options.id ?? `source-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    path: normalized,
    name: options.name?.trim() || sourceDisplayName(normalized),
    libraryType: options.libraryType ?? 'course',
    status: 'connected',
    itemCount: 0,
    lastScannedAt: null,
  };
}

/** Uma fonte pode ser verificada quando não está em processo de verificação. */
export function canCheckAvailability(source: LibrarySource): boolean {
  return source.status !== 'checking';
}
