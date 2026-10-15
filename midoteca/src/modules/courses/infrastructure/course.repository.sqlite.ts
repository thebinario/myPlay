import { nowIso } from '../../../core/clock';
import { NotFoundError, ValidationError } from '../../../core/errors';
import { decodeObject, encodeJson } from '../../../core/json-codec';
import {
  assertNonEmptyString,
  assertOneOf,
  assertOptionalInteger,
  normalizeOptionalString,
  resolveId,
} from '../../../core/validation';
import { TITLE_SOURCES, type TitleSource } from '../../../core/title-source';
import { SORT_SOURCES, type SortSource } from '../../../core/sort-source';
import { LESSON_MEDIA_ROLES, type LessonMediaRole } from '../../../core/domain/lesson-media-role';
import type { Course, CourseModule, Lesson, LessonMedia } from '../domain/entities';
import {
  assertOrganizationCoversCourse,
  normalizeReorder,
  planLessonMove,
} from '../domain/organization';
import type {
  CreateCourse,
  CreateCourseModule,
  CreateLesson,
  CreateLessonMedia,
  MoveLessonToModule,
  SaveCourseOrganization,
  UpdateCourse,
  UpdateCourseModule,
  UpdateLesson,
} from '../domain/inputs';
import type { CourseRepository, CourseTree, LessonMoveResult } from '../domain/ports';
import type { SqliteDatabase } from '../../../platform/persistence/sqlite/database';
import { mapSqliteError } from '../../../platform/persistence/sqlite/errors';

interface CourseRow {
  id: string;
  title: string;
  description: string | null;
  metadata: string | null;
  source_id: string | null;
  relative_path: string | null;
  detected_title: string | null;
  title_source: string;
  created_at: string;
  updated_at: string;
}

interface ModuleRow {
  id: string;
  course_id: string;
  title: string;
  sort_order: number;
  sort_source: string;
  relative_path: string | null;
  detected_title: string | null;
  title_source: string;
}

interface LessonRow {
  id: string;
  module_id: string;
  title: string;
  sort_order: number;
  sort_source: string;
  relative_path: string | null;
  detected_title: string | null;
  title_source: string;
}

interface LessonMediaRow {
  lesson_id: string;
  media_file_id: string;
  role: string;
}

const COURSE_SELECT = `
  SELECT id, title, description, metadata, source_id, relative_path,
         detected_title, title_source, created_at, updated_at
  FROM courses
`;

function mapCourse(row: CourseRow): Course {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    metadata: decodeObject(row.metadata),
    sourceId: row.source_id,
    relativePath: row.relative_path,
    detectedTitle: row.detected_title,
    titleSource: row.title_source as TitleSource,
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
    sortSource: row.sort_source as SortSource,
    relativePath: row.relative_path,
    detectedTitle: row.detected_title,
    titleSource: row.title_source as TitleSource,
  };
}

