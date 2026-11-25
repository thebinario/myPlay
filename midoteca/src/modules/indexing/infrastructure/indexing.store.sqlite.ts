import { nowIso } from '../../../core/clock';
import { newId } from '../../../core/ids';
import type { LessonMediaRole } from '../../../core/domain/lesson-media-role';
import type { MediaType } from '../../../core/domain/media-type';
import type { TitleSource } from '../../../core/title-source';
import type {
  AddTrackInput,
  IndexingStore,
  LinkDocumentInput,
  MediaIndexRecord,
  MediaInsert,
  MediaTouch,
  UpsertCollectionInput,
  UpsertCourseInput,
  UpsertDocumentInput,
  UpsertLessonInput,
  UpsertModuleInput,
  UpsertSectionInput,
  UpsertTitleResult,
} from '../domain/ports';
import type { SqliteDatabase } from '../../../platform/persistence/sqlite/database';

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

interface SortableTitleRow extends TitleRow {
  sort_source: string;
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

  invalidateAnalysis(id: string): void {
    this.db
      .prepare(
        `UPDATE media_files
           SET analyzed_at = NULL, analysis_error = NULL, partial_hash = NULL,
               sha256 = NULL, duration_ms = NULL,
               playability = NULL, playability_reason = NULL, playability_checked_at = NULL
         WHERE id = ?`,
      )
      .run(id);
    this.db.prepare(`DELETE FROM media_fingerprints WHERE media_file_id = ?`).run(id);
    this.db
      .prepare(`DELETE FROM media_duplicate_links WHERE media_a = ? OR media_b = ?`)
      .run(id, id);
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
             SET detected_title = ?, title = ?, title_source = ?,
                 collection_id = COALESCE(?, collection_id),
                 category = COALESCE(?, category),
                 provider = COALESCE(?, provider), updated_at = ?
           WHERE id = ?`,
        )
        .run(
          input.detectedTitle,
          resolved.title,
          resolved.titleSource,
          input.collectionId ?? null,
          input.category ?? null,
          input.provider ?? null,
          nowIso(),
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
    const now = nowIso();
    const title = input.manifestTitle?.trim() || input.detectedTitle;
    const titleSource: TitleSource = input.manifestTitle?.trim() ? 'manifest' : 'detected';
    this.db
      .prepare(
        `INSERT INTO courses
           (id, title, description, metadata, source_id, relative_path,
            detected_title, title_source, collection_id, category, provider, created_at, updated_at)
         VALUES (?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        title,
        input.sourceId,
        input.relativePath,
        input.detectedTitle,
        titleSource,
        input.collectionId ?? null,
        input.category ?? null,
        input.provider ?? null,
        now,
        now,
      );
    return { id, title, titleSource, created: true };
  }

