import type { DiscoveredKind } from '@/core/domain/library-source';

const VIDEO_EXTENSIONS = new Set(['.mp4', '.mkv', '.mov', '.avi', '.webm', '.m4v']);
const DOCUMENT_EXTENSIONS = new Set(['.pdf']);

/**
 * Classifica um arquivo descoberto pelo kernel (`media:discovered`) na categoria
 * exibida na interface. O kernel entrega apenas o caminho relativo; a extensão é
 * a única informação disponível para distinguir vídeo de documento.
 *
 * Regra pura: sem IO, sem dependências de framework.
 */
export function discoveredKindFromPath(relativePath: string): DiscoveredKind | null {
  const dot = relativePath.lastIndexOf('.');
  if (dot < 0) return null;
  const extension = relativePath.slice(dot).toLowerCase();
  if (VIDEO_EXTENSIONS.has(extension)) return 'movie';
  if (DOCUMENT_EXTENSIONS.has(extension)) return 'document';
  return null;
}
