import { randomUUID } from 'node:crypto';
import { resolveAppDataDir } from '../../core/app-paths';
import { ConflictError, NotFoundError, PersistenceError, ValidationError } from '../../core/errors';
import type { Midoteca } from '../../app/composition-root';
import { getCurrentVersion } from '../persistence/sqlite/migrator';
import {
  DESKTOP_METHODS,
  type DesktopErrorPayload,
  type DesktopMethod,
  type DesktopParams,
  type DesktopRequest,
  type DesktopResponse,
} from './contract';

/**
 * Transport-agnostic implementation of the desktop RPC surface. It only
 * serializes/validates inputs and delegates to the kernel; all rules live in
 * the domain/use cases. Transports (Electron IPC, tests, a local worker) call
 * `handle` and never touch the kernel directly.
 */
export interface DesktopApi {
  handle(request: DesktopRequest): Promise<DesktopResponse>;
}

const METHOD_SET = new Set<string>(DESKTOP_METHODS);

function isMethod(value: unknown): value is DesktopMethod {
  return typeof value === 'string' && METHOD_SET.has(value);
}

/** Maps a thrown error to a serializable, renderer-friendly envelope. */
export function toErrorPayload(error: unknown): DesktopErrorPayload {
  if (error instanceof NotFoundError) {
    return { kind: 'not_found', name: error.name, message: error.message };
  }
  if (error instanceof ValidationError) {
    return { kind: 'validation', name: error.name, message: error.message };
  }
  if (error instanceof ConflictError) {
    return { kind: 'conflict', name: error.name, message: error.message };
  }
  if (error instanceof PersistenceError) {
    return { kind: 'persistence', name: error.name, message: error.message };
  }
  if (error instanceof Error) {
    return { kind: 'unknown', name: error.name, message: error.message };
  }
  return { kind: 'unknown', name: 'Error', message: String(error) };
}

/**
 * Builds the desktop API over an open kernel. The returned `handle` is the only
 * entry point transports need; it never throws (failures come back as
 * `{ ok: false }` envelopes) so a transport cannot accidentally crash on a
 * domain error.
 */
