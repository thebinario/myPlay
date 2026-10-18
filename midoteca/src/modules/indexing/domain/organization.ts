import type { DiscoveredFile } from './types';

/**
 * Pure, filesystem-free planning of the catalog structure from a flat list of
 * discovered files. No IO happens here, which keeps it trivially testable and
 * safe to run against a snapshot of the scan.
 *
 * Canonical model:
 *   Fonte → Coleção → Curso → Seção → Módulo → Aula/Conteúdo
 *
 * Detection is path-based and name-aware:
 *  - A top-level folder named like a collection ("Coleção …") opens a collection.
 *  - The first folder named like a course ("Curso …") is the course. Folders
 *    between the collection and the course become facets: the first is the
 *    category, the last is the provider.
 *  - Folders after the course are classified as section → module → lesson by
 *    their names ("Aulas"/"Materiais"/"Semana …" → section, "Módulo"/"Unidade" →
 *    module, "Aula"/"Episódio"/"Vídeo" → lesson). Missing levels collapse to an
 *    implicit section ("Conteúdo") and/or module ("Aulas").
 *  - Multiple encodings of the same lesson (resolution "540p", "(Cópia)") are
 *    collapsed into a single lesson with several videos.
 *  - PDFs become documents at module, section or course level. Folders without
 *    videos keep their PDFs as loose documents.
 *  - Subtitle files are matched to a sibling video by base name (MediaTracks).
 */

export interface PlannedLesson {
  relativePath: string;
  title: string;
  order: number;
  videos: string[];
}

export interface PlannedDocument {
  relativePath: string;
  title: string;
  order: number;
}

export interface PlannedModule {
  relativePath: string;
  title: string;
  order: number;
  lessons: PlannedLesson[];
  documents: PlannedDocument[];
}

export interface PlannedSection {
  relativePath: string;
  title: string;
  order: number;
  modules: PlannedModule[];
  documents: PlannedDocument[];
}

export interface PlannedCourse {
  relativePath: string;
  title: string;
  order: number;
  collectionPath: string | null;
  category: string | null;
  provider: string | null;
  sections: PlannedSection[];
  documents: PlannedDocument[];
}

export interface PlannedCollection {
  relativePath: string;
  title: string;
  order: number;
  courses: PlannedCourse[];
}

export interface PlannedTrack {
  videoRelativePath: string;
  subtitleRelativePath: string;
  language: string | null;
}

export interface OrganizePlan {
  collections: PlannedCollection[];
  courses: PlannedCourse[];
  looseDocuments: PlannedDocument[];
  tracks: PlannedTrack[];
}

export interface OrganizeOptions {
  /** Label of the source root folder, used for synthetic courses and root detection. */
  rootLabel: string;
  /**
   * Role played by the source root itself. When omitted it is inferred from
   * `rootLabel`: a root named like a collection opens a collection at the
   * source root, and a root named like a course is the course. This covers
   * sources imported pointing directly at a collection or a course folder.
   */
  rootKind?: 'collection' | 'course' | null;
  /** Movie libraries keep videos independent instead of grouping them as courses. */
  libraryType?: 'course' | 'movie';
}

type RootKind = 'collection' | 'course' | null;

const IMPLICIT_MODULE_TITLE = 'Aulas';
const IMPLICIT_SECTION_TITLE = 'Conteúdo';
const ROOT_COURSE_RELATIVE_PATH = '';
const ROOT_COLLECTION_RELATIVE_PATH = '';

const COLLECTION_RE = /^cole[cç][ãa]o\b/i;
const COURSE_RE = /^curso\b/i;
const MODULE_RE = /^(m[óo]dulo|unidade|module|unit|cap[íi]tulo|chapter)\b/i;
const LESSON_RE = /^(aula|lesson|epis[óo]dio|episode|v[íi]deo|video)\b/i;

