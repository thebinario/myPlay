import { ValidationError } from '../../../core/errors';
import type { StudyBlock } from './entities';
import { STUDY_ACTIVITIES, type StudyActivity } from './types';

export const MIN_BLOCK_MINUTES = 5;
export const MAX_BLOCK_MINUTES = 720;
const DAY_MINUTES = 24 * 60;
const MAX_FOCUS_LENGTH = 200;

export interface StudyBlockInput {
  id?: string;
  trackId: string;
  weekday: number;
  startMinute: number;
  durationMinutes: number;
  focus?: string | null;
  activity?: string | null;
}

export type ValidatedBlock = Omit<StudyBlock, 'id'> & { id?: string };

const WEEKDAY_NAMES = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

function assertIntegerIn(value: unknown, min: number, max: number, message: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    throw new ValidationError(message);
  }
  return value;
}

export function assertActivity(value: unknown): StudyActivity {
  if (!STUDY_ACTIVITIES.includes(value as StudyActivity)) {
    throw new ValidationError(`Atividade desconhecida: ${String(value)}`);
  }
  return value as StudyActivity;
}

function normalizeBlock(input: StudyBlockInput, activeTracks: ReadonlySet<string>): ValidatedBlock {
  if (!activeTracks.has(input.trackId)) {
    throw new ValidationError('O bloco aponta para uma trilha inexistente ou arquivada');
  }
  const weekday = assertIntegerIn(input.weekday, 0, 6, 'Dia da semana inválido');
  const startMinute = assertIntegerIn(input.startMinute, 0, DAY_MINUTES - 1, 'Horário inválido');
  const durationMinutes = assertIntegerIn(
    input.durationMinutes,
    MIN_BLOCK_MINUTES,
    MAX_BLOCK_MINUTES,
    `A duração deve ter entre ${MIN_BLOCK_MINUTES} e ${MAX_BLOCK_MINUTES} minutos inteiros`,
  );
  if (startMinute + durationMinutes > DAY_MINUTES) {
    throw new ValidationError('O bloco não pode passar da meia-noite');
  }
  const focus =
    typeof input.focus === 'string' ? input.focus.trim().slice(0, MAX_FOCUS_LENGTH) : '';
  const activity =
    input.activity === undefined || input.activity === null ? null : assertActivity(input.activity);
  return {
    id: input.id,
    trackId: input.trackId,
    weekday,
    startMinute,
    durationMinutes,
    focus: focus || null,
    activity,
  };
}

/**
 * Validates a whole weekly schedule: every block belongs to an active track,
 * stays inside its day and never overlaps another block of the same day (so
 * there is always one answer to "o que estudar agora"). Returns the blocks
 * sorted by day and start.
 */
export function validateWeeklySchedule(
  blocks: readonly StudyBlockInput[],
  activeTracks: ReadonlySet<string>,
): ValidatedBlock[] {
  if (!Array.isArray(blocks))
    throw new ValidationError('O cronograma deve ser uma lista de blocos');
  const sorted = blocks
    .map((block) => normalizeBlock(block, activeTracks))
    .sort((a, b) => a.weekday - b.weekday || a.startMinute - b.startMinute);

  for (let index = 1; index < sorted.length; index++) {
    const previous = sorted[index - 1];
    const current = sorted[index];
    if (
      previous.weekday === current.weekday &&
      previous.startMinute + previous.durationMinutes > current.startMinute
    ) {
      throw new ValidationError(
        `Há blocos sobrepostos na ${WEEKDAY_NAMES[current.weekday]}; ajuste os horários`,
      );
    }
  }
  return sorted;
}
