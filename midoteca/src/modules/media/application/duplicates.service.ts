import type { PlaybackProgress } from '../../progress/domain/entities';
import type { ProgressRepository } from '../../progress/domain/ports';
import type {
  DuplicateGroup,
  DuplicateReadStore,
  MediaAnalysisStatus,
  MediaAnalysisStore,
} from '../domain/analysis';
import { ListDuplicateGroups } from './use-cases/list-duplicate-groups';
import {
  MarkDuplicateAsWatched,
  type MarkDuplicateAsWatchedInput,
} from './use-cases/mark-duplicate-as-watched';

export interface DuplicatesServiceDependencies {
  reads: DuplicateReadStore;
  analysis: MediaAnalysisStore;
  progress: ProgressRepository;
  now: () => string;
}

/** Facade for the duplicate-content read model and its explicit actions. */
export class DuplicatesService {
  private readonly list: ListDuplicateGroups;
  private readonly mark: MarkDuplicateAsWatched;

  constructor(private readonly deps: DuplicatesServiceDependencies) {
    this.list = new ListDuplicateGroups(deps.reads);
    this.mark = new MarkDuplicateAsWatched(deps);
  }

  listGroups(): Promise<DuplicateGroup[]> {
    return this.list.execute();
  }

  markAsWatched(input: MarkDuplicateAsWatchedInput): Promise<PlaybackProgress> {
    return this.mark.execute(input);
  }

  analysisStatus(): Promise<MediaAnalysisStatus> {
    return this.deps.analysis.status();
  }
}