export function organize(files: readonly DiscoveredFile[], options: OrganizeOptions): OrganizePlan {
  const videos = files.filter((f) => f.kind === 'video');
  const pdfs = files.filter((f) => f.kind === 'pdf');
  const subtitles = files.filter((f) => f.kind === 'subtitle');

  if (options.libraryType === 'movie') {
    return {
      collections: [],
      courses: [],
      looseDocuments: pdfs.map(toDocument).sort(compareNamed),
      tracks: matchTracks(videos, subtitles),
    };
  }

  const plan = new PlanBuilder();
  const kind = resolveRootKind(options);

  const rootVideos = videos.filter((f) => segments(f.relativePath).length === 1);
  if (rootVideos.length > 0) {
    const collectionPath = kind === 'collection' ? ROOT_COLLECTION_RELATIVE_PATH : null;
    const course = plan.ensureCourse({
      collectionPath,
      collectionTitle: collectionPath !== null ? cleanName(options.rootLabel).title : null,
      coursePath: ROOT_COURSE_RELATIVE_PATH,
      courseTitle: options.rootLabel,
      category: null,
      provider: null,
    });
    for (const video of rootVideos) {
      const fileName = segments(video.relativePath)[segments(video.relativePath).length - 1];
      course
        .ensureSection(ROOT_COURSE_RELATIVE_PATH, IMPLICIT_SECTION_TITLE, MAX_ORDER)
        .ensureModule(ROOT_COURSE_RELATIVE_PATH, IMPLICIT_MODULE_TITLE, MAX_ORDER)
        .addVideo(video, fileName);
    }
  }

  for (const video of videos) {
    if (segments(video.relativePath).length < 2) continue; // root videos handled above
    const place = placement(video.relativePath, options, kind);
    const course = plan.ensureCourse(place);
    const section = course.ensureSection(place.sectionPath, place.sectionTitle, place.sectionOrder);
    const module = section.ensureModule(place.modulePath, place.moduleTitle, place.moduleOrder);
    module.addVideo(video, place.lessonFileName);
  }

  const looseDocuments: PlannedDocument[] = [];

  for (const pdf of pdfs) {
    if (segments(pdf.relativePath).length === 1) {
      const rootCourse = plan.findCourse(ROOT_COURSE_RELATIVE_PATH);
      if (!rootCourse) {
        looseDocuments.push(toDocument(pdf));
      } else if (rootCourse.implicitModuleExists()) {
        rootCourse
          .ensureSection(ROOT_COURSE_RELATIVE_PATH, IMPLICIT_SECTION_TITLE, MAX_ORDER)
          .ensureModule(ROOT_COURSE_RELATIVE_PATH, IMPLICIT_MODULE_TITLE, MAX_ORDER)
          .addDocument(toDocument(pdf));
      } else {
        rootCourse.addCourseDocument(toDocument(pdf));
      }
      continue;
    }
    const place = placement(pdf.relativePath, options, kind);
    const course = plan.findCourse(place.coursePath);
    if (!course) {
      looseDocuments.push(toDocument(pdf));
      continue;
    }
    if (place.modulePath !== place.sectionPath) {
      course
        .ensureSection(place.sectionPath, place.sectionTitle, place.sectionOrder)
        .ensureModule(place.modulePath, place.moduleTitle, place.moduleOrder)
        .addDocument(toDocument(pdf));
    } else if (place.sectionPath !== place.coursePath) {
      course
        .ensureSection(place.sectionPath, place.sectionTitle, place.sectionOrder)
        .ensureModule(place.sectionPath, IMPLICIT_MODULE_TITLE, MAX_ORDER)
        .addDocument(toDocument(pdf));
    } else if (course.implicitModuleExists()) {
      course
        .ensureSection(place.sectionPath, place.sectionTitle, place.sectionOrder)
        .ensureModule(place.sectionPath, IMPLICIT_MODULE_TITLE, MAX_ORDER)
        .addDocument(toDocument(pdf));
    } else {
      course.addCourseDocument(toDocument(pdf));
    }
  }

  return {
    collections: plan.buildCollections(),
    courses: plan.buildCourses(),
    looseDocuments: looseDocuments.sort(compareNamed),
    tracks: matchTracks(videos, subtitles),
  };
}

const MAX_ORDER = Number.MAX_SAFE_INTEGER;

interface Placement {
  collectionPath: string | null;
  collectionTitle: string | null;
  coursePath: string;
  courseTitle: string;
  courseOrder: number;
  category: string | null;
  provider: string | null;
  sectionPath: string;
  sectionTitle: string;
  sectionOrder: number;
  modulePath: string;
  moduleTitle: string;
  moduleOrder: number;
  lessonFileName: string;
}

