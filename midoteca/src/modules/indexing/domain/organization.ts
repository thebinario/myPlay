import type { DiscoveredFile } from './types';

/**
 * Pure, filesystem-free planning of the catalog structure from a flat list of
 * discovered files. No IO happens here, which keeps it trivially testable and
 * safe to run against a snapshot of the scan.
 *
 * Model (folder -> course/module/lesson):
 *  - Each top-level directory that contains at least one video becomes a course.
 *  - Within a course, each sub-directory containing videos becomes a module.
 *  - Each video becomes a lesson; PDFs become documents (course- or module-level).
 *  - Files directly at the source root become "loose" documents, except root
 *    videos which form a synthetic course titled after the source.
 *  - Subtitle files are matched to a sibling video by base name (as MediaTracks).
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

export interface PlannedCourse {
  relativePath: string;
  title: string;
  order: number;
  modules: PlannedModule[];
  documents: PlannedDocument[];
}

export interface PlannedTrack {
  videoRelativePath: string;
  subtitleRelativePath: string;
  language: string | null;
}

export interface OrganizePlan {
  courses: PlannedCourse[];
  looseDocuments: PlannedDocument[];
  tracks: PlannedTrack[];
}

export interface OrganizeOptions {
  /** Title for the synthetic course built from root-level videos. */
  rootLabel: string;
  /** Movie libraries keep videos independent instead of grouping them as courses. */
  libraryType?: 'course' | 'movie';
}

const IMPLICIT_MODULE_TITLE = 'Aulas';
const ROOT_COURSE_RELATIVE_PATH = '';

export function organize(files: readonly DiscoveredFile[], options: OrganizeOptions): OrganizePlan {
  const videos = files.filter((f) => f.kind === 'video');
  const pdfs = files.filter((f) => f.kind === 'pdf');
  const subtitles = files.filter((f) => f.kind === 'subtitle');

  if (options.libraryType === 'movie') {
    return {
      courses: [],
      looseDocuments: pdfs.map(toDocument).sort(compareNamed),
      tracks: matchTracks(videos, subtitles),
    };
  }

  const courses = new Map<string, CourseBuilder>();

  const ensureCourse = (key: string, relativePath: string, title: string) => {
    let builder = courses.get(key);
    if (!builder) {
      builder = new CourseBuilder(relativePath, title);
      courses.set(key, builder);
    }
    return builder;
  };

  const rootVideos = videos.filter((f) => segments(f.relativePath).length === 1);
  if (rootVideos.length > 0) {
    const builder = ensureCourse(
      ROOT_COURSE_RELATIVE_PATH,
      ROOT_COURSE_RELATIVE_PATH,
      options.rootLabel,
    );
    const module = builder.ensureModule(ROOT_COURSE_RELATIVE_PATH, IMPLICIT_MODULE_TITLE);
    for (const video of rootVideos) module.addVideo(video);
  }

  for (const video of videos) {
    const parts = segments(video.relativePath);
    if (parts.length < 2) continue; // handled above
    const courseSeg = parts[0];
    const builder = ensureCourse(courseSeg, courseSeg, cleanName(courseSeg).title);
    if (parts.length === 2) {
      builder.ensureModule(courseSeg, IMPLICIT_MODULE_TITLE).addVideo(video);
    } else {
      const moduleSeg = parts[1];
      builder.ensureModule(`${courseSeg}/${moduleSeg}`, cleanName(moduleSeg).title).addVideo(video);
    }
  }

  const looseDocuments: PlannedDocument[] = [];

  for (const pdf of pdfs) {
    const parts = segments(pdf.relativePath);
    if (parts.length === 1) {
      const rootCourse = courses.get(ROOT_COURSE_RELATIVE_PATH);
      if (rootCourse) {
        rootCourse.addRootDocument(toDocument(pdf), ROOT_COURSE_RELATIVE_PATH);
      } else {
        looseDocuments.push(toDocument(pdf));
      }
      continue;
    }
    const courseSeg = parts[0];
    const builder = courses.get(courseSeg);
    if (!builder) {
      // Directory without videos: its PDFs are loose documents.
      looseDocuments.push(toDocument(pdf));
      continue;
    }
    if (parts.length === 2) {
      builder.addRootDocument(toDocument(pdf), courseSeg);
    } else {
      const moduleSeg = parts[1];
      builder
        .ensureModule(`${courseSeg}/${moduleSeg}`, cleanName(moduleSeg).title)
        .addDocument(toDocument(pdf));
    }
  }

  const tracks = matchTracks(videos, subtitles);

  return {
    courses: [...courses.values()]
      .map((builder) => builder.build())
      .sort((a, b) => compareNamed(a, b)),
    looseDocuments: looseDocuments.sort(compareNamed),
    tracks,
  };
}

class CourseBuilder {
  private readonly modules = new Map<string, ModuleBuilder>();
  private readonly documents: PlannedDocument[] = [];

  constructor(
    readonly relativePath: string,
    readonly title: string,
  ) {}

  ensureModule(relativePath: string, title: string): ModuleBuilder {
    let module = this.modules.get(relativePath);
    if (!module) {
      module = new ModuleBuilder(relativePath, title);
      this.modules.set(relativePath, module);
    }
    return module;
  }

  addDocument(document: PlannedDocument): void {
    this.documents.push(document);
  }

  addRootDocument(document: PlannedDocument, implicitModulePath: string): void {
    const implicitModule = this.modules.get(implicitModulePath);
    if (implicitModule) implicitModule.addDocument(document);
    else this.addDocument(document);
  }

  build(): PlannedCourse {
    const modules = [...this.modules.values()].map((module) => module.build()).sort(compareNamed);
    return {
      relativePath: this.relativePath,
      title: this.title,
      order: cleanName(this.relativePath).order,
      modules,
      documents: this.documents.sort(compareNamed),
    };
  }
}

class ModuleBuilder {
  private readonly videos: DiscoveredFile[] = [];
  private readonly documents: PlannedDocument[] = [];

  constructor(
    readonly relativePath: string,
    readonly title: string,
  ) {}

  addVideo(video: DiscoveredFile): void {
    this.videos.push(video);
  }

  addDocument(document: PlannedDocument): void {
    this.documents.push(document);
  }

  build(): PlannedModule {
    const lessons = this.videos
      .map((video) => {
        const parsed = cleanName(video.fileName);
        return {
          relativePath: video.relativePath,
          title: parsed.title,
          order: parsed.order,
          videos: [video.relativePath],
        } satisfies PlannedLesson;
      })
      .sort(compareNamed);
    return {
      relativePath: this.relativePath,
      title: this.title,
      order: cleanName(this.relativePath).order,
      lessons,
      documents: this.documents.sort(compareNamed),
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
