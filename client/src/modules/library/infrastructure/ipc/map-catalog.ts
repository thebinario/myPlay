import type { CourseTree, DocumentSummary, MediaFile } from '@midoteca/core';
import type { Course, CourseModule, Document, Lesson, Movie } from '@/core/domain/library';

/**
 * Pure projections from the kernel catalog (`CourseTree`, `DocumentSummary`,
 * `MediaFile`) onto the frontend catalog model. Kept free of IPC/React so the
 * mapping rules are unit-testable and the adapter stays thin.
 *
 * The kernel model is leaner than the UI model (no `movies`, no per-course
 * category/tags). Missing fields are degraded explicitly: category and tags
 * come from course metadata; course metrics come from the backend read model;
 * `progress`/`completed` remain initial values while progress migration is pending.
 */

type Metadata = Record<string, unknown> | null;

/** Builds a desktop media URL, resolving the file against its source root. */
export function buildMediaUrl(
  rootPath: string | undefined,
  relativePath: string | null | undefined,
): string {
  if (!rootPath || !relativePath) return '';
  const base = rootPath.replace(/[\\/]+$/, '');
  const relative = relativePath.replace(/^[\\/]+/, '');
  return `midoteca-media://media/${encodeURIComponent(`${base}/${relative}`)}`;
}

function stringField(metadata: Metadata, key: string): string | undefined {
  const value = metadata?.[key];
  return typeof value === 'string' ? value : undefined;
}

function stringArrayField(metadata: Metadata, key: string): string[] {
  const value = metadata?.[key];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

/** Projects an indexed video that is not already attached to a course lesson. */
export function mapStandaloneVideo(
  file: MediaFile,
  sourceRootById: ReadonlyMap<string, string>,
): Movie {
  const fileName = file.relativePath.split(/[\\/]/).pop() ?? file.relativePath;
  const title =
    fileName
      .replace(/\.[^.]+$/, '')
      .replace(/[._-]+/g, ' ')
      .trim() || fileName;
  return {
    id: file.id,
    sourceId: file.sourceId,
    type: 'movie',
    title,
    description: '',
    category: '',
    coverUrl: '',
    duration: file.durationMs ? Math.round(file.durationMs / 1000) : 0,
    progress: 0,
    videoUrl: buildMediaUrl(sourceRootById.get(file.sourceId), file.relativePath),
    tags: [],
    createdAt: file.createdAt,
  };
}

/** Projects a fully materialized kernel course tree onto the UI `Course`. */
export function mapCourseTree(
  tree: CourseTree,
  mediaById: ReadonlyMap<string, MediaFile>,
  sourceRootById: ReadonlyMap<string, string>,
): Course {
  const modules: CourseModule[] = [...tree.modules]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((module) => ({
      id: module.id,
      courseId: module.courseId,
      title: module.title,
      order: module.sortOrder,
      documents: module.documents.map((document) =>
        mapTreeDocument(document, mediaById, sourceRootById),
      ),
      lessons: [...module.lessons]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((lesson): Lesson => {
          const files = lesson.media
            .map((link) => mediaById.get(link.mediaFileId))
            .filter((file): file is MediaFile => file !== undefined);
          const primary = files.find((file) => file.mediaType === 'video') ?? files[0];
          const root = primary ? sourceRootById.get(primary.sourceId) : undefined;
          return {
            id: lesson.id,
            moduleId: module.id,
            title: lesson.title,
            duration: primary?.durationMs ? Math.round(primary.durationMs / 1000) : 0,
            completed: false,
            isUnavailable: primary ? primary.availability === 'missing' : undefined,
            videoUrl: primary ? buildMediaUrl(root, primary.relativePath) : '',
            order: lesson.sortOrder,
            materials: [],
          };
        }),
    }));

  return {
    id: tree.course.id,
    sourceId: tree.course.sourceId,
    type: 'course',
    title: tree.course.title,
    description: tree.course.description ?? '',
    category: stringField(tree.course.metadata, 'category') ?? '',
    coverUrl: stringField(tree.course.metadata, 'coverUrl') ?? '',
    totalDuration: tree.totalDurationSeconds,
    pdfCount: tree.pdfCount,
    documents: tree.documents.map((document) =>
      mapTreeDocument(document, mediaById, sourceRootById),
    ),
    progress: tree.completionPercentage,
    modules,
    tags: stringArrayField(tree.course.metadata, 'tags'),
    createdAt: tree.course.createdAt,
  };
}

function mapTreeDocument(
  summary: CourseTree['documents'][number],
  mediaById: ReadonlyMap<string, MediaFile>,
  sourceRootById: ReadonlyMap<string, string>,
): Document {
  const file = mediaById.get(summary.mediaFileId);
  const root = file ? sourceRootById.get(file.sourceId) : undefined;
  return {
    id: summary.id,
    sourceId: file?.sourceId ?? null,
    type: 'document',
    title: summary.title,
    description: '',
    category: '',
    totalPages: summary.pageCount ?? 0,
    lastReadPage: 1,
    fileUrl: file ? buildMediaUrl(root, file.relativePath) : '',
    tags: [],
    createdAt: file?.createdAt ?? '',
    isUnavailable: file ? file.availability === 'missing' : undefined,
  };
}

/** Projects a kernel document summary onto the UI `Document`. */
export function mapDocumentSummary(
  summary: DocumentSummary,
  mediaById: ReadonlyMap<string, MediaFile>,
  sourceRootById: ReadonlyMap<string, string>,
): Document {
  const file = mediaById.get(summary.mediaFileId);
  const root = file ? sourceRootById.get(file.sourceId) : undefined;
  return {
    id: summary.id,
    sourceId: file?.sourceId ?? null,
    type: 'document',
    title: summary.title,
    description: '',
    category: '',
    totalPages: summary.pageCount ?? 0,
    lastReadPage: 1,
    fileUrl: file ? buildMediaUrl(root, file.relativePath) : '',
    tags: [],
    createdAt: file?.createdAt ?? '',
    isUnavailable: file ? file.availability === 'missing' : undefined,
  };
}
