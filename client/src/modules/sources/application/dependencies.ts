import type { LibrarySourcesRepository } from '@/core/contracts/library-sources';

/** Dependências compartilhadas pelos casos de uso do contexto `sources`. */
export interface SourcesDependencies {
  repository: LibrarySourcesRepository;
}
