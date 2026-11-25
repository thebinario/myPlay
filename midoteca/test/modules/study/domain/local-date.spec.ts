import { describe, expect, it } from 'vitest';
import {
  addDays,
  assertLocalDate,
  minuteOfDay,
  startOfWeek,
  toLocalDate,
  weekdayOf,
} from '../../../../src/modules/study/domain/local-date';

describe('study/domain — local-date', () => {
  it('usa o calendário local (não UTC) para o dia', () => {
    const lateNight = new Date(2026, 10, 25, 23, 50);
    expect(toLocalDate(lateNight)).toBe('2026-11-25');
    expect(minuteOfDay(lateNight)).toBe(23 * 60 + 50);
  });

  it('dia da semana: 0 = domingo', () => {
    expect(weekdayOf('2026-11-22')).toBe(0);
    expect(weekdayOf('2026-11-25')).toBe(3);
  });

  it('soma dias atravessando meses e a semana começa na segunda', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(startOfWeek('2026-11-25')).toBe('2026-11-23');
    expect(startOfWeek('2026-11-29')).toBe('2026-11-23');
    expect(startOfWeek('2026-11-23')).toBe('2026-11-23');
  });

  it('valida o formato AAAA-MM-DD e datas reais', () => {
    expect(assertLocalDate('2026-02-28', 'date')).toBe('2026-02-28');
    expect(() => assertLocalDate('2026-02-30', 'date')).toThrow();
    expect(() => assertLocalDate('25/11/2026', 'date')).toThrow();
  });
});
