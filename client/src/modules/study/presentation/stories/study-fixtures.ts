import type {
  BlockDraft,
  LogSessionCommand,
  PlannedBlockItem,
  SaveTrackCommand,
  StudyBlockView,
  StudyCourseLibraryView,
  StudyDay,
  StudyRepository,
  StudyTrackView,
  StudyWeek,
} from '@/modules/study/domain/study';

/** Read models de exemplo (como o núcleo entregaria) para stories e testes. */

export const htbTrack: StudyTrackView = {
  id: 'htb',
  title: 'Hack The Box — Labs',
  kind: 'external',
  courseId: null,
  platform: 'Hack The Box',
  url: 'https://app.hackthebox.com',
  color: '#10B981',
  archivedAt: null,
};

export const clubTrack: StudyTrackView = {
  id: 'club',
  title: 'HackingClub — Aulas',
  kind: 'external',
  courseId: null,
  platform: 'HackingClub',
  url: 'https://app.hackingclub.com',
  color: '#F59E0B',
  archivedAt: null,
};

export const courseTrack: StudyTrackView = {
  id: 'web',
  title: 'Pentest Web',
  kind: 'course',
  courseId: 'course-web',
  platform: null,
  url: null,
  color: '#A594FF',
  archivedAt: null,
};

export const sampleTracks = [courseTrack, htbTrack, clubTrack];

export const sampleBlocks: StudyBlockView[] = [
  {
    id: 'b1',
    trackId: 'web',
    weekday: 3,
    startMinute: 7 * 60,
    durationMinutes: 60,
    focus: null,
    activity: 'lesson',
  },
  {
    id: 'b2',
    trackId: 'htb',
    weekday: 3,
    startMinute: 19 * 60,
    durationMinutes: 90,
    focus: 'Máquina Easy da semana',
    activity: 'lab',
  },
  {
    id: 'b3',
    trackId: 'club',
    weekday: 4,
    startMinute: 20 * 60,
    durationMinutes: 60,
    focus: null,
    activity: 'lesson',
  },
];

function planned(blockId: string, over: Partial<PlannedBlockItem> = {}): PlannedBlockItem {
  const block = sampleBlocks.find((item) => item.id === blockId)!;
  const track = sampleTracks.find((item) => item.id === block.trackId)!;
  return {
    block,
    track,
    endMinute: block.startMinute + block.durationMinutes,
    status: 'upcoming',
    loggedMinutes: 0,
    remainingMinutes: block.durationMinutes,
    progressPercent: 0,
    nextLesson: null,
    ...over,
  };
}

export function sampleDay(over: Partial<StudyDay> = {}): StudyDay {
  return {
    date: '2026-11-25',
    weekday: 3,
    isToday: true,
    nowMinute: 19 * 60 + 30,
    blocks: [
      planned('b1', {
        status: 'done',
        loggedMinutes: 60,
        remainingMinutes: 0,
        progressPercent: 100,
        nextLesson: { lessonId: 'l2', title: 'Aula 2 — SQL Injection', moduleTitle: 'Módulo 1' },
      }),
      planned('b2', {
        status: 'now',
        loggedMinutes: 30,
        remainingMinutes: 60,
        progressPercent: 33,
      }),
    ],
    focus: { kind: 'now', blockId: 'b2', remainingMinutes: 60, startsInMinutes: null },
    plannedMinutes: 150,
    loggedMinutes: 90,
    progressPercent: 60,
    tracks: [
      { track: courseTrack, loggedMinutes: 60, plannedMinutes: 60 },
      { track: htbTrack, loggedMinutes: 30, plannedMinutes: 90 },
    ],
    sessions: [
      {
        id: 's1',
        trackId: 'web',
        day: '2026-11-25',
        startedAt: '2026-11-25T10:00:00.000Z',
        durationMs: 60 * 60_000,
        source: 'player',
        activity: 'lesson',
        note: null,
        track: courseTrack,
      },
      {
        id: 's2',
        trackId: 'htb',
        day: '2026-11-25',
        startedAt: null,
        durationMs: 30 * 60_000,
        source: 'manual',
        activity: 'lab',
        note: 'Enumeração',
        track: htbTrack,
      },
    ],
    timer: null,
    ...over,
  };
}