export function createDesktopApi(midoteca: Midoteca): DesktopApi {
  const runningAnswers = new Map<string, AbortController>();

  /** Runs an answer in the background, streaming through the event bus. */
  function startAnswer(input: DesktopParams['assistant.ask']): { requestId: string } {
    const requestId = randomUUID();
    const controller = new AbortController();
    runningAnswers.set(requestId, controller);
    void midoteca.assistant
      .ask(input, {
        signal: controller.signal,
        onToken: (token) => midoteca.events.emit('assistant:token', { requestId, token }),
      })
      .then((answer) => midoteca.events.emit('assistant:done', { requestId, answer }))
      .catch((error: unknown) =>
        midoteca.events.emit('assistant:error', {
          requestId,
          message: toErrorPayload(error).message,
          cancelled: controller.signal.aborted,
        }),
      )
      .finally(() => runningAnswers.delete(requestId));
    return { requestId };
  }

  async function dispatch(method: DesktopMethod, params: unknown): Promise<unknown> {
    switch (method) {
      case 'activity.list':
        return midoteca.activity.snapshot();

      case 'system.info':
        return {
          appDataDir: resolveAppDataDir(),
          databaseFile: midoteca.database.file,
          schemaVersion: getCurrentVersion(midoteca.database),
          migrationApplied: midoteca.migration !== null,
        };

      case 'system.setPlaybackActive': {
        const { active } = params as DesktopParams['system.setPlaybackActive'];
        midoteca.governor.updateSignals({ playbackActive: active === true });
        return null;
      }

      case 'sources.list':
        return midoteca.sources.listSources();

      case 'sources.add': {
        const input = params as {
          rootPath: string;
          displayName?: string | null;
          libraryType?: 'course' | 'movie';
        };
        return midoteca.sources.addSource({
          rootPath: input.rootPath,
          displayName: input.displayName ?? null,
          libraryType: input.libraryType,
        });
      }

      case 'sources.remove': {
        const { sourceId } = params as { sourceId: string };
        await midoteca.sources.removeSource(sourceId);
        return undefined;
      }

      case 'sources.check': {
        const { sourceId } = params as { sourceId: string };
        await midoteca.sources.checkAvailability(sourceId);
        return midoteca.sources.getSource(sourceId);
      }

      case 'sources.updatePath': {
        const { sourceId, rootPath } = params as { sourceId: string; rootPath: string };
        return midoteca.sources.updateSourcePath(sourceId, rootPath);
      }

      case 'sources.rename': {
        const { sourceId, displayName } = params as { sourceId: string; displayName: string };
        return midoteca.sources.updateSourceName(sourceId, displayName);
      }

      case 'indexing.scan': {
        const { sourceId } = params as { sourceId: string };
        return midoteca.indexer.runScan({ sourceId });
      }

      case 'indexing.status': {
        const { sourceId } = params as { sourceId: string };
        return midoteca.queries.getSourceIndexState(sourceId);
      }

      case 'catalog.listCourses': {
        const query = params as { limit?: number; offset?: number; sourceId?: string };
        return midoteca.queries.listCourses(query);
      }

      case 'catalog.listDocuments': {
        const query = params as { limit?: number; offset?: number; sourceId?: string };
        return midoteca.queries.listDocuments(query);
      }

      case 'catalog.listCollections': {
        const query = params as { limit?: number; offset?: number; sourceId?: string };
        return midoteca.queries.listCollections(query);
      }

      case 'catalog.getCollectionTree': {
        const { collectionId } = params as { collectionId: string };
        return midoteca.queries.getCollectionTree(collectionId);
      }

      case 'catalog.search': {
        const { text, filter, limit, offset } = params as DesktopParams['catalog.search'];
        return midoteca.queries.search(text, { filter, limit, offset });
      }

      case 'catalog.getCourseTree': {
        const { courseId } = params as { courseId: string };
        return midoteca.courses.getTree(courseId);
      }

      case 'courses.list':
        return midoteca.courses.list();

      case 'courses.saveOrganization':
        return midoteca.courseOrganization.saveCourseOrganization(
          params as Parameters<Midoteca['courseOrganization']['saveCourseOrganization']>[0],
        );

      case 'documents.list':
        return midoteca.documents.list();

      case 'documents.updatePageCount': {
        const { documentId, pageCount } = params as { documentId: string; pageCount: number };
        return midoteca.documents.update({ id: documentId, pageCount });
      }

      case 'documents.rename': {
        const { documentId, title } = params as { documentId: string; title: string };
        return midoteca.documents.update({ id: documentId, title });
      }

      case 'media.listBySource': {
        const { sourceId } = params as { sourceId: string };
        return midoteca.media.listBySource(sourceId);
      }

      case 'media.listTracks': {
        const { mediaFileId } = params as { mediaFileId: string };
        return midoteca.media.listTracks(mediaFileId);
      }

      case 'progress.getPlayback': {
        const { lessonId } = params as { lessonId: string };
        return midoteca.progress.getPlayback(lessonId);
      }

      case 'progress.savePlayback': {
        // Completion is decided by the backend; only the resume point is kept.
        const { lessonId, positionMs, durationMs } =
          params as DesktopParams['progress.savePlayback'];
        return midoteca.watchProgress.savePosition({ lessonId, positionMs, durationMs });
      }

      case 'progress.recordSegment':
        return midoteca.watchProgress.recordSegment(
          params as DesktopParams['progress.recordSegment'],
        );

      case 'progress.markDuplicateAsWatched':
        return midoteca.duplicates.markAsWatched(
          params as DesktopParams['progress.markDuplicateAsWatched'],
        );

      case 'media.listDuplicateGroups':
        return midoteca.duplicates.listGroups();

      case 'media.analysisStatus':
        return midoteca.duplicates.analysisStatus();

      case 'search.content':
        return midoteca.contentSearch.search(params as DesktopParams['search.content']);

      case 'search.contentStatus':
        return midoteca.contentSearch.status();

      case 'subtitles.forLesson': {
        const { lessonId } = params as DesktopParams['subtitles.forLesson'];
        return midoteca.subtitles.forLesson(lessonId);
      }

      case 'ai.status':
        return midoteca.ai.status();

      case 'ai.setEnabled': {
        const { enabled } = params as DesktopParams['ai.setEnabled'];
        return midoteca.ai.setEnabled(enabled);
      }

      case 'ai.removeModels':
        return midoteca.ai.removeModels();

      case 'assistant.ask': {
        const input = params as DesktopParams['assistant.ask'];
        if (typeof input?.question !== 'string' || !input.question.trim()) {
          throw new ValidationError('Field "question" must not be empty');
        }
        return startAnswer(input);
      }

      case 'assistant.cancel': {
        const { requestId } = params as DesktopParams['assistant.cancel'];
        const controller = runningAnswers.get(requestId);
        controller?.abort();
        return { cancelled: !!controller };
      }

      case 'progress.setLessonCompletion':
        return midoteca.watchProgress.setCompletion(
          params as DesktopParams['progress.setLessonCompletion'],
        );

      case 'progress.getReading': {
        const { documentId } = params as { documentId: string };
        return midoteca.progress.getReading(documentId);
      }

      case 'progress.saveReading':
        return midoteca.progress.saveReading(
          params as Parameters<Midoteca['progress']['saveReading']>[0],
        );

      case 'settings.get': {
        const { key } = params as { key: string };
        return midoteca.settings.get(key);
      }

      case 'settings.set': {
        const { key, value } = params as {
          key: string;
          value: Parameters<Midoteca['settings']['set']>[1];
        };
        return midoteca.settings.set(key, value);
      }

      case 'settings.list':
        return midoteca.settings.list();
    }
  }

  return {
    async handle(request: DesktopRequest): Promise<DesktopResponse> {
      try {
        if (!isMethod(request?.method)) {
          throw new ValidationError(`Unknown desktop method: ${String(request?.method)}`);
        }
        const data = await dispatch(request.method, request.params);
        return { ok: true, data } as DesktopResponse;
      } catch (error) {
        return { ok: false, error: toErrorPayload(error) };
      }
    },
  };
}
