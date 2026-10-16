import type { CourseTree, DocumentSummary, MediaFile } from '@midoteca/core';
import type { Course, CourseModule, Document, Lesson } from '@/core/domain/library';

/**
 * Pure projections from the kernel catalog (`CourseTree`, `DocumentSummary`,
 * `MediaFile`) onto the frontend catalog model. Kept free of IPC/React so the
 * mapping rules are unit-testable and the adapter stays thin.
 *
 * The kernel model is leaner than the UI model (no `movies`, no per-course
 * category/tags/duration). Missing fields are degraded explicitly: category and
 * tags come from the course `metadata`, duration is derived from the linked
 * media and `progress`/`completed` stay at their initial values (progress lives
 * in the `progress` context and is delegated, see `IpcLibraryRepository`).
 */

type Metadata = Record<string, unknown> | null;

/** Builds a `file://` URL for a media file, resolving it against the source root. */
export function buildMediaUrl(
  rootPath: string | undefined,
  relativePath: string | null | undefined,
): string {
  if (!rootPath || !relativePath) return '';
  const base = rootPath.replace(/[\\/]+$/, '');
  const relative = relativePath.replace(/^[\\/]+/, '');
  return `file://${encodeURI(`${base}/${relative}`)}`;
}

function stringField(metadata: Metadata, key: string): string | undefined {
  const value = metadata?.[key];
  return typeof value === 'string' ? value : undefined;
}

function stringArrayField(metadata: Metadata, key: string): string[] {
  const value = metadata?.[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
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
            videoUrl: primary ? buildMediaUrl(root, primary.relativePath) : '',
            order: lesson.sortOrder,
            materials: [],
            isUnavailable: primary ? primary.availability === 'missing' : undefined,
          };
        }),
    }));

  const totalDuration = modules.reduce(
    (total, module) => total + module.lessons.reduce((sum, lesson) => sum + lesson.duration, 0),
    0,
  );

  return {
    id: tree.course.id,
    type: 'course',
    title: tree.course.title,
    description: tree.course.description ?? '',
    category: stringField(tree.course.metadata, 'category') ?? '',
    coverUrl: stringField(tree.course.metadata, 'coverUrl') ?? '',
    totalDuration,
    progress: 0,
    modules,
    tags: stringArrayField(tree.course.metadata, 'tags'),
    createdAt: tree.course.createdAt,
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
