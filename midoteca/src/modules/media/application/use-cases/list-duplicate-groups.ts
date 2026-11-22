import type { DuplicateGroup, DuplicateReadStore } from '../../domain/analysis';
import { groupDuplicates } from '../../domain/duplicate-detection';

/** Assembles duplicate groups (exact + perceptual) with lessons and progress. */
export class ListDuplicateGroups {
  constructor(private readonly reads: DuplicateReadStore) {}

  async execute(): Promise<DuplicateGroup[]> {
    const groupings = groupDuplicates(await this.reads.listHashed(), await this.reads.listLinks());
    const groups: DuplicateGroup[] = [];
    for (const grouping of groupings) {
      const members = await this.reads.describe(grouping.mediaFileIds);
      if (members.length > 1) groups.push({ kind: grouping.kind, members });
    }
    return groups;
  }
}
