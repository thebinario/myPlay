import { fileNameOf } from '../../../../core/file-name';
import {
  assessPlayability,
  type MediaInspector,
  type PlayabilityStore,
} from '../../domain/playability';

export interface CheckMediaPlayabilityDependencies {
  store: PlayabilityStore;
  inspector: MediaInspector;
}

export interface PlayabilityPacing {
  yieldToPlayback(): Promise<void>;
  reportProgress?(progress: { done: number; total: number | null; detail: string | null }): void;
  signal?: AbortSignal;
}

const BATCH_SIZE = 20;

/**
 * Checks, with ffprobe and without decoding, whether each unchecked video can
 * be played by the desktop player, and records the verdict (playable,
 * unsupported codec/container, or damaged). Files are only read.
 */
export class CheckMediaPlayability {
  constructor(private readonly deps: CheckMediaPlayabilityDependencies) {}

  async execute(pacing: PlayabilityPacing): Promise<number> {
    const { store, inspector } = this.deps;
    const total = await store.countUnchecked();
    let checked = 0;
    for (;;) {
      const batch = await store.listUnchecked(BATCH_SIZE);
      if (batch.length === 0) {
        pacing.reportProgress?.({ done: checked, total: Math.max(total, checked), detail: null });
        return checked;
      }
      for (const candidate of batch) {
        if (pacing.signal?.aborted) return checked;
        pacing.reportProgress?.({
          done: checked,
          total: Math.max(total, checked + 1),
          detail: fileNameOf(candidate.absolutePath),
        });
        await pacing.yieldToPlayback();
        try {
          await store.save(
            candidate.id,
            assessPlayability(await inspector.inspect(candidate.absolutePath)),
          );
        } catch (error) {
          await store.save(
            candidate.id,
            null,
            error instanceof Error ? error.message : String(error),
          );
        }
        checked += 1;
      }
    }
  }
}
