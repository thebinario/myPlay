import type { IndexSummary } from './types';

/**
 * Serialized assistant answer carried by `assistant:done`. Kept structural here
 * so the event bus does not depend on the assistant module.
 */
export interface AssistantAnswerPayload {
  text: string;
  sources: unknown[];
  citations: unknown[];
}

/**
 * Snapshot of the background activity carried by `activity:changed`. Kept
 * structural so the event bus does not depend on the jobs module (the typed
 * shape is `ActivitySnapshot` in `modules/jobs/domain/activity`).
 */
export interface ActivitySnapshotPayload {
  items: unknown[];
  running: number;
  queued: number;
}

/**
 * Internal, transport-agnostic library events. A desktop layer (IPC/WebSocket)
 * can subscribe and forward them; the core never assumes a transport.
 */
export type LibraryEvent =
  | 'source:added'
  | 'source:connected'
  | 'source:disconnected'
  | 'media:discovered'
  | 'media:updated'
  | 'media:unavailable'
  | 'course:organized'
  | 'index:started'
  | 'index:progress'
  | 'index:paused'
  | 'index:completed'
  | 'index:failed'
  | 'assistant:token'
  | 'assistant:done'
  | 'assistant:error'
  | 'activity:changed';

export interface LibraryEventPayloads {
  'source:added': { sourceId: string; rootPath: string; displayName: string | null };
  'source:connected': { sourceId: string; rootPath: string };
  'source:disconnected': { sourceId: string; rootPath: string };
  'media:discovered': {
    mediaId: string;
    sourceId: string;
    relativePath: string;
  };
  'media:updated': {
    mediaId: string;
    sourceId: string;
    relativePath: string;
    reason: 'modified' | 'moved';
  };
  'media:unavailable': {
    mediaId: string;
    sourceId: string;
    relativePath: string;
  };
  'course:organized': {
    courseId: string;
    sourceId: string;
    relativePath: string;
    created: boolean;
  };
  'index:started': { sourceId: string };
  'index:progress': {
    sourceId: string;
    matched: number;
    visited: number;
    currentPath: string | null;
  };
  'index:paused': { sourceId: string; reason: 'cancelled' | 'paused' };
  'index:completed': { sourceId: string; summary: IndexSummary };
  'index:failed': { sourceId: string; message: string };
  /** Streaming of a local assistant answer (see `assistant.ask`). */
  'assistant:token': { requestId: string; token: string };
  'assistant:done': { requestId: string; answer: AssistantAnswerPayload };
  'assistant:error': { requestId: string; message: string; cancelled: boolean };
  /** Background work changed (job started/progressed/finished, scan state). */
  'activity:changed': ActivitySnapshotPayload;
}

export type LibraryEventHandler<K extends LibraryEvent> = (
  payload: LibraryEventPayloads[K],
) => void;

export interface EventBus {
  emit<K extends LibraryEvent>(type: K, payload: LibraryEventPayloads[K]): void;
  on<K extends LibraryEvent>(type: K, handler: LibraryEventHandler<K>): () => void;
}