/** Infers the role of the source root from its label when not given explicitly. */
function resolveRootKind(options: OrganizeOptions): RootKind {
  if (options.rootKind !== undefined) return options.rootKind;
  if (isCollection(options.rootLabel)) return 'collection';
  if (isCourse(options.rootLabel)) return 'course';
  return null;
}

/**
 * Derives the collection/course/section/module placement of a file from its
 * POSIX relative path. Lesson resolution is intentionally left to the module
 * builder so several encodings of the same lesson collapse together.
 *
 * When the source root itself is the collection (rootKind `collection`) the
 * collection lives at the root and facets/course are read from the first
 * folders. When the root is the course (rootKind `course`) every folder below
 * is classified as section/module.
 */
function placement(relativePath: string, options: OrganizeOptions, kind: RootKind): Placement {
  const parts = segments(relativePath);
  const fileName = parts[parts.length - 1];
  const folders = parts.slice(0, -1);

  if (kind === 'course') {
    const course = cleanName(options.rootLabel);
    return {
      ...chainPlacement(ROOT_COURSE_RELATIVE_PATH, folders, fileName),
      collectionPath: null,
      collectionTitle: null,
      coursePath: ROOT_COURSE_RELATIVE_PATH,
      courseTitle: course.title,
      courseOrder: course.order,
      category: null,
      provider: null,
    };
  }

  const rootIsCollection = kind === 'collection';
  const collectionIdx =
    !rootIsCollection && folders.length > 0 && isCollection(folders[0]) ? 0 : -1;
  const searchStart = rootIsCollection ? 0 : collectionIdx >= 0 ? 1 : 0;
  const collectionPath = rootIsCollection
    ? ROOT_COLLECTION_RELATIVE_PATH
    : collectionIdx >= 0
      ? folders[0]
      : null;
  const collectionTitle = rootIsCollection
    ? cleanName(options.rootLabel).title
    : collectionIdx >= 0
      ? cleanName(folders[0]).title
      : null;

  let courseIdx = -1;
  for (let i = searchStart; i < folders.length; i += 1) {
    if (isCourse(folders[i])) {
      courseIdx = i;
      break;
    }
  }
  if (courseIdx === -1) {
    courseIdx = Math.min(searchStart, Math.max(0, folders.length - 1));
  }

  const coursePath = folders.slice(0, courseIdx + 1).join('/');
  const courseParsed = cleanName(folders[courseIdx]);
  const facets = folders.slice(searchStart, courseIdx);
  const category = facets.length > 0 ? cleanName(facets[0]).title : null;
  const provider = facets.length > 1 ? cleanName(facets[facets.length - 1]).title : null;

  const after = folders.slice(courseIdx + 1);
  return {
    ...chainPlacement(coursePath, after, fileName),
    collectionPath,
    collectionTitle,
    coursePath,
    courseTitle: courseParsed.title,
    courseOrder: courseParsed.order,
    category,
    provider,
  };
}

/** Classifies the folders below a course into a section and module placement. */
function chainPlacement(
  coursePath: string,
  after: readonly string[],
  fileName: string,
): Pick<
  Placement,
  | 'sectionPath'
  | 'sectionTitle'
  | 'sectionOrder'
  | 'modulePath'
  | 'moduleTitle'
  | 'moduleOrder'
  | 'lessonFileName'
> {
  const roles = classifyChain(after);

  let sectionPath = coursePath;
  let sectionTitle = IMPLICIT_SECTION_TITLE;
  let sectionOrder = MAX_ORDER;
  if (roles.section >= 0) {
    sectionPath = joinRelative(coursePath, after.slice(0, roles.section + 1).join('/'));
    const parsed = cleanName(after[roles.section]);
    sectionTitle = parsed.title;
    sectionOrder = parsed.order;
  }

  let modulePath = sectionPath;
  let moduleTitle = IMPLICIT_MODULE_TITLE;
  let moduleOrder = MAX_ORDER;
  if (roles.module >= 0) {
    modulePath = joinRelative(coursePath, after.slice(0, roles.module + 1).join('/'));
    const parsed = cleanName(after[roles.module]);
    moduleTitle = parsed.title;
    moduleOrder = parsed.order;
  }

  return {
    sectionPath,
    sectionTitle,
    sectionOrder,
    modulePath,
    moduleTitle,
    moduleOrder,
    lessonFileName: fileName,
  };
}

