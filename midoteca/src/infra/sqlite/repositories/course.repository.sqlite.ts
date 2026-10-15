import { nowIso } from '../../../core/shared/clock';
import { NotFoundError } from '../../../core/shared/errors';
import { decodeObject, encodeJson } from '../../../core/shared/json-codec';
import {
  assertNonEmptyString,
  assertOptionalInteger,
  assertOneOf,
  normalizeOptionalString,
  resolveId,
} from '../../../core/shared/validation';
import {
  LESSON_MEDIA_ROLES,
  type Course,
  type CourseModule,
  type Lesson,
  type LessonMedia,
  type LessonMediaRole,
} from '../../../core/courses/entities';
import type {
  CreateCourse,
  CreateCourseModule,
  CreateLesson,
  CreateLessonMedia,
  UpdateCourse,
} from '../../../core/courses/inputs';
import type { CourseRepository, CourseTree } from '../../../core/courses/repository';
import type { SqliteDatabase } from '../database';
import { mapSqliteError } from '../errors';

interface CourseRow {
  id: string;
  title: string;
  description: string | null;
  metadata: string | null;
  created_at: string;
  updated_at: string;
}

interface ModuleRow {
  id: string;
  course_id: string;
  title: string;
  sort_order: number;
}

interface LessonRow {
  id: string;
  module_id: string;
  title: string;
  sort_order: number;
}

interface LessonMediaRow {
  lesson_id: string;
  media_file_id: string;
  role: string;
}

const COURSE_SELECT = `
  SELECT id, title, description, metadata, created_at, updated_at FROM courses
`;

