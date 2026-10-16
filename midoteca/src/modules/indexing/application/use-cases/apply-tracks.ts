import type { OrganizePlan } from '../../domain/organization';
import type { IndexingStore } from '../../domain/ports';

export interface ApplyTracksDependencies {
  store: IndexingStore;
}

/** Links subtitle tracks discovered on disk to their owning video media. */
export class ApplyTracks {
  constructor(private readonly deps: ApplyTracksDependencies) {}

  execute(sourceId: string, plan: OrganizePlan): void {
    for (const track of plan.tracks) {
      const video = this.deps.store.findMediaByPath(sourceId, track.videoRelativePath);
      if (!video) continue;
      this.deps.store.addMediaTrack({
        mediaFileId: video.id,
        kind: 'subtitle',
        language: track.language,
        path: track.subtitleRelativePath,
      });
    }
  }
}
