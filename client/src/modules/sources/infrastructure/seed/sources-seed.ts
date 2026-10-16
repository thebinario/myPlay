import type { LibrarySource } from '@/core/domain/library-source';

/**
 * Fontes de demonstração. Um dos HDs começa desconectado para tornar visível,
 * já no primeiro uso, que o catálogo é preservado sem a unidade conectada.
 */
export const SOURCES_SEED: LibrarySource[] = [
  {
    id: 'demo-courses',
    path: 'D:/Cursos',
    name: 'Cursos',
    status: 'connected',
    itemCount: 42,
    lastScannedAt: '2026-10-12T18:00:00Z',
  },
  {
    id: 'demo-movies',
    path: 'E:/Filmes',
    name: 'Filmes',
    status: 'disconnected',
    itemCount: 18,
    lastScannedAt: '2026-09-28T09:30:00Z',
  },
];
