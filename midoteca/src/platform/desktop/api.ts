import { resolveAppDataDir } from '../../core/app-paths';
import { ConflictError, NotFoundError, PersistenceError, ValidationError } from '../../core/errors';
import type { Midoteca } from '../../app/composition-root';
import { getCurrentVersion } from '../persistence/sqlite/migrator';
import {
  DESKTOP_METHODS,
  type DesktopErrorPayload,
  type DesktopMethod,
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
  async function dispatch(method: DesktopMethod, params: unknown): Promise<unknown> {
    switch (method) {
      case 'system.info':
        return {
          appDataDir: resolveAppDataDir(),
          databaseFile: midoteca.database.file,
          schemaVersion: getCurrentVersion(midoteca.database),
          migrationApplied: midoteca.migration !== null,
        };

      case 'sources.list':
        return midoteca.sources.listSources();

      case 'sources.add': {
        const input = params as { rootPath: string; displayName?: string | null };
        return midoteca.sources.addSource({
          rootPath: input.rootPath,
          displayName: input.displayName ?? null,
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

      case 'catalog.search': {
        const { text, limit, offset } = params as {
          text: string;
          limit?: number;
          offset?: number;
        };
        return midoteca.queries.search(text, { limit, offset });
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

      case 'progress.savePlayback':
        return midoteca.progress.savePlayback(
          params as Parameters<Midoteca['progress']['savePlayback']>[0],
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