/** Joins a course path with a relative chain, tolerating a root (empty) course. */
function joinRelative(base: string, rest: string): string {
  return base === '' ? rest : `${base}/${rest}`;
}

interface ChainRoles {
  section: number;
  module: number;
}

/** Classifies the folders after a course into section/module indices (-1 = implicit). */
function classifyChain(folders: readonly string[]): ChainRoles {
  let index = 0;
  let section = -1;
  let module = -1;

  if (index < folders.length && isSection(folders[index])) {
    section = index;
    index += 1;
  }
  if (index < folders.length && !isLesson(folders[index])) {
    module = index;
    index += 1;
  }
  return { section, module };
}

function isCollection(segment: string): boolean {
  return COLLECTION_RE.test(cleanName(segment).title);
}

function isCourse(segment: string): boolean {
  return COURSE_RE.test(cleanName(segment).title);
}

function isSection(segment: string): boolean {
  const title = cleanName(segment).title;
  return !MODULE_RE.test(title) && !LESSON_RE.test(title);
}

function isLesson(segment: string): boolean {
  return LESSON_RE.test(cleanName(segment).title);
}

class PlanBuilder {
  private readonly collections = new Map<string, CollectionBuilder>();
  private readonly rootCourses = new Map<string, CourseBuilder>();

  ensureCourse(place: {
    collectionPath: string | null;
    collectionTitle: string | null;
    coursePath: string;
    courseTitle: string;
    category: string | null;
    provider: string | null;
  }): CourseBuilder {
    if (place.collectionPath !== null) {
      const collection = this.ensureCollection(
        place.collectionPath,
        place.collectionTitle ?? cleanName(place.collectionPath).title,
      );
      return collection.ensureCourse(place);
    }
    let course = this.rootCourses.get(place.coursePath);
    if (!course) {
      course = new CourseBuilder(
        place.coursePath,
        place.courseTitle,
        null,
        place.category,
        place.provider,
      );
      this.rootCourses.set(place.coursePath, course);
    }
    return course;
  }

  findCourse(coursePath: string): CourseBuilder | null {
    const root = this.rootCourses.get(coursePath);
    if (root) return root;
    for (const collection of this.collections.values()) {
      const course = collection.findCourse(coursePath);
      if (course) return course;
    }
    return null;
  }

  private ensureCollection(relativePath: string, title: string): CollectionBuilder {
    let collection = this.collections.get(relativePath);
    if (!collection) {
      collection = new CollectionBuilder(relativePath, title);
      this.collections.set(relativePath, collection);
    }
    return collection;
  }

  buildCollections(): PlannedCollection[] {
    return [...this.collections.values()]
      .map((collection) => collection.build())
      .sort(compareNamed);
  }

  buildCourses(): PlannedCourse[] {
    const courses = [
      ...[...this.rootCourses.values()].map((course) => course.build()),
      ...[...this.collections.values()].flatMap((collection) =>
        [...collection.courseBuilders()].map((course) => course.build()),
      ),
    ];
    return courses.sort(compareNamed);
  }
}

class CollectionBuilder {
  private readonly courses = new Map<string, CourseBuilder>();

  constructor(
    readonly relativePath: string,
    readonly title: string,
  ) {}

  ensureCourse(place: {
    coursePath: string;
    courseTitle: string;
    category: string | null;
    provider: string | null;
  }): CourseBuilder {
    let course = this.courses.get(place.coursePath);
    if (!course) {
      course = new CourseBuilder(
        place.coursePath,
        place.courseTitle,
        this.relativePath,
        place.category,
        place.provider,
      );
      this.courses.set(place.coursePath, course);
    }
    return course;
  }

  findCourse(coursePath: string): CourseBuilder | null {
    return this.courses.get(coursePath) ?? null;
  }

  courseBuilders(): CourseBuilder[] {
    return [...this.courses.values()];
  }

  build(): PlannedCollection {
    return {
      relativePath: this.relativePath,
      title: this.title,
      order: cleanName(this.relativePath).order,
      courses: this.courseBuilders()
        .map((course) => course.build())
        .sort(compareNamed),
    };
  }
}

