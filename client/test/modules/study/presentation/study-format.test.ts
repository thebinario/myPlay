import { describe, expect, it } from 'vitest';
import {
  formatClock,
  formatDateLong,
  formatElapsed,
  formatMinutes,
  parseClock,
} from '@/modules/study/presentation/components/study-format';

describe('study/presentation — formatação', () => {
  it('minutos em texto curto', () => {
    expect(formatMinutes(0)).toBe('0 min');
    expect(formatMinutes(45)).toBe('45 min');
    expect(formatMinutes(60)).toBe('1h');
    expect(formatMinutes(150)).toBe('2h 30min');
  });

  it('horário do dia e conversão da entrada HH:MM', () => {
    expect(formatClock(7 * 60 + 5)).toBe('07:05');
    expect(formatClock(1440)).toBe('24:00');
    expect(parseClock('19:30')).toBe(19 * 60 + 30);
    expect(parseClock('xx')).toBeNull();
  });

  it('cronômetro corrido', () => {
    expect(formatElapsed(65_000)).toBe('01:05');
    expect(formatElapsed(3_725_000)).toBe('1:02:05');
  });

  it('data por extenso no calendário local', () => {
    expect(formatDateLong('2026-11-25')).toBe('quarta-feira, 25 de novembro');
  });
});
