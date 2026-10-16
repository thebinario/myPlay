import type { PlaybackProgress, ReadingProgress } from './entities';
import type { SavePlaybackProgress, SaveReadingProgress } from './inputs';

export interface ProgressRepository {
  /** Upsert semantics: one row per lesson. */
  savePlayback(input: SavePlaybackProgress): Promise<PlaybackProgress>;
  getPlayback(lessonId: string): Promise<PlaybackProgress | null>;

  /** Upsert semantics: one row per document. */
  saveReading(input: SaveReadingProgress): Promise<ReadingProgress>;
  getReading(documentId: string): Promise<ReadingProgress | null>;
}
