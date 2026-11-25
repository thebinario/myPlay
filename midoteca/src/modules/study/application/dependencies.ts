import { NotFoundError, ValidationError } from '../../../core/errors';
import type { StudyCourseCatalog } from '../domain/contracts';
import type { StudyTrack } from '../domain/entities';
import type { StudyRepository } from '../domain/repositories';
import { trackColorFor } from '../domain/track';
import type { StudyClock } from '../domain/types';

export interface StudyDependencies {
  repository: StudyRepository;
  catalog: StudyCourseCatalog;
  /** Local clock; injectable for deterministic tests. */
  clock: StudyClock;
}

/** Default color of the next track created. */
export async function nextTrackColor(repository: StudyRepository): Promise<string> {
  return trackColorFor((await repository.listTracks({ includeArchived: true })).length);
}

/** Loads a track that can still receive time or blocks. */
export async function requireActiveTrack(
  repository: StudyRepository,
  trackId: unknown,
): Promise<StudyTrack> {
  if (typeof trackId !== 'string' || !trackId) throw new ValidationError('Escolha uma trilha');
  const track = await repository.findTrack(trackId);
  if (!track) throw new NotFoundError('Trilha não encontrada');
  if (track.archivedAt) throw new ValidationError('Esta trilha está arquivada');
  return track;
}