  upsertCollection(input: UpsertCollectionInput): UpsertTitleResult {
    const existing = this.db
      .prepare(
        `SELECT id, title, title_source FROM collections
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
          `UPDATE collections
             SET detected_title = ?, title = ?, title_source = ?, sort_order = ?, updated_at = ?
           WHERE id = ?`,
        )
        .run(
          input.detectedTitle,
          resolved.title,
          resolved.titleSource,
          input.sortOrder ?? 0,
          nowIso(),
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
    const now = nowIso();
    const title = input.manifestTitle?.trim() || input.detectedTitle;
    const titleSource: TitleSource = input.manifestTitle?.trim() ? 'manifest' : 'detected';
    this.db
      .prepare(
        `INSERT INTO collections
           (id, source_id, relative_path, title, detected_title, title_source,
            sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        input.sourceId,
        input.relativePath,
        title,
        input.detectedTitle,
        titleSource,
        input.sortOrder ?? 0,
        now,
        now,
      );
    return { id, title, titleSource, created: true };
  }

  upsertSection(input: UpsertSectionInput): UpsertTitleResult {
    const existing = this.db
      .prepare(
        `SELECT id, title, title_source, sort_source FROM course_sections
         WHERE course_id = ? AND relative_path = ?`,
      )
      .get(input.courseId, input.relativePath) as SortableTitleRow | undefined;

    if (existing) {
      const resolved = this.resolveTitle(
        existing.title,
        existing.title_source as TitleSource,
        input.detectedTitle,
        input.manifestTitle,
      );
      if (existing.sort_source === 'manual') {
        this.db
          .prepare(
            `UPDATE course_sections
               SET detected_title = ?, title = ?, title_source = ?
             WHERE id = ?`,
          )
          .run(input.detectedTitle, resolved.title, resolved.titleSource, existing.id);
      } else {
        this.db
          .prepare(
            `UPDATE course_sections
               SET detected_title = ?, title = ?, title_source = ?, sort_order = ?, sort_source = 'detected'
             WHERE id = ?`,
          )
          .run(
            input.detectedTitle,
            resolved.title,
            resolved.titleSource,
            input.sortOrder ?? 0,
            existing.id,
          );
      }
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
        `INSERT INTO course_sections
           (id, course_id, title, sort_order, sort_source, relative_path, detected_title, title_source)
         VALUES (?, ?, ?, ?, 'detected', ?, ?, ?)`,
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

  upsertModule(input: UpsertModuleInput): UpsertTitleResult {
    const existing = this.db
      .prepare(
        `SELECT id, title, title_source, sort_source FROM course_modules
         WHERE course_id = ? AND relative_path = ?`,
      )
      .get(input.courseId, input.relativePath) as SortableTitleRow | undefined;

    if (existing) {
      const resolved = this.resolveTitle(
        existing.title,
        existing.title_source as TitleSource,
        input.detectedTitle,
        input.manifestTitle,
      );
      // A user-defined order is never clobbered by a rescan.
      if (existing.sort_source === 'manual') {
        this.db
          .prepare(
            `UPDATE course_modules
               SET detected_title = ?, title = ?, title_source = ?,
                   section_id = COALESCE(?, section_id)
             WHERE id = ?`,
          )
          .run(
            input.detectedTitle,
            resolved.title,
            resolved.titleSource,
            input.sectionId ?? null,
            existing.id,
          );
      } else {
        this.db
          .prepare(
            `UPDATE course_modules
               SET detected_title = ?, title = ?, title_source = ?, sort_order = ?, sort_source = 'detected',
                   section_id = COALESCE(?, section_id)
             WHERE id = ?`,
          )
          .run(
            input.detectedTitle,
            resolved.title,
            resolved.titleSource,
            input.sortOrder ?? 0,
            input.sectionId ?? null,
            existing.id,
          );
      }
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
           (id, course_id, title, sort_order, sort_source, relative_path, detected_title, title_source, section_id)
         VALUES (?, ?, ?, ?, 'detected', ?, ?, ?, ?)`,
      )
      .run(
        id,
        input.courseId,
        title,
        input.sortOrder ?? 0,
        input.relativePath,
        input.detectedTitle,
        titleSource,
        input.sectionId ?? null,
      );
    return { id, title, titleSource, created: true };
  }

  upsertLesson(input: UpsertLessonInput): UpsertTitleResult {
    // Looked up across the course: when detection regroups a folder, the lesson
    // keeps its id (and progress) and only changes module.
    const existing = this.db
      .prepare(
        `SELECT l.id, l.title, l.title_source, l.sort_source, l.module_id FROM lessons l
           JOIN course_modules m ON m.id = l.module_id
         WHERE m.course_id = ? AND l.relative_path = ?
         ORDER BY l.module_id = ? DESC
         LIMIT 1`,
      )
      .get(input.courseId, input.relativePath, input.moduleId) as
      (SortableTitleRow & { module_id: string }) | undefined;

    if (existing) {
      const resolved = this.resolveTitle(
        existing.title,
        existing.title_source as TitleSource,
        input.detectedTitle,
        input.manifestTitle,
      );
      // A user-defined order or placement is never clobbered by a rescan.
      if (existing.sort_source === 'manual') {
        this.db
          .prepare(
            `UPDATE lessons
               SET detected_title = ?, title = ?, title_source = ?
             WHERE id = ?`,
          )
          .run(input.detectedTitle, resolved.title, resolved.titleSource, existing.id);
      } else {
        this.db
          .prepare(
            `UPDATE lessons
               SET detected_title = ?, title = ?, title_source = ?, sort_order = ?, sort_source = 'detected',
                   module_id = ?
             WHERE id = ?`,
          )
          .run(
            input.detectedTitle,
            resolved.title,
            resolved.titleSource,
            input.sortOrder ?? 0,
            input.moduleId,
            existing.id,
          );
      }
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
           (id, module_id, title, sort_order, sort_source, relative_path, detected_title, title_source)
         VALUES (?, ?, ?, ?, 'detected', ?, ?, ?)`,
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

  removeEmptyDetectedModules(courseId: string, plannedRelativePaths: readonly string[]): void {
    this.db
      .prepare(
        `DELETE FROM course_modules
          WHERE course_id = ?
            AND sort_source = 'detected'
            AND title_source = 'detected'
            AND relative_path IS NOT NULL
            AND relative_path NOT IN (SELECT value FROM json_each(?))
            AND NOT EXISTS (SELECT 1 FROM lessons WHERE lessons.module_id = course_modules.id)`,
      )
      .run(courseId, JSON.stringify(plannedRelativePaths));
  }

  retireAbsorbedCourses(sourceId: string, plannedRelativePaths: readonly string[]): number {
    const planned = JSON.stringify(plannedRelativePaths);
    const stale = this.db
      .prepare(
        `SELECT id, relative_path, title, title_source FROM courses
          WHERE source_id = ? AND relative_path IS NOT NULL
            AND relative_path NOT IN (SELECT value FROM json_each(?))`,
      )
      .all(sourceId, planned) as Array<{
      id: string;
      relative_path: string;
      title: string;
      title_source: string;
    }>;
    const lessonsOf = this.db.prepare(
      `SELECT l.id, l.title, l.title_source,
              (SELECT lm.media_file_id FROM lesson_media lm
                WHERE lm.lesson_id = l.id AND lm.role = 'primary' LIMIT 1) AS media
         FROM lessons l JOIN course_modules m ON m.id = l.module_id
        WHERE m.course_id = ?`,
    );
    const successorOf = this.db.prepare(
      `SELECT l.id, m.course_id AS courseId FROM lessons l
         JOIN course_modules m ON m.id = l.module_id
         JOIN courses c ON c.id = m.course_id
         JOIN lesson_media lm ON lm.lesson_id = l.id AND lm.role = 'primary'
        WHERE lm.media_file_id = ? AND c.source_id = ?
          AND c.relative_path IN (SELECT value FROM json_each(?))
        LIMIT 1`,
    );

    let retired = 0;
    for (const course of stale) {
      const lessons = lessonsOf.all(course.id) as Array<{
        id: string;
        title: string;
        title_source: string;
        media: string | null;
      }>;
      const moves = lessons.map((lesson) => ({
        lesson,
        successor: lesson.media
          ? (successorOf.get(lesson.media, sourceId, planned) as
              { id: string; courseId: string } | undefined)
          : undefined,
      }));
      if (moves.length === 0 || moves.some((move) => !move.successor)) continue;

      for (const { lesson, successor } of moves) {
        this.moveProgress(lesson.id, successor!.id);
        if (lesson.title_source === 'manual') {
          this.db
            .prepare(
              `UPDATE lessons SET title = ?, title_source = 'manual'
                WHERE id = ? AND title_source = 'detected'`,
            )
            .run(lesson.title, successor!.id);
        }
      }
      if (course.title_source === 'manual') {
        // The old course is now a module: keep the name the user gave it.
        this.db
          .prepare(
            `UPDATE course_modules SET title = ?, title_source = 'manual'
              WHERE relative_path = ? AND title_source = 'detected'
                AND course_id IN (SELECT value FROM json_each(?))`,
          )
          .run(
            course.title,
            course.relative_path,
            JSON.stringify([...new Set(moves.map((move) => move.successor!.courseId))]),
          );
      }
      this.db.prepare('DELETE FROM courses WHERE id = ?').run(course.id);
      retired += 1;
    }
    return retired;
  }

  /** Keeps the more advanced playback state when a lesson is re-catalogued. */
  private moveProgress(fromLessonId: string, toLessonId: string): void {
    const select = this.db.prepare(
      'SELECT completed_at AS completedAt FROM playback_progress WHERE lesson_id = ?',
    );
    const old = select.get(fromLessonId) as { completedAt: string | null } | undefined;
    if (!old) return;
    const current = select.get(toLessonId) as { completedAt: string | null } | undefined;
    if (current && (current.completedAt || !old.completedAt)) return;
    if (current)
      this.db.prepare('DELETE FROM playback_progress WHERE lesson_id = ?').run(toLessonId);
    this.db
      .prepare('UPDATE playback_progress SET lesson_id = ? WHERE lesson_id = ?')
      .run(toLessonId, fromLessonId);
  }

  hasModule(courseId: string, relativePath: string): boolean {
    return (
      this.db
        .prepare(`SELECT 1 FROM course_modules WHERE course_id = ? AND relative_path = ?`)
        .get(courseId, relativePath) !== undefined
    );
  }

  isLessonPinned(courseId: string, relativePath: string): boolean {
    return (
      this.db
        .prepare(
          `SELECT 1 FROM lessons l JOIN course_modules m ON m.id = l.module_id
            WHERE m.course_id = ? AND l.relative_path = ? AND l.sort_source = 'manual'`,
        )
        .get(courseId, relativePath) !== undefined
    );
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