class CourseBuilder {
  private readonly sections = new Map<string, SectionBuilder>();
  private readonly documents: PlannedDocument[] = [];

  constructor(
    readonly relativePath: string,
    readonly title: string,
    readonly collectionPath: string | null,
    readonly category: string | null,
    readonly provider: string | null,
  ) {}

  ensureSection(relativePath: string, title: string, order: number): SectionBuilder {
    let section = this.sections.get(relativePath);
    if (!section) {
      section = new SectionBuilder(relativePath, title, order);
      this.sections.set(relativePath, section);
    }
    return section;
  }

  addCourseDocument(document: PlannedDocument): void {
    this.documents.push(document);
  }

  implicitModuleExists(): boolean {
    return this.sections.get(this.relativePath)?.hasModule(this.relativePath) ?? false;
  }

  build(): PlannedCourse {
    return {
      relativePath: this.relativePath,
      title: this.title,
      order: cleanName(this.relativePath).order,
      collectionPath: this.collectionPath,
      category: this.category,
      provider: this.provider,
      sections: [...this.sections.values()].map((section) => section.build()).sort(compareNamed),
      documents: this.documents.sort(compareNamed),
    };
  }
}

class SectionBuilder {
  private readonly modules = new Map<string, ModuleBuilder>();
  private readonly documents: PlannedDocument[] = [];

  constructor(
    readonly relativePath: string,
    readonly title: string,
    readonly order: number,
  ) {}

  ensureModule(relativePath: string, title: string, order: number): ModuleBuilder {
    let module = this.modules.get(relativePath);
    if (!module) {
      module = new ModuleBuilder(relativePath, title, order);
      this.modules.set(relativePath, module);
    }
    return module;
  }

  addDocument(document: PlannedDocument): void {
    this.documents.push(document);
  }

  hasModule(relativePath: string): boolean {
    return this.modules.has(relativePath);
  }

  build(): PlannedSection {
    return {
      relativePath: this.relativePath,
      title: this.title,
      order: this.order,
      modules: [...this.modules.values()].map((module) => module.build()).sort(compareNamed),
      documents: this.documents.sort(compareNamed),
    };
  }
}

class ModuleBuilder {
  private readonly lessons = new Map<string, LessonBuilder>();
  private readonly documents: PlannedDocument[] = [];

  constructor(
    readonly relativePath: string,
    readonly title: string,
    readonly order: number,
  ) {}

  addVideo(video: DiscoveredFile, fileName: string): void {
    const key = lessonIdentity(fileName);
    let lesson = this.lessons.get(key);
    if (!lesson) {
      const parsed = cleanName(scrubEncoding(fileName));
      lesson = new LessonBuilder(video.relativePath, parsed.title, parsed.order);
      this.lessons.set(key, lesson);
    }
    lesson.addVideo(video.relativePath);
  }

  addDocument(document: PlannedDocument): void {
    this.documents.push(document);
  }

  build(): PlannedModule {
    return {
      relativePath: this.relativePath,
      title: this.title,
      order: this.order,
      lessons: [...this.lessons.values()].map((lesson) => lesson.build()).sort(compareNamed),
      documents: this.documents.sort(compareNamed),
    };
  }
}

class LessonBuilder {
  private readonly videos: string[] = [];

  constructor(
    readonly relativePath: string,
    readonly title: string,
    readonly order: number,
  ) {}

  addVideo(relativePath: string): void {
    this.videos.push(relativePath);
  }

  build(): PlannedLesson {
    const videos = [...this.videos].sort((a, b) => {
      const score = resolutionScore(b) - resolutionScore(a);
      if (score !== 0) return score;
      return naturalCompare(a, b);
    });
    return {
      relativePath: this.relativePath,
      title: this.title,
      order: this.order,
      videos,
    };
  }
}

function toDocument(file: DiscoveredFile): PlannedDocument {
  const parsed = cleanName(file.fileName);
  return {
    relativePath: file.relativePath,
    title: parsed.title,
    order: parsed.order,
  };
}

