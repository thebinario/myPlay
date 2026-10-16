import type { LibrarySource as CoreLibrarySource } from '@midoteca/core';
import type { LibrarySource, SourceStatus } from '@/core/domain/library-source';

/** Maps a core source status to the frontend status vocabulary. */
export function mapCoreStatus(status: CoreLibrarySource['status']): SourceStatus {
  switch (status) {
    case 'active':
      return 'connected';
    case 'offline':
      return 'disconnected';
    case 'scanning':
      return 'checking';
    case 'error':
      return 'unavailable';
    default:
      return 'unavailable';
  }
}

/** Last path segment of a POSIX or Windows path (fallback display name). */
function baseName(path: string): string {
  const trimmed = path.replace(/[\\/]+$/, '');
  const parts = trimmed.split(/[\\/]/);
  return parts[parts.length - 1] || path;
}

/** Maps a core `LibrarySource` (plus its index counter) to the frontend model. */
export function mapCoreSource(source: CoreLibrarySource, itemCount: number): LibrarySource {
  return {
    id: source.id,
    path: source.rootPath,
    name: source.displayName ?? baseName(source.rootPath),
    status: mapCoreStatus(source.status),
    itemCount,
    lastScannedAt: source.lastScanAt,
  };
}
