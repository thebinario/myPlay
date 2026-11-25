import type { MidotecaBridge } from '@/core/contracts/desktop-bridge';
import type {
  BlockDraft,
  LogSessionCommand,
  SaveTrackCommand,
  StudyActivity,
  StudyBlockView,
  StudyCourseLibraryView,
  StudyDay,
  StudyRepository,
  StudyTrackView,
  StudyWeek,
} from '@/modules/study/domain/study';

/**
 * Adapter IPC do cronograma (`study.*`). Os read models do núcleo já têm o
 * formato da interface; a atribuição tipada garante que continuem compatíveis.
 */
export class IpcStudyRepository implements StudyRepository {
  readonly available = true;

  constructor(private readonly bridge: MidotecaBridge) {}

  async getDay(date?: string | null): Promise<StudyDay> {
    const day: StudyDay = await this.bridge.invoke('study.day', { date: date ?? null });
    return day;
  }

  async getWeek(date?: string | null): Promise<StudyWeek> {
    const week: StudyWeek = await this.bridge.invoke('study.week', { date: date ?? null });
    return week;
  }

  async listTracks(): Promise<StudyTrackView[]> {
    const tracks: StudyTrackView[] = await this.bridge.invoke('study.tracks.list', {});
    return tracks;
  }

  async listCourses(query?: string): Promise<StudyCourseLibraryView[]> {
    const groups: StudyCourseLibraryView[] = await this.bridge.invoke('study.courses', {
      query: query ?? null,
    });
    return groups;
  }

  async saveTrack(command: SaveTrackCommand): Promise<StudyTrackView> {
    const track: StudyTrackView = await this.bridge.invoke('study.tracks.save', command);
    return track;
  }

  async archiveTrack(trackId: string): Promise<void> {
    await this.bridge.invoke('study.tracks.archive', { trackId });
  }

  async getSchedule(): Promise<StudyBlockView[]> {
    const blocks: StudyBlockView[] = await this.bridge.invoke('study.schedule.get');
    return blocks;
  }

  async saveSchedule(blocks: BlockDraft[]): Promise<StudyBlockView[]> {
    const saved: StudyBlockView[] = await this.bridge.invoke('study.schedule.save', { blocks });
    return saved;
  }

  async startTimer(trackId: string, activity?: StudyActivity | null): Promise<void> {
    await this.bridge.invoke('study.timer.start', { trackId, activity: activity ?? null });
  }

  async stopTimer(options: { discard?: boolean; note?: string | null } = {}): Promise<void> {
    await this.bridge.invoke('study.timer.stop', options);
  }

  async logSession(command: LogSessionCommand): Promise<void> {
    await this.bridge.invoke('study.sessions.log', command);
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.bridge.invoke('study.sessions.delete', { sessionId });
  }
}
