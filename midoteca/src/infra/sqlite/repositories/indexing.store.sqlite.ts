import { nowIso } from '../../../core/shared/clock';
import { newId } from '../../../core/shared/ids';
import type { LessonMediaRole } from '../../../core/courses/entities';
import type { MediaType } from '../../../core/media/entities';
import type { TitleSource } from '../../../core/shared/title-source';
import type {
  AddTrackInput,
  IndexingStore,
  LinkDocumentInput,
  MediaIndexRecord,
  MediaInsert,
  MediaTouch,
  UpsertCourseInput,
  UpsertDocumentInput,
  UpsertLessonInput,
  UpsertModuleInput,
  UpsertTitleResult,
} from '../../../core/indexing/ports';
import type { SqliteDatabase } from '../database';

interface MediaRow {
  id: string;
  source_id: string;
  relative_path: string;
  media_type: string;
  file_size: number | null;
  modified_at: string | null;
}

function mapMedia(row: MediaRow): MediaIndexRecord {
  return {
    id: row.id,
    sourceId: row.source_id,
    relativePath: row.relative_path,
    mediaType: row.media_type as MediaType,
    fileSize: row.file_size,
    modifiedAt: row.modified_at,
  };
}

interface TitleRow {
  id: string;
  title: string;
  title_source: string;
}

/**
 * Synchronous, transaction-friendly implementation of `IndexingStore` backed by
 * better-sqlite3. All title upserts honor the precedence manual > manifest >
 * detected: once a row is `manual`, rescans never overwrite its title.
 */
export class SqliteIndexingStore implements IndexingStore {
  constructor(private readonly db: SqliteDatabase) {}

  transaction<T>(fn: () => T): T {
    return this.db.transaction(fn);
  }

  findMediaByPath(sourceId: string, relativePath: string): MediaIndexRecord | null {
    const row = this.db
      .prepare(
        `SELECT id, source_id, relative_path, media_type, file_size, modified_at
         FROM media_files WHERE source_id = ? AND relative_path = ?`,
      )
      .get(sourceId, relativePath) as MediaRow | undefined;
    return row ? mapMedia(row) : null;
  }

  findMoveCandidate(
    sourceId: string,
    fileSize: number | null,
    modifiedAt: string | null,
    runToken: string,
  ): MediaIndexRecord | null {
    if (fileSize === null || modifiedAt === null) return null;
    const rows = this.db
      .prepare(
        `SELECT id, source_id, relative_path, media_type, file_size, modified_at
         FROM media_files
         WHERE source_id = ? AND file_size = ? AND modified_at = ?
           AND availability != 'missing'
           AND (last_seen_at IS NULL OR last_seen_at != ?)
         LIMIT 2`,
      )
      .all(sourceId, fileSize, modifiedAt, runToken) as MediaRow[];
    // Only an unambiguous single candidate counts as a move.
    return rows.length === 1 ? mapMedia(rows[0]) : null;
  }

  insertMedia(input: MediaInsert): string {
    const id = newId();
    const now = nowIso();
    this.db
      .prepare(
        `INSERT INTO media_files
           (id, source_id, relative_path, media_type, file_size, modified_at,
            availability, last_seen_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'available', ?, ?, ?)`,
      )
      .run(
        id,
        input.sourceId,
        input.relativePath,
        input.mediaType,
        input.fileSize,
        input.modifiedAt,
        input.runToken,
        now,
        now,
      );
    return id;
  }