function mapCourse(row: CourseRow): Course {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    metadata: decodeObject(row.metadata),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapModule(row: ModuleRow): CourseModule {
  return {
    id: row.id,
    courseId: row.course_id,
    title: row.title,
    sortOrder: row.sort_order,
  };
}

function mapLesson(row: LessonRow): Lesson {
  return {
    id: row.id,
    moduleId: row.module_id,
    title: row.title,
    sortOrder: row.sort_order,
  };
}

function mapLessonMedia(row: LessonMediaRow): LessonMedia {
  return {
    lessonId: row.lesson_id,
    mediaFileId: row.media_file_id,
    role: row.role as LessonMediaRole,
  };
}

export class SqliteCourseRepository implements CourseRepository {
  constructor(private readonly db: SqliteDatabase) {}

  async create(input: CreateCourse): Promise<Course> {
    const now = nowIso();
    const course: Course = {
      id: resolveId(input.id, 'id'),
      title: assertNonEmptyString(input.title, 'title'),
      description: normalizeOptionalString(input.description, 'description'),
      metadata: input.metadata ?? null,
      createdAt: now,
      updatedAt: now,
    };
    try {
      this.db
        .prepare(
          `INSERT INTO courses (id, title, description, metadata, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run(
          course.id,
          course.title,
          course.description,
          encodeJson(course.metadata),
          course.createdAt,
          course.updatedAt,
        );
    } catch (error) {
      throw mapSqliteError(error, 'createCourse');
    }
    return course;
  }

  async findById(id: string): Promise<Course | null> {
    const row = this.db.prepare(`${COURSE_SELECT} WHERE id = ?`).get(id) as
      | CourseRow
      | undefined;
    return row ? mapCourse(row) : null;
  }

  async list(): Promise<Course[]> {
    const rows = this.db
      .prepare(`${COURSE_SELECT} ORDER BY created_at`)
      .all() as CourseRow[];
    return rows.map(mapCourse);
  }

  async update(input: UpdateCourse): Promise<Course> {
    const existing = await this.findById(input.id);
    if (!existing) throw new NotFoundError(`Course ${input.id} not found`);

    const next: Course = {
      ...existing,
      title:
        input.title === undefined
          ? existing.title
          : assertNonEmptyString(input.title, 'title'),
      description:
        input.description === undefined
          ? existing.description
          : normalizeOptionalString(input.description, 'description'),
      metadata: input.metadata === undefined ? existing.metadata : input.metadata,
      updatedAt: nowIso(),
    };
    this.db
      .prepare(
        `UPDATE courses SET title = ?, description = ?, metadata = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(
        next.title,
        next.description,
        encodeJson(next.metadata),
        next.updatedAt,
        next.id,
      );
    return next;
  }

  async delete(id: string): Promise<void> {
    // Catalog-only delete; modules/lessons/links cascade. Media files and their
    // physical counterparts are untouched.
    this.db.prepare('DELETE FROM courses WHERE id = ?').run(id);
  }

  async createModule(input: CreateCourseModule): Promise<CourseModule> {
    const courseId = assertNonEmptyString(input.courseId, 'courseId');
    const title = assertNonEmptyString(input.title, 'title');
    const explicitOrder = assertOptionalInteger(input.sortOrder, 'sortOrder');
    const sortOrder =
      explicitOrder ?? this.nextSortOrder('course_modules', 'course_id', courseId);

    const module: CourseModule = {
      id: resolveId(input.id, 'id'),
      courseId,
      title,
      sortOrder,
    };
    try {
      this.db
        .prepare(
          `INSERT INTO course_modules (id, course_id, title, sort_order)
           VALUES (?, ?, ?, ?)`,
        )
        .run(module.id, module.courseId, module.title, module.sortOrder);
    } catch (error) {
      throw mapSqliteError(error, 'createCourseModule');
    }
    return module;
  }

  async listModules(courseId: string): Promise<CourseModule[]> {
    const rows = this.db
      .prepare(
        `SELECT id, course_id, title, sort_order FROM course_modules
         WHERE course_id = ? ORDER BY sort_order, title`,
      )
      .all(courseId) as ModuleRow[];
    return rows.map(mapModule);
  }

  async createLesson(input: CreateLesson): Promise<Lesson> {
    const moduleId = assertNonEmptyString(input.moduleId, 'moduleId');
    const title = assertNonEmptyString(input.title, 'title');
    const explicitOrder = assertOptionalInteger(input.sortOrder, 'sortOrder');
    const sortOrder =
      explicitOrder ?? this.nextSortOrder('lessons', 'module_id', moduleId);

    const lesson: Lesson = {
      id: resolveId(input.id, 'id'),
      moduleId,
      title,
      sortOrder,
    };
    try {
      this.db
        .prepare(
          `INSERT INTO lessons (id, module_id, title, sort_order)
           VALUES (?, ?, ?, ?)`,
        )
        .run(lesson.id, lesson.moduleId, lesson.title, lesson.sortOrder);
    } catch (error) {
      throw mapSqliteError(error, 'createLesson');
    }
    return lesson;
  }

  async findLessonById(id: string): Promise<Lesson | null> {
    const row = this.db
      .prepare(
        `SELECT id, module_id, title, sort_order FROM lessons WHERE id = ?`,
      )
      .get(id) as LessonRow | undefined;
    return row ? mapLesson(row) : null;
  }

  async listLessons(moduleId: string): Promise<Lesson[]> {
    const rows = this.db
      .prepare(
        `SELECT id, module_id, title, sort_order FROM lessons
         WHERE module_id = ? ORDER BY sort_order, title`,
      )
      .all(moduleId) as LessonRow[];
    return rows.map(mapLesson);
  }

  async attachMedia(input: CreateLessonMedia): Promise<LessonMedia> {
    const link: LessonMedia = {
      lessonId: assertNonEmptyString(input.lessonId, 'lessonId'),
      mediaFileId: assertNonEmptyString(input.mediaFileId, 'mediaFileId'),
      role: assertOneOf(input.role, LESSON_MEDIA_ROLES, 'role'),
    };
    try {
      this.db
        .prepare(
          `INSERT INTO lesson_media (lesson_id, media_file_id, role)
           VALUES (?, ?, ?)`,
        )
        .run(link.lessonId, link.mediaFileId, link.role);
    } catch (error) {
      throw mapSqliteError(error, 'attachLessonMedia');
    }
    return link;
  }

  async listLessonMedia(lessonId: string): Promise<LessonMedia[]> {
    const rows = this.db
      .prepare(
        `SELECT lesson_id, media_file_id, role FROM lesson_media
         WHERE lesson_id = ? ORDER BY role, media_file_id`,
      )
      .all(lessonId) as LessonMediaRow[];
    return rows.map(mapLessonMedia);
  }

  async detachMedia(
    lessonId: string,
    mediaFileId: string,
    role: string,
  ): Promise<void> {
    this.db
      .prepare(
        `DELETE FROM lesson_media
         WHERE lesson_id = ? AND media_file_id = ? AND role = ?`,
      )
      .run(lessonId, mediaFileId, role);
  }

  async getTree(courseId: string): Promise<CourseTree | null> {
    return this.db.transaction(() => {
      const courseRow = this.db
        .prepare(`${COURSE_SELECT} WHERE id = ?`)
        .get(courseId) as CourseRow | undefined;
      if (!courseRow) return null;

      const moduleRows = this.db
        .prepare(
          `SELECT id, course_id, title, sort_order FROM course_modules
           WHERE course_id = ? ORDER BY sort_order, title`,
        )
        .all(courseId) as ModuleRow[];

      const lessonStmt = this.db.prepare(
        `SELECT id, module_id, title, sort_order FROM lessons
         WHERE module_id = ? ORDER BY sort_order, title`,
      );
      const mediaStmt = this.db.prepare(
        `SELECT lesson_id, media_file_id, role FROM lesson_media
         WHERE lesson_id = ? ORDER BY role, media_file_id`,
      );

      const modules = moduleRows.map((moduleRow) => {
        const lessons = (lessonStmt.all(moduleRow.id) as LessonRow[]).map(
          (lessonRow) => ({
            ...mapLesson(lessonRow),
            media: (mediaStmt.all(lessonRow.id) as LessonMediaRow[]).map(
              mapLessonMedia,
            ),
          }),
        );
        return { ...mapModule(moduleRow), lessons };
      });

      return { course: mapCourse(courseRow), modules };
    });
  }

  private nextSortOrder(table: string, parentColumn: string, parentId: string): number {
    const row = this.db
      .prepare(
        `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next
         FROM ${table} WHERE ${parentColumn} = ?`,
      )
      .get(parentId) as { next: number };
    return row.next;
  }
}
