import type { CourseTree, MediaFile, ReadingProgress } from '@midoteca/core';
import type { MidotecaBridge } from '@/core/contracts/desktop-bridge';
import type { Document, LibraryItem } from '@/core/domain/library';
import {
  mapCourseTree,
  mapDocumentSummary,
  mapStandaloneVideo,
} from '@/modules/library/infrastructure/ipc/map-catalog';

/** Loads the production library projection from the SQLite-backed core. */
export async function loadLibraryCatalog(bridge: MidotecaBridge): Promise<LibraryItem[]> {
  const sources = await bridge.invoke('sources.list');
  const roots = new Map(sources.map((source) => [source.id, source.rootPath]));
  const sourceTypes = new Map(sources.map((source) => [source.id, source.libraryType]));
  const media = await loadSourceMedia(
    bridge,
    sources.map((source) => source.id),
  );
  const courses = await listAllPages((offset) =>
    bridge.invoke('catalog.listCourses', { limit: 200, offset }),
  );
  const trees = await Promise.all(
    courses.map((course) =>
      bridge.invoke('catalog.getCourseTree', { courseId: course.id }).catch(() => null),
    ),
  );
  const documents = await listAllPages((offset) =>
    bridge.invoke('catalog.listDocuments', { limit: 200, offset }),
  );
  const completeTrees = trees.filter(
    (tree): tree is CourseTree =>
      tree !== null && sourceTypes.get(tree.course.sourceId ?? '') !== 'movie',
  );
  const linkedDocumentIds = collectLinkedDocumentIds(completeTrees);
  const standaloneDocuments = documents.filter((document) => {
    const mediaFile = media.get(document.mediaFileId);
    return (
      mediaFile &&
      sourceTypes.get(mediaFile.sourceId) !== 'movie' &&
      !linkedDocumentIds.has(document.id)
    );
  });
  const linkedMedia = collectLinkedMedia(
    completeTrees,
    standaloneDocuments.map((doc) => doc.mediaFileId),
  );
  const lessonIds = completeTrees.flatMap((tree) =>
    tree.modules.flatMap((module) => module.lessons.map((lesson) => lesson.id)),
  );
  const [playbackProgress, readingProgress] = await Promise.all([
    Promise.all(
      lessonIds.map((lessonId) =>
        bridge.invoke('progress.getPlayback', { lessonId }).catch(() => null),
      ),
    ),
    Promise.all(
      documents.map((document) =>
        bridge.invoke('progress.getReading', { documentId: document.id }).catch(() => null),
      ),
    ),
  ]);
  const playbackByLessonId = new Map(
    playbackProgress
      .filter((progress) => progress !== null)
      .map((progress) => [progress.lessonId, progress]),
  );
  const readingByDocumentId = new Map(
    readingProgress
      .filter((progress) => progress !== null)
      .map((progress) => [progress.documentId, progress]),
  );

  return [
    ...completeTrees.map((tree) => {
      const course = mapCourseTree(tree, media, roots);
      const modules = course.modules.map((module) => ({
        ...module,
        lessons: module.lessons.map((lesson) => ({
          ...lesson,
          completed: !!playbackByLessonId.get(lesson.id)?.completedAt,
          ...(playbackByLessonId.has(lesson.id)
            ? { lastPlaybackPosition: (playbackByLessonId.get(lesson.id)?.positionMs ?? 0) / 1000 }
            : {}),
        })),
        documents: module.documents?.map((document) =>
          applyReadingProgress(document, readingByDocumentId.get(document.id)),
        ),
      }));
      const documents = course.documents?.map((document) =>
        applyReadingProgress(document, readingByDocumentId.get(document.id)),
      );
      const totalLessons = modules.reduce((total, module) => total + module.lessons.length, 0);
      const completedLessons = modules.reduce(
        (total, module) => total + module.lessons.filter((lesson) => lesson.completed).length,
        0,
      );
      return {
        ...course,
        modules,
        documents,
        progress: totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0,
      };
    }),
    ...standaloneDocuments.map((document) =>
      applyReadingProgress(
        mapDocumentSummary(document, media, roots),
        readingByDocumentId.get(document.id),
      ),
    ),
    ...[...media.values()]
      .filter((file) => {
        if (file.mediaType !== 'video') return false;
        const isMovieLibrary = sourceTypes.get(file.sourceId) === 'movie';
        return isMovieLibrary || !linkedMedia.has(file.id);
      })
      .map((file) => mapStandaloneVideo(file, roots)),
  ];
}

function applyReadingProgress(
  document: Document,
  progress: ReadingProgress | null | undefined,
): Document {
  if (!progress) return document;
  return {
    ...document,
    lastReadPage: progress.page,
    isRead: !!progress.completedAt,
    readingState: {
      currentPage: progress.page,
      relativeScrollPosition: progress.scrollRatio,
      zoom: progress.zoom,
      colorMode: progress.theme === 'original' ? 'original' : 'dark',
      lastAccessedAt: progress.updatedAt,
      completedAt: progress.completedAt,
    },
  };
}

function collectLinkedDocumentIds(trees: CourseTree[]): Set<string> {
  const ids = trees.flatMap((tree) => [
    ...tree.documents.map((document) => document.id),
    ...tree.modules.flatMap((module) => module.documents.map((document) => document.id)),
  ]);
  return new Set(ids);
}

interface PageResult<T> {
  items: T[];
  total: number;
}

async function listAllPages<T>(load: (offset: number) => Promise<PageResult<T>>): Promise<T[]> {
  const all: T[] = [];
  let offset = 0;
  while (true) {
    const page = await load(offset);
    if (page.items.length === 0) break;
    all.push(...page.items);
    offset += page.items.length;
    if (offset >= page.total) break;
  }
  return all;
}

async function loadSourceMedia(
  bridge: MidotecaBridge,
  sourceIds: string[],
): Promise<Map<string, MediaFile>> {
  const files = await Promise.all(
    sourceIds.map((sourceId) => bridge.invoke('media.listBySource', { sourceId })),
  );
  return new Map(files.flat().map((file) => [file.id, file]));
}

function collectLinkedMedia(trees: CourseTree[], documentMediaIds: string[]): Set<string> {
  const ids = trees.flatMap((tree) =>
    tree.modules.flatMap((module) =>
      module.lessons.flatMap((lesson) => lesson.media.map((link) => link.mediaFileId)),
    ),
  );
  return new Set([...ids, ...documentMediaIds]);
}
