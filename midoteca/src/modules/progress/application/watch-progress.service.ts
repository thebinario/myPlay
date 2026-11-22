import type { PlaybackProgress } from '../domain/entities';
import type {
  RecordPlaybackSegmentInput,
  SavePlaybackPositionInput,
  SetLessonCompletionInput,
} from '../domain/inputs';
import type { WatchProgressDependencies } from './dto';
import { RecordPlaybackSegment } from './use-cases/record-playback-segment';
import { SavePlaybackPosition } from './use-cases/save-playback-position';
import { SetLessonCompletion } from './use-cases/set-lesson-completion';

/** Facade over the playback-progress use cases exposed by the kernel. */
export class WatchProgressService {
  private readonly record: RecordPlaybackSegment;
  private readonly completion: SetLessonCompletion;
  private readonly position: SavePlaybackPosition;

  constructor(deps: WatchProgressDependencies) {
    this.record = new RecordPlaybackSegment(deps);
    this.completion = new SetLessonCompletion(deps);
    this.position = new SavePlaybackPosition(deps);
  }

  recordSegment(input: RecordPlaybackSegmentInput): Promise<PlaybackProgress> {
    return this.record.execute(input);
  }

  setCompletion(input: SetLessonCompletionInput): Promise<PlaybackProgress> {
    return this.completion.execute(input);
  }

  savePosition(input: SavePlaybackPositionInput): Promise<PlaybackProgress> {
    return this.position.execute(input);
  }
}