  touchMedia(id: string, input: MediaTouch): void {
    this.db
      .prepare(
        `UPDATE media_files
           SET relative_path = ?, file_size = ?, modified_at = ?,
               availability = 'available', last_seen_at = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(input.relativePath, input.fileSize, input.modifiedAt, input.runToken, nowIso(), id);
  }

  markMissing(sourceId: string, runToken: string): string[] {
    const rows = this.db
      .prepare(
        `SELECT id FROM media_files
         WHERE source_id = ? AND availability != 'missing'
           AND (last_seen_at IS NULL OR last_seen_at != ?)`,
      )
      .all(sourceId, runToken) as Array<{ id: string }>;
    if (rows.length === 0) return [];
    this.db
      .prepare(
        `UPDATE media_files
           SET availability = 'missing', updated_at = ?
         WHERE source_id = ? AND availability != 'missing'
           AND (last_seen_at IS NULL OR last_seen_at != ?)`,
      )
      .run(nowIso(), sourceId, runToken);
    return rows.map((row) => row.id);
  }

  upsertCourse(input: UpsertCourseInput): UpsertTitleResult {
    const existing = this.db
      .prepare(
        `SELECT id, title, title_source FROM courses
         WHERE source_id = ? AND relative_path = ?`,
      )
      .get(input.sourceId, input.relativePath) as TitleRow | undefined;

    if (existing) {
      const resolved = this.resolveTitle(
        existing.title,
        existing.title_source as TitleSource,
        input.detectedTitle,
        input.manifestTitle,
      );
      this.db
        .prepare(
          `UPDATE courses
             SET detected_title = ?, title = ?, title_source = ?, updated_at = ?
           WHERE id = ?`,
        )
        .run(input.detectedTitle, resolved.title, resolved.titleSource, nowIso(), existing.id);
      return {
        id: existing.id,
        title: resolved.title,
        titleSource: resolved.titleSource,
        created: false,
      };
    }

    const id = newId();
    const now = nowIso();
    const title = input.manifestTitle?.trim() || input.detectedTitle;
    const titleSource: TitleSource = input.manifestTitle?.trim() ? 'manifest' : 'detected';
    this.db
      .prepare(
        `INSERT INTO courses
           (id, title, description, metadata, source_id, relative_path,
            detected_title, title_source, created_at, updated_at)
         VALUES (?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        title,
        input.sourceId,
        input.relativePath,
        input.detectedTitle,
        titleSource,
        now,
        now,
      );
    return { id, title, titleSource, created: true };
  }

  upsertModule(input: UpsertModuleInput): UpsertTitleResult {
    const existing = this.db
      .prepare(
        `SELECT id, title, title_source FROM course_modules
         WHERE course_id = ? AND relative_path = ?`,
      )
      .get(input.courseId, input.relativePath) as TitleRow | undefined;

    if (existing) {
      const resolved = this.resolveTitle(
        existing.title,
        existing.title_source as TitleSource,
        input.detectedTitle,
        input.manifestTitle,
      );
      this.db
        .prepare(
          `UPDATE course_modules
             SET detected_title = ?, title = ?, title_source = ?, sort_order = ?
           WHERE id = ?`,
        )
        .run(
          input.detectedTitle,
          resolved.title,
          resolved.titleSource,
          input.sortOrder ?? 0,
          existing.id,
        );
      return {
        id: existing.id,
        title: resolved.title,
        titleSource: resolved.titleSource,
        created: false,
      };
    }

    const id = newId();
    const title = input.manifestTitle?.trim() || input.detectedTitle;
    const titleSource: TitleSource = input.manifestTitle?.trim() ? 'manifest' : 'detected';
    this.db
      .prepare(
        `INSERT INTO course_modules
           (id, course_id, title, sort_order, relative_path, detected_title, title_source)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        input.courseId,
        title,
        input.sortOrder ?? 0,
        input.relativePath,
        input.detectedTitle,
        titleSource,
      );
    return { id, title, titleSource, created: true };
  }

  upsertLesson(input: UpsertLessonInput): UpsertTitleResult {
    const existing = this.db
      .prepare(
        `SELECT id, title, title_source FROM lessons
         WHERE module_id = ? AND relative_path = ?`,
      )
      .get(input.moduleId, input.relativePath) as TitleRow | undefined;

    if (existing) {
      const resolved = this.resolveTitle(
        existing.title,
        existing.title_source as TitleSource,
        input.detectedTitle,
        input.manifestTitle,
      );
      this.db
        .prepare(
          `UPDATE lessons
             SET detected_title = ?, title = ?, title_source = ?, sort_order = ?
           WHERE id = ?`,
        )
        .run(
          input.detectedTitle,
          resolved.title,
          resolved.titleSource,
          input.sortOrder ?? 0,
          existing.id,
        );
      return {
        id: existing.id,
        title: resolved.title,
        titleSource: resolved.titleSource,
        created: false,
      };
    }

    const id = newId();
    const title = input.manifestTitle?.trim() || input.detectedTitle;
    const titleSource: TitleSource = input.manifestTitle?.trim() ? 'manifest' : 'detected';
    this.db
      .prepare(
        `INSERT INTO lessons
           (id, module_id, title, sort_order, relative_path, detected_title, title_source)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        input.moduleId,
        title,
        input.sortOrder ?? 0,
        input.relativePath,
        input.detectedTitle,
        titleSource,
      );
    return { id, title, titleSource, created: true };
  }

  linkLessonMedia(lessonId: string, mediaFileId: string, role: LessonMediaRole): void {
    this.db
      .prepare(
        `INSERT OR IGNORE INTO lesson_media (lesson_id, media_file_id, role)
         VALUES (?, ?, ?)`,
      )
      .run(lessonId, mediaFileId, role);
  }

  upsertDocument(input: UpsertDocumentInput): UpsertTitleResult {
    const existing = this.db
      .prepare(`SELECT id, title, title_source FROM documents WHERE media_file_id = ?`)
      .get(input.mediaFileId) as TitleRow | undefined;

    if (existing) {
      const resolved = this.resolveTitle(
        existing.title,
        existing.title_source as TitleSource,
        input.detectedTitle,
        input.manifestTitle,
      );
      this.db
        .prepare(
          `UPDATE documents SET detected_title = ?, title = ?, title_source = ?
           WHERE id = ?`,
        )
        .run(input.detectedTitle, resolved.title, resolved.titleSource, existing.id);
      return {
        id: existing.id,
        title: resolved.title,
        titleSource: resolved.titleSource,
        created: false,
      };
    }

    const id = newId();
    const title = input.manifestTitle?.trim() || input.detectedTitle;
    const titleSource: TitleSource = input.manifestTitle?.trim() ? 'manifest' : 'detected';
    this.db
      .prepare(
        `INSERT INTO documents
           (id, media_file_id, title, page_count, detected_title, title_source)
         VALUES (?, ?, ?, NULL, ?, ?)`,
      )
      .run(id, input.mediaFileId, title, input.detectedTitle, titleSource);
    return { id, title, titleSource, created: true };
  }

  linkDocument(input: LinkDocumentInput): void {
    const existing = this.db
      .prepare(
        `SELECT id FROM document_links
         WHERE document_id = ?
           AND course_id IS ?
           AND module_id IS ?
           AND lesson_id IS ?`,
      )
      .get(
        input.documentId,
        input.courseId ?? null,
        input.moduleId ?? null,
        input.lessonId ?? null,
      ) as { id: string } | undefined;
    if (existing) return;
    this.db
      .prepare(
        `INSERT INTO document_links (id, document_id, course_id, module_id, lesson_id)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(
        newId(),
        input.documentId,
        input.courseId ?? null,
        input.moduleId ?? null,
        input.lessonId ?? null,
      );
  }

  addMediaTrack(input: AddTrackInput): void {
    const existing = this.db
      .prepare(
        `SELECT id FROM media_tracks
         WHERE media_file_id = ? AND kind = ? AND path IS ?`,
      )
      .get(input.mediaFileId, input.kind, input.path) as { id: string } | undefined;
    if (existing) return;
    this.db
      .prepare(
        `INSERT INTO media_tracks (id, media_file_id, kind, language, path, metadata)
         VALUES (?, ?, ?, ?, ?, NULL)`,
      )
      .run(newId(), input.mediaFileId, input.kind, input.language, input.path);
  }

  private resolveTitle(
    currentTitle: string,
    currentSource: TitleSource,
    detectedTitle: string,
    manifestTitle: string | null | undefined,
  ): { title: string; titleSource: TitleSource } {
    if (currentSource === 'manual') {
      return { title: currentTitle, titleSource: 'manual' };
    }
    if (manifestTitle && manifestTitle.trim() !== '') {
      return { title: manifestTitle.trim(), titleSource: 'manifest' };
    }
    return { title: detectedTitle, titleSource: 'detected' };
  }
}
