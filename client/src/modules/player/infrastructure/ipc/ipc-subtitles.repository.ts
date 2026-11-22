import type { MidotecaBridge } from '@/core/contracts/desktop-bridge';
import type { SubtitleTrackView, SubtitlesRepository } from '@/modules/player/domain/subtitles';

/** Adapter IPC das legendas de uma aula (`subtitles.forLesson`). */
export class IpcSubtitlesRepository implements SubtitlesRepository {
  constructor(private readonly bridge: MidotecaBridge) {}

  forLesson(lessonId: string): Promise<SubtitleTrackView[]> {
    return this.bridge.invoke('subtitles.forLesson', { lessonId });
  }
}