function matchTracks(
  videos: readonly DiscoveredFile[],
  subtitles: readonly DiscoveredFile[],
): PlannedTrack[] {
  const videosByBase = new Map<string, string>();
  for (const video of videos) {
    videosByBase.set(baseName(video.relativePath), video.relativePath);
  }

  const tracks: PlannedTrack[] = [];
  for (const subtitle of subtitles) {
    const parsed = parseSubtitle(subtitle.relativePath);
    const videoPath = videosByBase.get(parsed.base);
    if (!videoPath) continue;
    tracks.push({
      videoRelativePath: videoPath,
      subtitleRelativePath: subtitle.relativePath,
      language: parsed.language,
    });
  }
  return tracks;
}

export interface ParsedName {
  order: number;
  title: string;
}

/**
 * Strips a leading ordering prefix (`01 `, `01-`, `01.`, `01_`, `01 - `) and
 * normalizes separators/whitespace into a human title.
 */
export function cleanName(rawName: string): ParsedName {
  const withoutExtension = stripExtension(rawName);
  const normalized = withoutExtension.replace(/[_]+/g, ' ').trim();
  const match = normalized.match(/^(\d{1,4})\s*[-.]?\s*(.*)$/);
  if (match) {
    const order = Number.parseInt(match[1], 10);
    const rest = match[2].trim();
    return { order, title: rest === '' ? match[1] : rest };
  }
  return { order: Number.MAX_SAFE_INTEGER, title: normalized };
}

export interface ParsedSubtitle {
  base: string;
  language: string | null;
}

/** Splits `episode.pt-BR.srt` into base `episode` and language `pt-BR`. */
export function parseSubtitle(relativePath: string): ParsedSubtitle {
  const withoutExtension = stripExtension(relativePath);
  const match = withoutExtension.match(/^(.*)\.([a-zA-Z]{2}(?:-[a-zA-Z]{2,4})?)$/);
  if (match && match[1] !== '') {
    return { base: match[1], language: match[2].toLowerCase() };
  }
  return { base: withoutExtension, language: null };
}

/** Removes duplicate-encoding noise ("(Cópia)", resolution tags) from a name. */
export function scrubEncoding(rawName: string): string {
  return rawName
    .replace(/\(\s*c[óo]pia\s*\)/gi, '')
    .replace(/\b\d{3,4}[pi]\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Identity used to collapse several encodings of the same lesson. */
function lessonIdentity(fileName: string): string {
  return scrubEncoding(stripExtension(fileName)).toLowerCase();
}

function resolutionScore(relativePath: string): number {
  const match = relativePath.toLowerCase().match(/(\d{3,4})[pi]\b/);
  if (match) return Number.parseInt(match[1], 10);
  if (relativePath.toLowerCase().endsWith('.webm')) return 720;
  return 0;
}

function stripExtension(name: string): string {
  const index = name.lastIndexOf('.');
  return index > 0 ? name.slice(0, index) : name;
}

function baseName(relativePath: string): string {
  return stripExtension(relativePath);
}

function segments(relativePath: string): string[] {
  return relativePath.split('/').filter((part) => part.length > 0);
}

function compareNamed(
  a: { order: number; title: string; relativePath: string },
  b: { order: number; title: string; relativePath: string },
): number {
  if (a.order !== b.order) return a.order - b.order;
  const natural = naturalCompare(a.title, b.title);
  if (natural !== 0) return natural;
  return naturalCompare(a.relativePath, b.relativePath);
}

/** Case-insensitive, numeric-aware comparison ("2" < "10"). */
export function naturalCompare(a: string, b: string): number {
  const left = a.toLowerCase();
  const right = b.toLowerCase();
  const leftParts = left.match(/(\d+|\D+)/g) ?? [];
  const rightParts = right.match(/(\d+|\D+)/g) ?? [];
  const length = Math.max(leftParts.length, rightParts.length);
  for (let i = 0; i < length; i += 1) {
    const lp = leftParts[i];
    const rp = rightParts[i];
    if (lp === undefined) return -1;
    if (rp === undefined) return 1;
    const ln = Number(lp);
    const rn = Number(rp);
    const leftIsNumber = !Number.isNaN(ln);
    const rightIsNumber = !Number.isNaN(rn);
    if (leftIsNumber && rightIsNumber) {
      if (ln !== rn) return ln - rn;
    } else if (lp !== rp) {
      return lp < rp ? -1 : 1;
    }
  }
  return 0;
}
