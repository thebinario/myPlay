import type { JsonValue } from '../../core/json';
import type { Course, CourseTree, SaveCourseOrganization } from '../../modules/courses';
import type { Document } from '../../modules/documents';
import type { IndexSummary, LibraryEvent } from '../../modules/indexing';
import type {
  CourseSummary,
  CatalogSearchFilter,
  CatalogSearchHit,
  CollectionSummary,
  CollectionTree,
  DocumentSummary,
  LibrarySource,
  Paged,
  SourceIndexState,
} from '../../modules/library';
import type { LocalAiStatus } from '../../app/local-ai';
import type { AskQuestionInput } from '../../modules/assistant';
import type {
  DuplicateGroup,
  SubtitleTrackView,
  MarkDuplicateAsWatchedInput,
  MediaAnalysisStatus,
  MediaFile,
  MediaTrack,
} from '../../modules/media';
import type {
  PlaybackProgress,
  ReadingProgress,
  RecordPlaybackSegmentInput,
  SavePlaybackPositionInput,
  SaveReadingProgress,
  SetLessonCompletionInput,
} from '../../modules/progress';
import type { AppSetting } from '../../modules/settings';
import type { ContentHit, ContentIndexStatus, ContentSearchQuery } from '../../modules/search';
import type { LibraryType } from '../../modules/library';
import type { ActivitySnapshot } from '../../modules/jobs';

/**
 * Transport-agnostic contract of the desktop RPC surface.
 *
 * It is the single source of truth for the frontend ↔ core protocol: method
 * names, request params and response payloads. Everything here must be
 * **JSON-serializable** (no `Date`, `Map`, class instances or functions), which
 * is why it reuses the domain entities (already plain objects) as DTOs.
 *
 * The core implements it in `api.ts`; Electron's main process registers it and
 * the renderer consumes it through a thin bridge. No transport type leaks in.
 */

export const DESKTOP_METHODS = [
  'activity.list',
  'system.info',
  'system.setPlaybackActive',
  'sources.list',
  'sources.add',
  'sources.remove',
  'sources.check',
  'sources.updatePath',
  'sources.rename',
  'indexing.scan',
  'indexing.status',
  'catalog.listCourses',
  'catalog.listDocuments',
  'catalog.listCollections',
  'catalog.getCollectionTree',
  'catalog.search',
  'catalog.getCourseTree',
  'courses.list',
  'courses.saveOrganization',
  'documents.list',
  'documents.updatePageCount',
  'documents.rename',
  'media.listBySource',
  'media.listTracks',
  'progress.getPlayback',
  'progress.savePlayback',
  'progress.recordSegment',
  'progress.setLessonCompletion',
  'progress.markDuplicateAsWatched',
  'media.listDuplicateGroups',
  'media.analysisStatus',
  'search.content',
  'search.contentStatus',
  'subtitles.forLesson',
  'ai.status',
  'ai.setEnabled',
  'ai.removeModels',
  'assistant.ask',
  'assistant.cancel',
  'progress.getReading',
  'progress.saveReading',
  'settings.get',
  'settings.set',
  'settings.list',
] as const;

export type DesktopMethod = (typeof DESKTOP_METHODS)[number];

export interface PageParams {
  limit?: number;
  offset?: number;
}

export interface SystemInfo {
  appDataDir: string;
  databaseFile: string;
  schemaVersion: number;
  migrationApplied: boolean;
}

/** Request params per method. `undefined` means the method takes no params. */
export interface DesktopParams {
  'activity.list': undefined;
  'system.info': undefined;
  /** Renderer signals media playback so background jobs back off. */
  'system.setPlaybackActive': { active: boolean };
  'sources.list': undefined;
  'sources.add': { rootPath: string; displayName?: string | null; libraryType?: LibraryType };
  'sources.remove': { sourceId: string };
  'sources.check': { sourceId: string };
  'sources.updatePath': { sourceId: string; rootPath: string };
  'sources.rename': { sourceId: string; displayName: string };
  'indexing.scan': { sourceId: string };
  'indexing.status': { sourceId: string };
  'catalog.listCourses': PageParams & { sourceId?: string };
  'catalog.listDocuments': PageParams & { sourceId?: string };
  'catalog.listCollections': PageParams & { sourceId?: string };
  'catalog.getCollectionTree': { collectionId: string };
  'catalog.search': PageParams & { text: string; filter?: CatalogSearchFilter };
  'catalog.getCourseTree': { courseId: string };
  'courses.list': undefined;
  'courses.saveOrganization': SaveCourseOrganization;
  'documents.list': undefined;
  'documents.updatePageCount': { documentId: string; pageCount: number };
  'documents.rename': { documentId: string; title: string };
  'media.listBySource': { sourceId: string };
  'media.listTracks': { mediaFileId: string };
  'progress.getPlayback': { lessonId: string };
  /** Resume position only; completion sent by the renderer is ignored. */
  'progress.savePlayback': SavePlaybackPositionInput & { completedAt?: string | null };
  'progress.recordSegment': RecordPlaybackSegmentInput;
  'progress.setLessonCompletion': SetLessonCompletionInput;
  'progress.markDuplicateAsWatched': MarkDuplicateAsWatchedInput;
  'media.listDuplicateGroups': Record<string, never>;
  'media.analysisStatus': Record<string, never>;
  /** Full-text search in PDF/subtitle/transcript text (FTS5, accent-insensitive). */
  'search.content': ContentSearchQuery;
  'search.contentStatus': Record<string, never>;
  /** Subtitle files and local transcript of a lesson, already parsed. */
  'subtitles.forLesson': { lessonId: string };
  'ai.status': Record<string, never>;
  'ai.setEnabled': { enabled: boolean };
  /** Deletes downloaded models (app data only). */
  'ai.removeModels': Record<string, never>;
  /** Starts a local RAG answer; tokens and result arrive as `assistant:*` events. */
  'assistant.ask': AskQuestionInput;
  'assistant.cancel': { requestId: string };
  'progress.getReading': { documentId: string };
  'progress.saveReading': SaveReadingProgress;
  'settings.get': { key: string };
  'settings.set': { key: string; value: JsonValue };
  'settings.list': undefined;
}

