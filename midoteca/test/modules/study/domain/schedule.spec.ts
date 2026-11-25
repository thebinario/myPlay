import { describe, expect, it } from 'vitest';
import { ValidationError } from '../../../../src/core/errors';
import { validateWeeklySchedule } from '../../../../src/modules/study/domain/schedule';

const active = new Set(['t1', 't2']);
const block = (over: Partial<Parameters<typeof validateWeeklySchedule>[0][number]> = {}) => ({
  trackId: 't1',
  weekday: 1,
  startMinute: 19 * 60,
  durationMinutes: 60,
  ...over,
});

describe('study/domain — validateWeeklySchedule', () => {
  it('normaliza e ordena os blocos por dia e horário', () => {
    const result = validateWeeklySchedule(
      [
        block({ weekday: 2, startMinute: 600, focus: '  Máquina Easy  ' }),
        block({ weekday: 1, startMinute: 1200, trackId: 't2', activity: 'lab' }),
        block({ weekday: 1, startMinute: 480, focus: '   ' }),
      ],
      active,
    );
    expect(result.map((b) => [b.weekday, b.startMinute])).toEqual([
      [1, 480],
      [1, 1200],
      [2, 600],
    ]);
    expect(result[0].focus).toBeNull();
    expect(result[1].activity).toBe('lab');
    expect(result[2].focus).toBe('Máquina Easy');
  });

  it('aceita blocos encostados (um termina quando o outro começa)', () => {
    expect(() =>
      validateWeeklySchedule(
        [block({ startMinute: 480, durationMinutes: 60 }), block({ startMinute: 540 })],
        active,
      ),
    ).not.toThrow();
  });

  it('rejeita blocos sobrepostos no mesmo dia', () => {
    expect(() =>
      validateWeeklySchedule(
        [block({ startMinute: 480, durationMinutes: 90 }), block({ startMinute: 540 })],
        active,
      ),
    ).toThrow(/sobrep/i);
  });

  it('permite o mesmo horário em dias diferentes', () => {
    expect(() =>
      validateWeeklySchedule([block({ weekday: 1 }), block({ weekday: 3 })], active),
    ).not.toThrow();
  });

  it.each([
    ['dia inválido', { weekday: 7 }],
    ['início negativo', { startMinute: -1 }],
    ['duração curta demais', { durationMinutes: 4 }],
    ['duração longa demais', { durationMinutes: 721 }],
    ['passa da meia-noite', { startMinute: 23 * 60, durationMinutes: 90 }],
    ['minutos fracionados', { durationMinutes: 30.5 }],
    ['atividade desconhecida', { activity: 'sleep' }],
  ])('rejeita %s', (_label, over) => {
    expect(() => validateWeeklySchedule([block(over as never)], active)).toThrow(ValidationError);
  });

  it('rejeita trilha inexistente ou arquivada', () => {
    expect(() => validateWeeklySchedule([block({ trackId: 'nope' })], active)).toThrow(/trilha/i);
  });
});
