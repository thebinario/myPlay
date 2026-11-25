import { ValidationError } from '../../../core/errors';
import { STUDY_TRACK_KINDS, type StudyActivity, type StudyTrackKind } from './types';

export interface SaveStudyTrackInput {
  id?: string;
  title: string;
  kind: string;
  courseId?: string | null;
  /** A whole library instead of one course (course tracks). */
  sourceId?: string | null;
  platform?: string | null;
  url?: string | null;
  color?: string | null;
}

export interface TrackFields {
  title: string;
  kind: StudyTrackKind;
  courseId: string | null;
  sourceId: string | null;
  platform: string | null;
  url: string | null;
  color: string | null;
}

/** Distinct colors assigned in turn when the user does not pick one. */
export const TRACK_COLORS = [
  '#A594FF',
  '#10B981',
  '#F59E0B',
  '#38BDF8',
  '#F472B6',
  '#F87171',
  '#A3E635',
  '#FB923C',
] as const;

const MAX_TITLE = 80;
const MAX_PLATFORM = 60;
const COLOR_RE = /^#[0-9a-f]{6}$/i;

function optionalText(value: unknown, max: number): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') throw new ValidationError('Texto inválido');
  const trimmed = value.trim().slice(0, max);
  return trimmed || null;
}

function normalizeUrl(value: unknown): string | null {
  const url = optionalText(value, 500);
  if (url === null) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return parsed.toString();
  } catch {
    // falls through to the validation error
  }
  throw new ValidationError('A URL deve começar com http:// ou https://');
}

/** Shape rules of a track; existence checks (course, uniqueness) live in the use case. */
export function normalizeTrackFields(input: SaveStudyTrackInput): TrackFields {
  const title = optionalText(input?.title, MAX_TITLE);
  if (!title) throw new ValidationError('Dê um nome para a trilha');
  if (!STUDY_TRACK_KINDS.includes(input.kind as StudyTrackKind)) {
    throw new ValidationError(`Tipo de trilha desconhecido: ${String(input.kind)}`);
  }
  const kind = input.kind as StudyTrackKind;
  const color = optionalText(input.color, 7);
  if (color !== null && !COLOR_RE.test(color)) throw new ValidationError('Cor inválida');

  const courseId = kind === 'course' ? optionalText(input.courseId, 64) : null;
  const sourceId = kind === 'course' ? optionalText(input.sourceId, 64) : null;
  if (kind === 'course' && !courseId && !sourceId) {
    throw new ValidationError('Escolha o curso ou a biblioteca');
  }
  if (courseId && sourceId) {
    throw new ValidationError('Escolha um curso ou uma biblioteca inteira, não os dois');
  }
  const platform = kind === 'course' ? null : optionalText(input.platform, MAX_PLATFORM);
  if (kind === 'external' && !platform) {
    throw new ValidationError('Informe a plataforma (ex.: Hack The Box, HackingClub)');
  }
  return {
    title,
    kind,
    courseId,
    sourceId,
    platform,
    url: kind === 'course' ? null : normalizeUrl(input.url),
    color: color?.toUpperCase() ?? null,
  };
}

/** Activity assumed when none is given. */
export function defaultActivityFor(kind: StudyTrackKind): StudyActivity {
  return kind === 'course' ? 'lesson' : 'other';
}

/** Colors go round the palette as tracks are created. */
export function trackColorFor(existingTracks: number): string {
  return TRACK_COLORS[existingTracks % TRACK_COLORS.length];
}
