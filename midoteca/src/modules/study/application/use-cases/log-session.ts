import { NotFoundError, ValidationError } from '../../../../core/errors';
import type { StudySession } from '../../domain/entities';
import { assertLocalDate, toLocalDate } from '../../domain/local-date';
import { assertActivity } from '../../domain/schedule';
import { defaultActivityFor } from '../../domain/track';
import { requireActiveTrack, type StudyDependencies } from '../dependencies';

const MINUTE_MS = 60_000;
export const MAX_MANUAL_MINUTES = 720;
const DAY_MS = 24 * 60 * MINUTE_MS;

export interface LogStudySessionInput {
  trackId: string;
  /** Local date, `YYYY-MM-DD`. */
  date: string;
  minutes: number;
  activity?: string | null;
  note?: string | null;
}

/**
 * Manual entry for time studied away from the app (Hack The Box, HackingClub,
 * a book...). Past days are allowed, the future is not, and a day can never
 * add up to more than 24 h.
 */
export class LogStudySession {
  constructor(private readonly deps: StudyDependencies) {}

  async execute(input: LogStudySessionInput): Promise<StudySession> {
    const track = await requireActiveTrack(this.deps.repository, input?.trackId);
    const day = assertLocalDate(input.date, 'date');
    const now = this.deps.clock();
    if (day > toLocalDate(now)) throw new ValidationError('Não dá para registrar estudo no futuro');
    const minutes = input.minutes;
    if (
      typeof minutes !== 'number' ||
      !Number.isInteger(minutes) ||
      minutes < 1 ||
      minutes > MAX_MANUAL_MINUTES
    ) {
      throw new ValidationError(`Informe entre 1 e ${MAX_MANUAL_MINUTES} minutos`);
    }
    const durationMs = minutes * MINUTE_MS;
    const sameDay = await this.deps.repository.listSessions(day, day);
    const total = sameDay.reduce((sum, session) => sum + session.durationMs, 0);
    if (total + durationMs > DAY_MS) {
      throw new ValidationError('O total do dia passaria de 24 h; revise os registros');
    }
    const activity =
      input.activity === undefined || input.activity === null
        ? defaultActivityFor(track.kind)
        : assertActivity(input.activity);
    const note = typeof input.note === 'string' && input.note.trim() ? input.note.trim() : null;
    return this.deps.repository.insertSession({
      trackId: track.id,
      day,
      startedAt: null,
      endedAt: null,
      durationMs,
      source: 'manual',
      activity,
      note: note?.slice(0, 500) ?? null,
    });
  }
}

export class DeleteStudySession {
  constructor(private readonly deps: StudyDependencies) {}

  async execute(sessionId: unknown): Promise<void> {
    if (typeof sessionId !== 'string' || !sessionId) {
      throw new ValidationError('Registro inválido');
    }
    if (!(await this.deps.repository.deleteSession(sessionId))) {
      throw new NotFoundError('Registro não encontrado');
    }
  }
}
