import { ValidationError } from '../../../../core/errors';
import type { StudyBlock } from '../../domain/entities';
import { validateWeeklySchedule, type StudyBlockInput } from '../../domain/schedule';
import type { StudyDependencies } from '../dependencies';

export interface SaveStudyScheduleInput {
  blocks: StudyBlockInput[];
}

/** Replaces the weekly schedule after validating it as a whole. */
export class SaveStudySchedule {
  constructor(private readonly deps: StudyDependencies) {}

  async execute(input: SaveStudyScheduleInput): Promise<StudyBlock[]> {
    if (!input || !Array.isArray(input.blocks)) {
      throw new ValidationError('O cronograma deve ser uma lista de blocos');
    }
    const tracks = await this.deps.repository.listTracks({ includeArchived: false });
    const blocks = validateWeeklySchedule(input.blocks, new Set(tracks.map((track) => track.id)));
    return this.deps.repository.replaceSchedule(blocks);
  }
}