/** Variações prontas do "o que estudar agora". */
export const dayVariants = {
  now: sampleDay(),
  catchUp: sampleDay({
    nowMinute: 12 * 60,
    blocks: [
      planned('b1', {
        status: 'missed',
        nextLesson: { lessonId: 'l2', title: 'Aula 2 — SQL Injection', moduleTitle: 'Módulo 1' },
      }),
      planned('b2'),
    ],
    focus: { kind: 'catch-up', blockId: 'b1', remainingMinutes: 60, startsInMinutes: null },
    loggedMinutes: 0,
    progressPercent: 0,
    sessions: [],
  }),
  next: sampleDay({
    nowMinute: 17 * 60,
    blocks: [
      planned('b1', {
        status: 'done',
        loggedMinutes: 60,
        remainingMinutes: 0,
        progressPercent: 100,
      }),
      planned('b2'),
    ],
    focus: { kind: 'next', blockId: 'b2', remainingMinutes: 90, startsInMinutes: 120 },
  }),
  done: sampleDay({
    blocks: [
      planned('b1', {
        status: 'done',
        loggedMinutes: 60,
        remainingMinutes: 0,
        progressPercent: 100,
      }),
      planned('b2', {
        status: 'done',
        loggedMinutes: 90,
        remainingMinutes: 0,
        progressPercent: 100,
      }),
    ],
    focus: { kind: 'done', blockId: null, remainingMinutes: 0, startsInMinutes: null },
    loggedMinutes: 150,
    progressPercent: 100,
  }),
  free: sampleDay({
    blocks: [],
    focus: { kind: 'free', blockId: null, remainingMinutes: 0, startsInMinutes: null },
    plannedMinutes: 0,
    loggedMinutes: 0,
    progressPercent: 0,
    tracks: [],
    sessions: [],
  }),
  withTimer: sampleDay({
    timer: {
      trackId: 'htb',
      activity: 'lab',
      startedAt: '2026-11-25T22:00:00.000Z',
      note: null,
      track: htbTrack,
      elapsedMs: 25 * 60_000 + 12_000,
    },
  }),
};

export function sampleWeek(over: Partial<StudyWeek> = {}): StudyWeek {
  const plan = [60, 90, 150, 60, 0, 120, 0];
  const done = [60, 95, 90, 0, 0, 0, 0];
  return {
    from: '2026-11-23',
    to: '2026-11-29',
    days: plan.map((plannedMinutes, index) => ({
      date: `2026-11-${23 + index}`,
      weekday: (index + 1) % 7,
      isToday: index === 2,
      isFuture: index > 2,
      plannedMinutes,
      loggedMinutes: done[index],
      metPlan: plannedMinutes === 0 || index > 2 ? null : done[index] >= plannedMinutes,
    })),
    streakDays: 4,
    totalPlannedMinutes: 480,
    totalLoggedMinutes: 245,
    tracks: [
      { track: courseTrack, loggedMinutes: 150 },
      { track: htbTrack, loggedMinutes: 95 },
    ],
    ...over,
  };
}

