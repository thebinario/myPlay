/**
 * Read model of the background work the user can watch (library scans, media
 * analysis, transcription, text extraction, embeddings). Pure domain: labels,
 * categories, percent and display order are decided here, never in the UI.
 */

export type ActivityKind =
  | 'scan'
  | 'media-analysis'
  | 'media-check'
  | 'transcription'
  | 'content-extraction'
  | 'embeddings'
  | 'other';

export type ActivityStatus = 'running' | 'queued' | 'completed' | 'failed';

/** How a finished piece of work ended; `requeued` (retry/interruption) is not history. */
export type ActivityOutcome = 'completed' | 'failed' | 'requeued';

/** Units processed so far; `total` is null when the amount is unknown. */
export interface ActivityProgress {
  done: number;
  total: number | null;
}

export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  status: ActivityStatus;
  label: string;
  sourceId: string | null;
  progress: ActivityProgress | null;
  /** 0–100, already computed; null when the total is unknown. */
  percent: number | null;
  /** What is being processed right now (e.g. a file name). */
  detail: string | null;
  startedAt: string;
  /** Set only for `completed`/`failed` history entries. */
  finishedAt: string | null;
}

export interface ActivitySnapshot {
  /** Running first, then queued. */
  items: ActivityItem[];
  running: number;
  queued: number;
  /** Latest finished (completed/failed) work, newest first. */
  recent: ActivityItem[];
}

/** How many finished processes the activity panel keeps. */
export const ACTIVITY_HISTORY_LIMIT = 5;

const KIND_BY_JOB_TYPE: Record<string, ActivityKind> = {
  'media.analyze-source': 'media-analysis',
  'media.check-playability': 'media-check',
  'media.transcribe-source': 'transcription',
  'search.extract-content': 'content-extraction',
  'search.embed-chunks': 'embeddings',
};

const LABELS: Record<ActivityKind, string> = {
  scan: 'Atualizando biblioteca',
  'media-analysis': 'Análise de mídia',
  'media-check': 'Verificação de vídeos',
  transcription: 'Transcrição',
  'content-extraction': 'Indexação de documentos',
  embeddings: 'Busca inteligente',
  other: 'Processamento',
};

export function activityKindOf(jobType: string): ActivityKind {
  return KIND_BY_JOB_TYPE[jobType] ?? 'other';
}

/** Human label in pt-BR, suffixed with the library name when there is one. */
export function describeActivity(kind: ActivityKind, sourceName: string | null): string {
  return sourceName ? `${LABELS[kind]} · ${sourceName}` : LABELS[kind];
}

/** Work that ended with nothing to process (total 0) is not worth showing. */
export function shouldRecordFinished(progress: ActivityProgress | null): boolean {
  return !(progress && progress.total === 0);
}

/** Prepends a finished entry, keeping only the newest `limit`. */
export function recordFinished<T extends { id: string }>(
  history: readonly T[],
  item: T,
  limit: number = ACTIVITY_HISTORY_LIMIT,
): T[] {
  return [item, ...history.filter((entry) => entry.id !== item.id)].slice(0, limit);
}

export function progressPercent(progress: ActivityProgress | null): number | null {
  if (!progress || progress.total === null || progress.total <= 0) return null;
  const ratio = Math.min(Math.max(progress.done / progress.total, 0), 1);
  return Math.round(ratio * 100);
}

/** Running first, then queued; oldest first inside each group. */
export function sortActivities(items: readonly ActivityItem[]): ActivityItem[] {
  const rank = (status: ActivityStatus) => (status === 'running' ? 0 : 1);
  return [...items].sort(
    (a, b) => rank(a.status) - rank(b.status) || a.startedAt.localeCompare(b.startedAt),
  );
}
