import type { IndexSummary } from './types';

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
  | 'index:failed';

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
}

export type LibraryEventHandler<K extends LibraryEvent> = (
  payload: LibraryEventPayloads[K],
) => void;

export interface EventBus {
  emit<K extends LibraryEvent>(type: K, payload: LibraryEventPayloads[K]): void;
  on<K extends LibraryEvent>(type: K, handler: LibraryEventHandler<K>): () => void;
}