/** Cursos agrupados por biblioteca, como o núcleo devolve em `study.courses`. */
export const sampleCourseLibraries: StudyCourseLibraryView[] = [
  {
    sourceId: 'src-hacking',
    libraryName: 'Hacking',
    courses: [
      {
        courseId: 'course-android',
        title: 'Android Hacking',
        sourceId: 'src-hacking',
        libraryName: 'Hacking',
        collectionTitle: null,
        moduleCount: 7,
        lessonCount: 41,
      },
      {
        courseId: 'course-web',
        title: 'Pentest Web',
        sourceId: 'src-hacking',
        libraryName: 'Hacking',
        collectionTitle: null,
        moduleCount: 6,
        lessonCount: 52,
      },
      {
        courseId: 'course-for508',
        title: 'FOR 508',
        sourceId: 'src-hacking',
        libraryName: 'Hacking',
        collectionTitle: 'Forense',
        moduleCount: 3,
        lessonCount: 24,
      },
    ],
  },
  {
    sourceId: 'src-produtividade',
    libraryName: 'Produtividade e Gestão do Tempo',
    courses: [
      {
        courseId: 'course-produtividade',
        title: 'Produtividade e Gestão do Tempo - Escola Conquer',
        sourceId: 'src-produtividade',
        libraryName: 'Produtividade e Gestão do Tempo',
        collectionTitle: null,
        moduleCount: 10,
        lessonCount: 64,
      },
    ],
  },
  {
    sourceId: null,
    libraryName: 'Cursos avulsos',
    courses: [
      {
        courseId: 'course-ingles',
        title: 'Inglês técnico',
        sourceId: null,
        libraryName: 'Cursos avulsos',
        collectionTitle: null,
        moduleCount: 2,
        lessonCount: 12,
      },
    ],
  },
];

/** Filtro simples só para o fake; a pesquisa real (sem acentos, por termos) é do núcleo. */
function fakeSearch(groups: StudyCourseLibraryView[], query: string) {
  const fold = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  const term = fold(query.trim());
  return groups
    .map((group) => ({
      ...group,
      courses: group.courses.filter((course) =>
        fold(`${group.libraryName} ${course.collectionTitle ?? ''} ${course.title}`).includes(term),
      ),
    }))
    .filter((group) => group.courses.length > 0);
}

export interface FakeStudyCalls {
  listCourses: string[];
  startTimer: Array<[string, string | null | undefined]>;
  stopTimer: Array<{ discard?: boolean } | undefined>;
  logSession: LogSessionCommand[];
  deleteSession: string[];
  saveTrack: SaveTrackCommand[];
  archiveTrack: string[];
  saveSchedule: BlockDraft[][];
}

/** Repositório em memória: registra os comandos e devolve os read models dados. */
export function createFakeStudyRepository(
  state: {
    day?: StudyDay;
    week?: StudyWeek;
    tracks?: StudyTrackView[];
    blocks?: StudyBlockView[];
    courses?: StudyCourseLibraryView[];
    failWith?: string;
  } = {},
): StudyRepository & { calls: FakeStudyCalls } {
  const calls: FakeStudyCalls = {
    listCourses: [],
    startTimer: [],
    stopTimer: [],
    logSession: [],
    deleteSession: [],
    saveTrack: [],
    archiveTrack: [],
    saveSchedule: [],
  };
  const tracks = state.tracks ?? sampleTracks;
  const fail = async () => {
    if (state.failWith) throw new Error(state.failWith);
  };
  return {
    available: true,
    calls,
    getDay: async () => state.day ?? sampleDay(),
    getWeek: async () => state.week ?? sampleWeek(),
    listTracks: async () => tracks,
    listCourses: async (query = '') => {
      calls.listCourses.push(query);
      return fakeSearch(state.courses ?? sampleCourseLibraries, query);
    },
    getSchedule: async () => state.blocks ?? sampleBlocks,
    saveTrack: async (command) => {
      calls.saveTrack.push(command);
      await fail();
      return {
        ...htbTrack,
        ...command,
        id: command.id ?? 'new',
        color: command.color ?? '#38BDF8',
      } as StudyTrackView;
    },
    archiveTrack: async (trackId) => {
      calls.archiveTrack.push(trackId);
    },
    saveSchedule: async (blocks) => {
      calls.saveSchedule.push(blocks);
      await fail();
      return blocks.map((block, index) => ({
        focus: null,
        activity: null,
        ...block,
        id: block.id ?? `saved-${index}`,
      })) as StudyBlockView[];
    },
    startTimer: async (trackId, activity) => {
      calls.startTimer.push([trackId, activity]);
    },
    stopTimer: async (options) => {
      calls.stopTimer.push(options);
    },
    logSession: async (command) => {
      calls.logSession.push(command);
      await fail();
    },
    deleteSession: async (sessionId) => {
      calls.deleteSession.push(sessionId);
    },
  };
}
