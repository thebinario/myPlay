import { naturalCompare } from '../../../core/catalog-order';

/**
 * Detects modules inside a flat folder (videos side by side, no module
 * sub-folders) from what the file names already state. Pure and IO-free.
 *
 * Only explicit, objective signals are used — anything that would need a
 * judgement call (grouping lessons by topic) is left as is:
 *  - `Live …` lessons form a "Lives" module;
 *  - `<Série> - Ep.N …` lessons form one module per series. Each file stays
 *    its own lesson: merging two files would orphan an already indexed lesson
 *    (and its progress) on rescan;
 *  - `Aula NN - Módulo N - <título>` opens module N; numbered lessons before
 *    the first marker belong to module N-1 (or to "Aulas" when N is 1);
 *  - any other lesson stays in the module active at its position;
 *  - `Aula NN …` materials go to the module holding lesson NN.
 *
 * When fewer than two modules come out, the folder is left untouched.
 */

export interface FlatLesson {
  relativePath: string;
  title: string;
  order: number;
  videos: string[];
}

export interface FlatDocument {
  relativePath: string;
  title: string;
  order: number;
}

export interface FlatModule {
  relativePath: string;
  title: string;
  order: number;
  lessons: FlatLesson[];
  documents: FlatDocument[];
}

export interface FlatModuleSplit {
  modules: FlatModule[];
  /** Materials that no detected module claims (kept at course level). */
  unplacedDocuments: FlatDocument[];
}

const SEPARATOR = /\s+[-–]\s+/;
const LIVE_RE = /^live\b/i;
const EPISODE_RE = /^(?:ep|epis[óo]dio|episode)\.?\s*(\d+)\b/i;
const NUMBERED_LESSON_RE = /^aula\s*(\d+)$/i;
const MODULE_MARKER_RE = /^m[óo]dulo\s*(\d+)$/i;
const MATERIAL_LESSON_RE = /^aula\s*(\d+)/i;
/** Encoding details appended by downloaders: `2560x1080 4237K`, `1080p`, `audio`. */
const TECHNICAL_RE = /^(?:\d{3,5}x\d{3,5}(?:\s+\d+k)?(?:_\d+)?|\d{3,4}[pi]|audio)$/i;

const BASE_KEY = 'aulas';

type Signal =
  | { kind: 'live' }
  | { kind: 'episode'; series: string }
  | { kind: 'lesson'; number: number | null; marker: { number: number; title: string } | null };

interface Group {
  key: string;
  title: string;
  lessons: FlatLesson[];
}

export function splitFlatModule(module: FlatModule, baseTitle: string): FlatModuleSplit | null {
  const groups = new Map<string, Group>();
  const lessonModule = new Map<number, string>();
  let current = BASE_KEY;
  let firstMarker: number | null = null;

  const ensure = (key: string, title: string): Group => {
    let group = groups.get(key);
    if (!group) {
      group = { key, title, lessons: [] };
      groups.set(key, group);
    }
    return group;
  };

  for (const lesson of [...module.lessons].sort(byOrder)) {
    const signal = classify(lesson.title);
    if (signal.kind === 'live') {
      ensure('lives', 'Lives').lessons.push(lesson);
      continue;
    }
    if (signal.kind === 'episode') {
      ensure(`serie-${slug(signal.series)}`, signal.series).lessons.push(lesson);
      continue;
    }
    if (signal.marker) {
      current = `modulo-${signal.marker.number}`;
      firstMarker ??= signal.marker.number;
      ensure(current, signal.marker.title);
    }
    ensure(current, baseTitle).lessons.push(lesson);
    if (signal.number !== null) lessonModule.set(signal.number, current);
  }

  const base = groups.get(BASE_KEY);
  if (base && firstMarker !== null && firstMarker > 1) base.title = `Módulo ${firstMarker - 1}`;

  const detected = [...groups.values()].filter((group) => group.lessons.length > 0);
  if (detected.length < 2) return null;

  const documents = new Map<string, FlatDocument[]>();
  const unplacedDocuments: FlatDocument[] = [];
  for (const document of module.documents) {
    const match = MATERIAL_LESSON_RE.exec(document.title);
    const key = match ? lessonModule.get(Number.parseInt(match[1], 10)) : undefined;
    if (key) documents.set(key, [...(documents.get(key) ?? []), document]);
    else unplacedDocuments.push(document);
  }

  return {
    modules: detected.map((group) => {
      const lessons = group.lessons.sort(byOrder);
      return {
        relativePath: syntheticPath(module.relativePath, group.key),
        title: group.title,
        order: lessons[0].order,
        lessons,
        documents: documents.get(group.key) ?? [],
      };
    }),
    unplacedDocuments,
  };
}

function classify(title: string): Signal {
  const parts = title.split(SEPARATOR).map((part) => part.trim());
  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    if (LIVE_RE.test(part)) return { kind: 'live' };
    if (index > 0 && EPISODE_RE.test(part)) {
      return { kind: 'episode', series: parts.slice(0, index).join(' - ') };
    }
    const lesson = NUMBERED_LESSON_RE.exec(part);
    if (lesson) {
      const marker = MODULE_MARKER_RE.exec(parts[index + 1] ?? '');
      return {
        kind: 'lesson',
        number: Number.parseInt(lesson[1], 10),
        marker: marker
          ? {
              number: Number.parseInt(marker[1], 10),
              title: parts
                .slice(index + 1)
                .filter((p) => p !== '' && !TECHNICAL_RE.test(p))
                .join(' - '),
            }
          : null,
      };
    }
  }
  return { kind: 'lesson', number: null, marker: null };
}

/** `::` cannot appear in a Windows folder name, so it never collides with one. */
function syntheticPath(base: string, key: string): string {
  return base === '' ? `::${key}` : `${base}/::${key}`;
}

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '');
}

function byOrder(a: { order: number; title: string }, b: { order: number; title: string }) {
  return a.order !== b.order ? a.order - b.order : naturalCompare(a.title, b.title);
}
