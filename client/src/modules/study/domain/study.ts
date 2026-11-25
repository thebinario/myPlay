/**
 * Cronograma de estudos como o núcleo entrega (read models) e os comandos que
 * a interface envia. Status dos blocos, progresso, "o que estudar agora",
 * sequência de dias e validações são decididos no backend (`study.*`).
 */
export type StudyTrackKind = 'course' | 'external' | 'other';
export type StudyActivity = 'lesson' | 'lab' | 'reading' | 'practice' | 'review' | 'other';
export type StudySessionSource = 'timer' | 'manual' | 'player';
export type PlannedBlockStatus = 'done' | 'now' | 'upcoming' | 'missed';
export type StudyFocusKind = 'now' | 'catch-up' | 'next' | 'done' | 'free';

export interface StudyTrackView {
  id: string;
  title: string;
  kind: StudyTrackKind;
  courseId: string | null;
  platform: string | null;
  url: string | null;
  color: string;
  archivedAt: string | null;
}

export interface StudyBlockView {
  id: string;
  trackId: string;
  /** 0 = domingo … 6 = sábado. */
  weekday: number;
  startMinute: number;
  durationMinutes: number;
  focus: string | null;
  activity: StudyActivity | null;
}

export interface StudySessionView {
  id: string;
  trackId: string;
  day: string;
  startedAt: string | null;
  durationMs: number;
  source: StudySessionSource;
  activity: StudyActivity;
  note: string | null;
  track: StudyTrackView;
}

export interface NextLessonView {
  lessonId: string;
  title: string;
  moduleTitle: string;
}

export interface PlannedBlockItem {
  block: StudyBlockView;
  track: StudyTrackView;
  endMinute: number;
  status: PlannedBlockStatus;
  loggedMinutes: number;
  remainingMinutes: number;
  progressPercent: number;
  nextLesson: NextLessonView | null;
}

export interface StudyFocusView {
  kind: StudyFocusKind;
  blockId: string | null;
  remainingMinutes: number;
  startsInMinutes: number | null;
}

export interface ActiveTimerView {
  trackId: string;
  activity: StudyActivity;
  startedAt: string;
  note: string | null;
  track: StudyTrackView;
  elapsedMs: number;
}

export interface StudyDay {
  date: string;
  weekday: number;
  isToday: boolean;
  nowMinute: number | null;
  blocks: PlannedBlockItem[];
  focus: StudyFocusView | null;
  plannedMinutes: number;
  loggedMinutes: number;
  progressPercent: number;
  tracks: Array<{ track: StudyTrackView; loggedMinutes: number; plannedMinutes: number }>;
  sessions: StudySessionView[];
  timer: ActiveTimerView | null;
}

export interface StudyWeekDay {
  date: string;
  weekday: number;
  isToday: boolean;
  isFuture: boolean;
  plannedMinutes: number;
  loggedMinutes: number;
  metPlan: boolean | null;
}

export interface StudyWeek {
  from: string;
  to: string;
  days: StudyWeekDay[];
  streakDays: number;
  totalPlannedMinutes: number;
  totalLoggedMinutes: number;
  tracks: Array<{ track: StudyTrackView; loggedMinutes: number }>;
}

export interface SaveTrackCommand {
  id?: string;
  title: string;
  kind: StudyTrackKind;
  courseId?: string | null;
  platform?: string | null;
  url?: string | null;
  color?: string | null;
}

export interface BlockDraft {
  id?: string;
  trackId: string;
  weekday: number;
  startMinute: number;
  durationMinutes: number;
  focus?: string | null;
  activity?: StudyActivity | null;
}

export interface LogSessionCommand {
  trackId: string;
  date: string;
  minutes: number;
  activity?: StudyActivity | null;
  note?: string | null;
}

/** Curso da biblioteca que pode virar trilha (read model do núcleo). */
export interface StudyCourseOptionView {
  courseId: string;
  title: string;
  sourceId: string | null;
  libraryName: string;
  collectionTitle: string | null;
  moduleCount: number;
  lessonCount: number;
}

/** Cursos de uma biblioteca, já filtrados e ordenados pelo núcleo. */
export interface StudyCourseLibraryView {
  sourceId: string | null;
  libraryName: string;
  courses: StudyCourseOptionView[];
}

/** Contrato do cronograma de estudos (adapter IPC no desktop). */
export interface StudyRepository {
  readonly available: boolean;
  getDay(date?: string | null): Promise<StudyDay>;
  getWeek(date?: string | null): Promise<StudyWeek>;
  listTracks(): Promise<StudyTrackView[]>;
  /** Cursos da biblioteca para novas trilhas; a pesquisa acontece no núcleo. */
  listCourses(query?: string): Promise<StudyCourseLibraryView[]>;
  saveTrack(command: SaveTrackCommand): Promise<StudyTrackView>;
  archiveTrack(trackId: string): Promise<void>;
  getSchedule(): Promise<StudyBlockView[]>;
  saveSchedule(blocks: BlockDraft[]): Promise<StudyBlockView[]>;
  startTimer(trackId: string, activity?: StudyActivity | null): Promise<void>;
  stopTimer(options?: { discard?: boolean; note?: string | null }): Promise<void>;
  logSession(command: LogSessionCommand): Promise<void>;
  deleteSession(sessionId: string): Promise<void>;
}

const unavailable = () => Promise.reject(new Error('Cronograma indisponível fora do desktop'));

/** Sem núcleo (navegador puro): o cronograma não existe. */
export const unavailableStudy: StudyRepository = {
  available: false,
  getDay: unavailable,
  getWeek: unavailable,
  listTracks: async () => [],
  listCourses: async () => [],
  saveTrack: unavailable,
  archiveTrack: unavailable,
  getSchedule: async () => [],
  saveSchedule: unavailable,
  startTimer: unavailable,
  stopTimer: unavailable,
  logSession: unavailable,
  deleteSession: unavailable,
};
