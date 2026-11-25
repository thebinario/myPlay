import type { ActiveStudyTimer, StudyBlock, StudySession, StudyTrack } from '../domain/entities';
import { groupCourseOptions, type StudyCourseLibrary } from '../domain/course-options';
import type { StudyDayView, StudyWeekView } from '../domain/read-models';
import type { SaveStudyTrackInput } from '../domain/track';
import type { StudyDependencies } from './dependencies';
import { GetStudyDay } from './queries/get-study-day';
import { GetStudyWeek } from './queries/get-study-week';
import {
  DeleteStudySession,
  LogStudySession,
  type LogStudySessionInput,
} from './use-cases/log-session';
import { RecordPlayerTime, type RecordPlayerTimeInput } from './use-cases/record-player-time';
import { SaveStudySchedule, type SaveStudyScheduleInput } from './use-cases/save-schedule';
import { ArchiveStudyTrack, SaveStudyTrack } from './use-cases/save-track';
import {
  StudyTimer,
  type StartStudyTimerInput,
  type StopStudyTimerInput,
} from './use-cases/study-timer';

/** Facade of the study planner use cases exposed by the kernel. */
export class StudyService {
  private readonly saveTrackCase: SaveStudyTrack;
  private readonly archiveTrackCase: ArchiveStudyTrack;
  private readonly scheduleCase: SaveStudySchedule;
  private readonly timer: StudyTimer;
  private readonly logCase: LogStudySession;
  private readonly deleteCase: DeleteStudySession;
  private readonly playerCase: RecordPlayerTime;
  private readonly dayQuery: GetStudyDay;
  private readonly weekQuery: GetStudyWeek;

  constructor(private readonly deps: StudyDependencies) {
    this.saveTrackCase = new SaveStudyTrack(deps);
    this.archiveTrackCase = new ArchiveStudyTrack(deps);
    this.scheduleCase = new SaveStudySchedule(deps);
    this.timer = new StudyTimer(deps);
    this.logCase = new LogStudySession(deps);
    this.deleteCase = new DeleteStudySession(deps);
    this.playerCase = new RecordPlayerTime(deps);
    this.dayQuery = new GetStudyDay(deps);
    this.weekQuery = new GetStudyWeek(deps);
  }

  listTracks(options: { includeArchived?: boolean } = {}): Promise<StudyTrack[]> {
    return this.deps.repository.listTracks({ includeArchived: options?.includeArchived === true });
  }

  /** Library courses for a new track, grouped by library and filtered by `query`. */
  async listCourses(input: { query?: string | null } = {}): Promise<StudyCourseLibrary[]> {
    const courses = await this.deps.catalog.listCourses();
    return groupCourseOptions(courses, input?.query ?? '');
  }

  saveTrack(input: SaveStudyTrackInput): Promise<StudyTrack> {
    return this.saveTrackCase.execute(input);
  }

  archiveTrack(trackId: string): Promise<void> {
    return this.archiveTrackCase.execute(trackId);
  }

  getSchedule(): Promise<StudyBlock[]> {
    return this.deps.repository.listBlocks();
  }

  saveSchedule(input: SaveStudyScheduleInput): Promise<StudyBlock[]> {
    return this.scheduleCase.execute(input);
  }

  startTimer(input: StartStudyTimerInput): Promise<ActiveStudyTimer> {
    return this.timer.start(input);
  }

  stopTimer(input: StopStudyTimerInput = {}): Promise<StudySession | null> {
    return this.timer.stop(input);
  }

  logSession(input: LogStudySessionInput): Promise<StudySession> {
    return this.logCase.execute(input);
  }

  deleteSession(sessionId: string): Promise<void> {
    return this.deleteCase.execute(sessionId);
  }

  /** Called by the progress context for every played segment. */
  recordPlayerTime(input: RecordPlayerTimeInput): Promise<void> {
    return this.playerCase.execute(input);
  }

  getDay(input: { date?: string | null } = {}): Promise<StudyDayView> {
    return this.dayQuery.execute(input);
  }

  getWeek(input: { date?: string | null } = {}): Promise<StudyWeekView> {
    return this.weekQuery.execute(input);
  }
}
