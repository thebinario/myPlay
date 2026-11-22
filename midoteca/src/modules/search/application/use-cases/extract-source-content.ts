import { chunkCues, chunkPages } from '../../domain/content-chunking';
import type {
  ContentChunkInput,
  ContentIndexStore,
  DocumentTextExtractor,
  PendingExtraction,
  SubtitleReader,
  TranscriptCueReader,
} from '../../domain/ports';

export interface ExtractSourceContentDependencies {
  store: ContentIndexStore;
  documents: DocumentTextExtractor;
  subtitles: SubtitleReader;
  transcripts: TranscriptCueReader;
}

export interface ExtractionPacing {
  yieldToPlayback(): Promise<void>;
  signal?: AbortSignal;
}

const BATCH_SIZE = 20;

/**
 * Extracts and indexes the text of a source's PDFs and subtitles. Each origin
 * is recorded with the file version it came from: unchanged files are skipped,
 * changed ones re-extracted, broken ones not retried until they change.
 */
export class ExtractSourceContent {
  constructor(private readonly deps: ExtractSourceContentDependencies) {}

  async execute(sourceId: string, pacing: ExtractionPacing): Promise<number> {
    let processed = 0;
    for (;;) {
      const batch = await this.deps.store.listPending(sourceId, BATCH_SIZE);
      if (batch.length === 0) return processed;
      for (const item of batch) {
        if (pacing.signal?.aborted) return processed;
        await pacing.yieldToPlayback();
        try {
          await this.deps.store.replaceChunks(item, await this.extract(item));
        } catch (error) {
          await this.deps.store.markFailed(
            item,
            error instanceof Error ? error.message : String(error),
          );
        }
        processed += 1;
      }
    }
  }

  private async extract(item: PendingExtraction): Promise<ContentChunkInput[]> {
    if (item.sourceKind === 'pdf') {
      return chunkPages(await this.deps.documents.extractPages(item.absolutePath));
    }
    if (item.sourceKind === 'transcript') {
      return chunkCues(await this.deps.transcripts.readCues(item.mediaFileId));
    }
    return chunkCues(await this.deps.subtitles.readCues(item.absolutePath));
  }
}
