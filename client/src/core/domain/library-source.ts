/**
 * Vocabulário compartilhado de fontes de biblioteca e descoberta de conteúdo.
 *
 * Usado por mais de um contexto (`sources`, `onboarding`), por isso vive no
 * kernel (`core/domain/`) e não no `domain/` de um contexto específico.
 * Ver docs/ARCHITECTURE.md §8 (vocabulário compartilhado).
 */

export type SourceStatus = 'connected' | 'disconnected' | 'unavailable' | 'checking';
export type LibraryType = 'course' | 'movie';

/** Fonte de conteúdo conhecida pela biblioteca (pasta local ou HD externo). */
export interface LibrarySource {
  id: string;
  /** Caminho informado pelo usuário. Nunca usado como identidade. */
  path: string;
  /** Nome exibido (derivado do caminho quando não informado). */
  name: string;
  /** Organização principal desta fonte: cursos (com materiais) ou filmes. */
  libraryType?: LibraryType;
  status: SourceStatus;
  /** Quantidade de conteúdos já conhecidos nesta fonte. */
  itemCount: number;
  /** ISO da última análise concluída, ou `null` se nunca analisada. */
  lastScannedAt: string | null;
}

export type DiscoveredKind = 'course' | 'movie' | 'document';

/** Conteúdo descoberto durante a importação simulada. */
export interface DiscoveredItem {
  id: string;
  title: string;
  kind: DiscoveredKind;
  sourceId: string;
}

/**
 * Cenário de demonstração da descoberta. Existe apenas para tornar os estados
 * de erro/vazio testáveis sem depender de filesystem real.
 */
export type ImportScenario = 'normal' | 'empty' | 'offline' | 'denied' | 'error';

/** Fases observáveis do fluxo de importação. */
export type ImportPhase =
  'idle' | 'scanning' | 'paused' | 'done' | 'empty' | 'disconnected' | 'denied' | 'error';

export interface ImportState {
  phase: ImportPhase;
  scenario: ImportScenario;
  /** Progresso 0-100. */
  progress: number;
  discovered: DiscoveredItem[];
  /** Mensagem legível para estados de erro/vazio. */
  message?: string;
}

export const INITIAL_IMPORT_STATE: ImportState = {
  phase: 'idle',
  scenario: 'normal',
  progress: 0,
  discovered: [],
};

/** Rótulo humano de cada fase (UI). */
export const IMPORT_PHASE_LABEL: Record<ImportPhase, string> = {
  idle: 'Aguardando início',
  scanning: 'Descobrindo arquivos',
  paused: 'Processamento pausado',
  done: 'Descoberta concluída',
  empty: 'Fonte vazia',
  disconnected: 'Fonte desconectada',
  denied: 'Permissão negada',
  error: 'Erro recuperável',
};
