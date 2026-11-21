import type {
  AnalyzableMedia,
  FileHasher,
  FrameSampler,
  MediaAnalysisStore,
  MediaProber,
} from '../../domain/analysis';
import {
  DURATION_TOLERANCE_MS,
  frameSimilarity,
  isPerceptualMatch,
} from '../../domain/perceptual-fingerprint';

export interface AnalyzeSourceMediaDependencies {
  store: MediaAnalysisStore;
  hasher: FileHasher;
  /** Optional: without it durations stay as reported by the player. */
  prober?: MediaProber;
  /** Optional: without it only exact duplicates are detected. */
  sampler?: FrameSampler;
}

export interface AnalysisPacing {
  yieldToPlayback(): Promise<void>;
  signal?: AbortSignal;
}

const BATCH_SIZE = 20;

/**
 * Analyzes the pending media of a source, in tiers from cheap to expensive:
 * probe duration → partial hash → full sha256 only for same-size/partial twins
 * → perceptual fingerprint only for videos with a close duration. Read-only on
 * disk. Each file is marked analyzed (or failed) so the job resumes naturally.
 */
export class AnalyzeSourceMedia {
  constructor(private readonly deps: AnalyzeSourceMediaDependencies) {}

  async execute(sourceId: string, pacing: AnalysisPacing): Promise<number> {
    let processed = 0;
    for (;;) {
      const batch = await this.deps.store.listPending(sourceId, BATCH_SIZE);
      if (batch.length === 0) return processed;
      for (const media of batch) {
        if (pacing.signal?.aborted) return processed;
        await pacing.yieldToPlayback();
        try {
          await this.analyze(media);
          await this.deps.store.markAnalyzed(media.id, null);
        } catch (error) {
          await this.deps.store.markAnalyzed(
            media.id,
            error instanceof Error ? error.message : String(error),
          );
        }
        processed += 1;
      }
    }
  }

  private async analyze(media: AnalyzableMedia): Promise<void> {
    const { store, hasher, prober } = this.deps;
    let durationMs = media.durationMs;
    if (media.mediaType === 'video' && prober) {
      const probed = await prober.probe(media.absolutePath).catch(() => ({ durationMs: null }));
      if (probed.durationMs) {
        durationMs = probed.durationMs;
        await store.saveDuration(media.id, durationMs);
      }
    }

    await store.savePartialHash(media.id, await hasher.partialHash(media.absolutePath));
    await this.hashTwins(media);

    if (media.mediaType === 'video' && durationMs) {
      await this.matchPerceptually(media, durationMs);
    }
  }

  private async hashTwins(media: AnalyzableMedia): Promise<void> {
    const twins = await this.deps.store.findHashTwins(media.id);
    if (twins.length === 0) return;
    for (const item of [media, ...twins]) {
      if (item.sha256) continue;
      await this.deps.store.saveSha256(item.id, await this.deps.hasher.fullHash(item.absolutePath));
    }
  }

  private async matchPerceptually(media: AnalyzableMedia, durationMs: number): Promise<void> {
    if (!this.deps.sampler) return;
    const candidates = await this.deps.store.findFingerprintCandidates(
      media.id,
      durationMs,
      DURATION_TOLERANCE_MS,
    );
    if (candidates.length === 0) return;

    const own = await this.fingerprintOf({ ...media, durationMs });
    for (const candidate of candidates) {
      const other = await this.fingerprintOf(candidate);
      if (own && other && isPerceptualMatch(own, other)) {
        await this.deps.store.saveDuplicateLink(
          media.id,
          candidate.id,
          frameSimilarity(own, other),
        );
      }
    }
  }

  private async fingerprintOf(media: AnalyzableMedia): Promise<string[] | null> {
    const cached = await this.deps.store.getFingerprint(media.id);
    if (cached) return cached;
    if (!this.deps.sampler || !media.durationMs) return null;
    const frames = await this.deps.sampler.sampleHashes(media.absolutePath, media.durationMs);
    await this.deps.store.saveFingerprint(media.id, frames);
    return frames;
  }
}
