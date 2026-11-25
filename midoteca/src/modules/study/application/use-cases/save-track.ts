import { ConflictError, NotFoundError, ValidationError } from '../../../../core/errors';
import { newId } from '../../../../core/ids';
import type { StudyTrack } from '../../domain/entities';
import { normalizeTrackFields, type SaveStudyTrackInput } from '../../domain/track';
import { nextTrackColor, requireActiveTrack, type StudyDependencies } from '../dependencies';

/** Creates or edits a track; a library course has at most one active track. */
export class SaveStudyTrack {
  constructor(private readonly deps: StudyDependencies) {}

  async execute(input: SaveStudyTrackInput): Promise<StudyTrack> {
    const fields = normalizeTrackFields(input);
    const existing = input.id ? await this.deps.repository.findTrack(input.id) : null;
    if (input.id && !existing) throw new NotFoundError('Trilha não encontrada');

    if (fields.courseId) {
      if ((await this.deps.catalog.courseTitle(fields.courseId)) === null) {
        throw new ValidationError('Curso não encontrado na biblioteca');
      }
      const other = await this.deps.repository.findTrackByCourse(fields.courseId);
      if (other && other.id !== existing?.id && !other.archivedAt) {
        throw new ConflictError(`Este curso já tem a trilha "${other.title}"`);
      }
    }

    const now = this.deps.clock().toISOString();
    const color = fields.color ?? existing?.color ?? (await nextTrackColor(this.deps.repository));
    return this.deps.repository.saveTrack({
      id: existing?.id ?? newId(),
      ...fields,
      color,
      archivedAt: existing?.archivedAt ?? null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
  }
}

/** Tracks are archived, never deleted, so the time log keeps its history. */
export class ArchiveStudyTrack {
  constructor(private readonly deps: StudyDependencies) {}

  async execute(trackId: unknown): Promise<void> {
    const track = await requireActiveTrack(this.deps.repository, trackId);
    const timer = await this.deps.repository.getTimer();
    if (timer?.trackId === track.id) {
      throw new ValidationError('Pare o cronômetro desta trilha antes de arquivá-la');
    }
    await this.deps.repository.archiveTrack(track.id, this.deps.clock().toISOString());
  }
}