function mapLesson(row: LessonRow): Lesson {
  return {
    id: row.id,
    moduleId: row.module_id,
    title: row.title,
    sortOrder: row.sort_order,
    sortSource: row.sort_source as SortSource,
    relativePath: row.relative_path,
    detectedTitle: row.detected_title,
    titleSource: row.title_source as TitleSource,
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
    const title = assertNonEmptyString(input.title, 'title');
    const course: Course = {
      id: resolveId(input.id, 'id'),
      title,
      description: normalizeOptionalString(input.description, 'description'),
      metadata: input.metadata ?? null,
      sourceId: normalizeOptionalString(input.sourceId, 'sourceId'),
      relativePath: normalizeOptionalString(input.relativePath, 'relativePath'),
      detectedTitle: input.detectedTitle === undefined ? title : input.detectedTitle,
      titleSource: input.titleSource
        ? assertOneOf(input.titleSource, TITLE_SOURCES, 'titleSource')
        : 'detected',
      createdAt: now,
      updatedAt: now,
    };
    try {
      this.db
        .prepare(
          `INSERT INTO courses
             (id, title, description, metadata, source_id, relative_path,
              detected_title, title_source, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          course.id,
          course.title,
          course.description,
          encodeJson(course.metadata),
          course.sourceId,
          course.relativePath,
          course.detectedTitle,
          course.titleSource,
          course.createdAt,
          course.updatedAt,
        );
    } catch (error) {
      throw mapSqliteError(error, 'createCourse');
    }
    return course;
  }

  async findById(id: string): Promise<Course | null> {
    const row = this.db.prepare(`${COURSE_SELECT} WHERE id = ?`).get(id) as CourseRow | undefined;
    return row ? mapCourse(row) : null;
  }

  async findBySourceAndPath(sourceId: string, relativePath: string): Promise<Course | null> {
    const row = this.db
      .prepare(`${COURSE_SELECT} WHERE source_id = ? AND relative_path = ?`)
      .get(sourceId, relativePath) as CourseRow | undefined;
    return row ? mapCourse(row) : null;
  }

  async listBySource(sourceId: string): Promise<Course[]> {
    const rows = this.db
      .prepare(`${COURSE_SELECT} WHERE source_id = ? ORDER BY title`)
      .all(sourceId) as CourseRow[];
    return rows.map(mapCourse);
  }

  async list(): Promise<Course[]> {
    const rows = this.db.prepare(`${COURSE_SELECT} ORDER BY created_at`).all() as CourseRow[];
    return rows.map(mapCourse);
  }

  async update(input: UpdateCourse): Promise<Course> {
    const existing = await this.findById(input.id);
    if (!existing) throw new NotFoundError(`Course ${input.id} not found`);

    // A caller-provided title is treated as a manual edit by default, so a
    // later rescan will not overwrite it.
    const titleSource: TitleSource =
      input.titleSource !== undefined
        ? assertOneOf(input.titleSource, TITLE_SOURCES, 'titleSource')
        : input.title !== undefined
          ? 'manual'
          : existing.titleSource;

    const next: Course = {
      ...existing,
      title:
        input.title === undefined ? existing.title : assertNonEmptyString(input.title, 'title'),
      description:
        input.description === undefined
          ? existing.description
          : normalizeOptionalString(input.description, 'description'),
      metadata: input.metadata === undefined ? existing.metadata : input.metadata,
      titleSource,
      updatedAt: nowIso(),
    };
    this.db
      .prepare(
        `UPDATE courses
           SET title = ?, description = ?, metadata = ?, title_source = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(
        next.title,
        next.description,
        encodeJson(next.metadata),
        next.titleSource,
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
    const sortOrder = explicitOrder ?? this.nextSortOrder('course_modules', 'course_id', courseId);

    const module: CourseModule = {
      id: resolveId(input.id, 'id'),
      courseId,
      title,
      sortOrder,
      sortSource: input.sortSource
        ? assertOneOf(input.sortSource, SORT_SOURCES, 'sortSource')
        : input.titleSource === 'manual'
          ? 'manual'
          : 'detected',
      relativePath: normalizeOptionalString(input.relativePath, 'relativePath'),
      detectedTitle: input.detectedTitle === undefined ? title : input.detectedTitle,
      titleSource: input.titleSource
        ? assertOneOf(input.titleSource, TITLE_SOURCES, 'titleSource')
        : 'detected',
    };
    try {
      this.db
        .prepare(
          `INSERT INTO course_modules
             (id, course_id, title, sort_order, sort_source, relative_path, detected_title, title_source)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          module.id,
          module.courseId,
          module.title,
          module.sortOrder,
          module.sortSource,
          module.relativePath,
          module.detectedTitle,
          module.titleSource,
        );
    } catch (error) {
      throw mapSqliteError(error, 'createCourseModule');
    }
    return module;
  }

  async listModules(courseId: string): Promise<CourseModule[]> {
    const rows = this.db
      .prepare(
        `SELECT id, course_id, title, sort_order, sort_source, relative_path, detected_title, title_source
         FROM course_modules WHERE course_id = ? ORDER BY sort_order, title`,
      )
      .all(courseId) as ModuleRow[];
    return rows.map(mapModule);
  }

  async createLesson(input: CreateLesson): Promise<Lesson> {
    const moduleId = assertNonEmptyString(input.moduleId, 'moduleId');
    const title = assertNonEmptyString(input.title, 'title');
    const explicitOrder = assertOptionalInteger(input.sortOrder, 'sortOrder');
    const sortOrder = explicitOrder ?? this.nextSortOrder('lessons', 'module_id', moduleId);

    const lesson: Lesson = {
      id: resolveId(input.id, 'id'),
      moduleId,
      title,
      sortOrder,
      sortSource: input.sortSource
        ? assertOneOf(input.sortSource, SORT_SOURCES, 'sortSource')
        : input.titleSource === 'manual'
          ? 'manual'
          : 'detected',
      relativePath: normalizeOptionalString(input.relativePath, 'relativePath'),
      detectedTitle: input.detectedTitle === undefined ? title : input.detectedTitle,
      titleSource: input.titleSource
        ? assertOneOf(input.titleSource, TITLE_SOURCES, 'titleSource')
        : 'detected',
    };
    try {
      this.db
        .prepare(
          `INSERT INTO lessons
             (id, module_id, title, sort_order, sort_source, relative_path, detected_title, title_source)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          lesson.id,
          lesson.moduleId,
          lesson.title,
          lesson.sortOrder,
          lesson.sortSource,
          lesson.relativePath,
          lesson.detectedTitle,
          lesson.titleSource,
        );
    } catch (error) {
      throw mapSqliteError(error, 'createLesson');
    }
    return lesson;
  }

  async findLessonById(id: string): Promise<Lesson | null> {
    const row = this.db
      .prepare(
        `SELECT id, module_id, title, sort_order, sort_source, relative_path, detected_title, title_source
         FROM lessons WHERE id = ?`,
      )
      .get(id) as LessonRow | undefined;
    return row ? mapLesson(row) : null;
  }

  async listLessons(moduleId: string): Promise<Lesson[]> {
    const rows = this.db
      .prepare(
        `SELECT id, module_id, title, sort_order, sort_source, relative_path, detected_title, title_source
         FROM lessons WHERE module_id = ? ORDER BY sort_order, title`,
      )
      .all(moduleId) as LessonRow[];
    return rows.map(mapLesson);
  }

  async findModuleById(id: string): Promise<CourseModule | null> {
    const row = this.db
      .prepare(
        `SELECT id, course_id, title, sort_order, sort_source, relative_path, detected_title, title_source
         FROM course_modules WHERE id = ?`,
      )
      .get(id) as ModuleRow | undefined;
    return row ? mapModule(row) : null;
  }

  async updateModule(input: UpdateCourseModule): Promise<CourseModule> {
    const existing = await this.findModuleById(input.id);
    if (!existing) throw new NotFoundError(`Module ${input.id} not found`);

    const titleSource: TitleSource =
      input.titleSource !== undefined
        ? assertOneOf(input.titleSource, TITLE_SOURCES, 'titleSource')
        : input.title !== undefined
          ? 'manual'
          : existing.titleSource;
    const title =
      input.title === undefined ? existing.title : assertNonEmptyString(input.title, 'title');

    this.db
      .prepare(`UPDATE course_modules SET title = ?, title_source = ? WHERE id = ?`)
      .run(title, titleSource, existing.id);
    return { ...existing, title, titleSource };
  }

  async deleteModule(id: string): Promise<void> {
    // Catalog-only: lessons cascade via FK; media files are never touched.
    this.db.prepare('DELETE FROM course_modules WHERE id = ?').run(id);
  }

  async reorderModules(courseId: string, orderedIds: readonly string[]): Promise<CourseModule[]> {
    return this.db.transaction(() => {
      const modules = this.readModules(courseId);
      const ordered = normalizeReorder(modules, orderedIds, 'Module').map((module) => ({
        ...module,
        sortSource: 'manual' as SortSource,
      }));
      const update = this.db.prepare(
        `UPDATE course_modules SET sort_order = ?, sort_source = 'manual' WHERE id = ?`,
      );
      for (const module of ordered) update.run(module.sortOrder, module.id);
      return ordered;
    });
  }

  async updateLesson(input: UpdateLesson): Promise<Lesson> {
    const existing = await this.findLessonById(input.id);
    if (!existing) throw new NotFoundError(`Lesson ${input.id} not found`);

    const titleSource: TitleSource =
      input.titleSource !== undefined
        ? assertOneOf(input.titleSource, TITLE_SOURCES, 'titleSource')
        : input.title !== undefined
          ? 'manual'
          : existing.titleSource;
    const title =
      input.title === undefined ? existing.title : assertNonEmptyString(input.title, 'title');

    this.db
      .prepare(`UPDATE lessons SET title = ?, title_source = ? WHERE id = ?`)
      .run(title, titleSource, existing.id);
    return { ...existing, title, titleSource };
  }

  async reorderLessons(moduleId: string, orderedIds: readonly string[]): Promise<Lesson[]> {
    return this.db.transaction(() => {
      const lessons = this.readLessons(moduleId);
      const ordered = normalizeReorder(lessons, orderedIds, 'Lesson').map((lesson) => ({
        ...lesson,
        sortSource: 'manual' as SortSource,
      }));
      const update = this.db.prepare(
        `UPDATE lessons SET sort_order = ?, sort_source = 'manual' WHERE id = ?`,
      );
      for (const lesson of ordered) update.run(lesson.sortOrder, lesson.id);
      return ordered;
    });
  }

  async moveLessonToModule(input: MoveLessonToModule): Promise<LessonMoveResult> {
    return this.db.transaction(() => {
      const lesson = this.readLesson(input.lessonId);
      if (!lesson) throw new NotFoundError(`Lesson ${input.lessonId} not found`);
      const source = this.readModule(lesson.moduleId);
      if (!source) throw new NotFoundError(`Module ${lesson.moduleId} not found`);
      const target = this.readModule(input.targetModuleId);
      if (!target) throw new NotFoundError(`Module ${input.targetModuleId} not found`);
      if (target.courseId !== source.courseId) {
        throw new ValidationError('A lesson can only be moved within the same course');
      }

      const plan = planLessonMove(
        this.readLessons(source.id),
        source.id === target.id ? [] : this.readLessons(target.id),
        lesson.id,
        input.targetIndex,
      );

      const reorder = this.db.prepare(
        `UPDATE lessons SET sort_order = ?, sort_source = 'manual' WHERE id = ?`,
      );
      plan.sourceRemaining.forEach((id, index) => reorder.run(index, id));

      const move = this.db.prepare(
        `UPDATE lessons SET module_id = ?, sort_order = ?, sort_source = 'manual' WHERE id = ?`,
      );
      plan.targetOrder.forEach((id, index) => {
        if (id === lesson.id) move.run(target.id, index, id);
        else reorder.run(index, id);
      });

      const moved = this.readLesson(lesson.id);
      if (!moved) throw new NotFoundError(`Lesson ${lesson.id} vanished during move`);
      return { lesson: moved, sourceModuleId: source.id, targetModuleId: target.id };
    });
  }

  async saveOrganization(input: SaveCourseOrganization): Promise<CourseTree> {
    return this.db.transaction(() => {
      const course = this.readCourse(input.courseId);
      if (!course) throw new NotFoundError(`Course ${input.courseId} not found`);

      const modules = this.readModules(input.courseId);
      const lessons = this.readCourseLessons(input.courseId);
      assertOrganizationCoversCourse(
        modules.map((module) => module.id),
        lessons.map((lesson) => lesson.id),
        input.modules,
      );

      const updateModule = this.db.prepare(
        `UPDATE course_modules SET title = ?, title_source = ?, sort_order = ?, sort_source = 'manual'
         WHERE id = ?`,
      );
      const updateLesson = this.db.prepare(
        `UPDATE lessons SET module_id = ?, sort_order = ?, sort_source = 'manual' WHERE id = ?`,
      );

      input.modules.forEach((module, moduleIndex) => {
        const existing = modules.find((candidate) => candidate.id === module.id);
        if (!existing) throw new NotFoundError(`Module ${module.id} not found`);
        const title =
          module.title === undefined ? existing.title : assertNonEmptyString(module.title, 'title');
        const titleSource: TitleSource =
          module.title === undefined ? existing.titleSource : 'manual';
        updateModule.run(title, titleSource, moduleIndex, module.id);

        module.lessonIds.forEach((lessonId, lessonIndex) => {
          updateLesson.run(module.id, lessonIndex, lessonId);
        });
      });

      const tree = this.readTree(input.courseId);
      if (!tree) throw new NotFoundError(`Course ${input.courseId} not found`);
      return tree;
    });
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

  async detachMedia(lessonId: string, mediaFileId: string, role: string): Promise<void> {
    this.db
      .prepare(
        `DELETE FROM lesson_media
         WHERE lesson_id = ? AND media_file_id = ? AND role = ?`,
      )
      .run(lessonId, mediaFileId, role);
  }

  async getTree(courseId: string): Promise<CourseTree | null> {
    return this.db.transaction(() => this.readTree(courseId));
  }

  private readTree(courseId: string): CourseTree | null {
    const courseRow = this.db.prepare(`${COURSE_SELECT} WHERE id = ?`).get(courseId) as
      CourseRow | undefined;
    if (!courseRow) return null;

    const moduleRows = this.readModuleRows(courseId);
    const lessonStmt = this.db.prepare(
      `SELECT id, module_id, title, sort_order, sort_source, relative_path, detected_title, title_source
       FROM lessons WHERE module_id = ? ORDER BY sort_order, title`,
    );
    const mediaStmt = this.db.prepare(
      `SELECT lesson_id, media_file_id, role FROM lesson_media
       WHERE lesson_id = ? ORDER BY role, media_file_id`,
    );

    const modules = moduleRows.map((moduleRow) => {
      const lessons = (lessonStmt.all(moduleRow.id) as LessonRow[]).map((lessonRow) => ({
        ...mapLesson(lessonRow),
        media: (mediaStmt.all(lessonRow.id) as LessonMediaRow[]).map(mapLessonMedia),
      }));
      return { ...mapModule(moduleRow), lessons };
    });

    return { course: mapCourse(courseRow), modules };
  }

  private readCourse(id: string): Course | null {
    const row = this.db.prepare(`${COURSE_SELECT} WHERE id = ?`).get(id) as CourseRow | undefined;
    return row ? mapCourse(row) : null;
  }

  private readModuleRows(courseId: string): ModuleRow[] {
    return this.db
      .prepare(
        `SELECT id, course_id, title, sort_order, sort_source, relative_path, detected_title, title_source
         FROM course_modules WHERE course_id = ? ORDER BY sort_order, title`,
      )
      .all(courseId) as ModuleRow[];
  }

  private readModules(courseId: string): CourseModule[] {
    return this.readModuleRows(courseId).map(mapModule);
  }

  private readModule(id: string): CourseModule | null {
    const row = this.db
      .prepare(
        `SELECT id, course_id, title, sort_order, sort_source, relative_path, detected_title, title_source
         FROM course_modules WHERE id = ?`,
      )
      .get(id) as ModuleRow | undefined;
    return row ? mapModule(row) : null;
  }

  private readLessons(moduleId: string): Lesson[] {
    const rows = this.db
      .prepare(
        `SELECT id, module_id, title, sort_order, sort_source, relative_path, detected_title, title_source
         FROM lessons WHERE module_id = ? ORDER BY sort_order, title`,
      )
      .all(moduleId) as LessonRow[];
    return rows.map(mapLesson);
  }

  private readCourseLessons(courseId: string): Lesson[] {
    const rows = this.db
      .prepare(
        `SELECT l.id, l.module_id, l.title, l.sort_order, l.sort_source, l.relative_path,
                l.detected_title, l.title_source
         FROM lessons l JOIN course_modules m ON m.id = l.module_id
         WHERE m.course_id = ?`,
      )
      .all(courseId) as LessonRow[];
    return rows.map(mapLesson);
  }

  private readLesson(id: string): Lesson | null {
    const row = this.db
      .prepare(
        `SELECT id, module_id, title, sort_order, sort_source, relative_path, detected_title, title_source
         FROM lessons WHERE id = ?`,
      )
      .get(id) as LessonRow | undefined;
    return row ? mapLesson(row) : null;
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