/** Response payload per method. */
export interface DesktopResults {
  /** Background work (scans, analysis, transcription, indexing) to show live. */
  'activity.list': ActivitySnapshot;
  'system.info': SystemInfo;
  'system.setPlaybackActive': null;
  'sources.list': LibrarySource[];
  'sources.add': LibrarySource;
  'sources.remove': void;
  'sources.check': LibrarySource;
  'sources.updatePath': LibrarySource;
  'sources.rename': LibrarySource;
  'indexing.scan': IndexSummary;
  'indexing.status': SourceIndexState | null;
  'catalog.listCourses': Paged<CourseSummary>;
  'catalog.listDocuments': Paged<DocumentSummary>;
  'catalog.listCollections': Paged<CollectionSummary>;
  'catalog.getCollectionTree': CollectionTree | null;
  'catalog.search': CatalogSearchHit[];
  'catalog.getCourseTree': CourseTree | null;
  'courses.list': Course[];
  'courses.saveOrganization': CourseTree;
  'documents.list': Document[];
  'documents.updatePageCount': Document;
  'documents.rename': Document;
  'media.listBySource': MediaFile[];
  'media.listTracks': MediaTrack[];
  'progress.getPlayback': PlaybackProgress | null;
  'progress.savePlayback': PlaybackProgress;
  'progress.recordSegment': PlaybackProgress;
  'progress.setLessonCompletion': PlaybackProgress;
  'progress.markDuplicateAsWatched': PlaybackProgress;
  'media.listDuplicateGroups': DuplicateGroup[];
  'media.analysisStatus': MediaAnalysisStatus;
  'search.content': ContentHit[];
  'search.contentStatus': ContentIndexStatus;
  'subtitles.forLesson': SubtitleTrackView[];
  'ai.status': LocalAiStatus;
  'ai.setEnabled': LocalAiStatus;
  'ai.removeModels': LocalAiStatus;
  'assistant.ask': { requestId: string };
  'assistant.cancel': { cancelled: boolean };
  'progress.getReading': ReadingProgress | null;
  'progress.saveReading': ReadingProgress;
  'settings.get': AppSetting | null;
  'settings.set': AppSetting;
  'settings.list': AppSetting[];
}

/** Domain error kind, so the renderer can react without string matching. */
export type DesktopErrorKind = 'not_found' | 'validation' | 'conflict' | 'persistence' | 'unknown';

export interface DesktopErrorPayload {
  kind: DesktopErrorKind;
  name: string;
  message: string;
}

export type DesktopResponse<M extends DesktopMethod = DesktopMethod> =
  { ok: true; data: DesktopResults[M] } | { ok: false; error: DesktopErrorPayload };

/** A request as it travels over any transport. */
export interface DesktopRequest {
  method: DesktopMethod;
  params?: unknown;
}

/** Events pushed from the core/main to the renderer (cache invalidation). */
export type DesktopEventName = LibraryEvent;

export interface DesktopEvent {
  name: DesktopEventName;
  payload: JsonValue;
}

/** Every core event forwarded from the main process to the renderer. */
export const DESKTOP_EVENTS: readonly DesktopEventName[] = [
  'source:added',
  'source:connected',
  'source:disconnected',
  'media:discovered',
  'media:updated',
  'media:unavailable',
  'course:organized',
  'index:started',
  'index:progress',
  'index:paused',
  'index:completed',
  'index:failed',
  'assistant:token',
  'assistant:done',
  'assistant:error',
  'activity:changed',
];
