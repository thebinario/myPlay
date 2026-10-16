import type { DirectoryPicker, LibrarySourcesRepository } from '@/core/contracts/library-sources';

/** Dependências compartilhadas pelos casos de uso do contexto `sources`. */
export interface SourcesDependencies {
  repository: LibrarySourcesRepository;
  /** Opcional: só existe no runtime desktop (seletor de pasta do SO). */
  picker?: DirectoryPicker;
}
