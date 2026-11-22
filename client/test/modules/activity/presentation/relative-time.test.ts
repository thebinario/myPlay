import { describe, expect, it } from 'vitest';
import { formatRelativeTime } from '@/modules/activity/presentation/relative-time';

const NOW = Date.parse('2026-11-22T12:00:00Z');
const ago = (ms: number) => new Date(NOW - ms).toISOString();

describe('activity/presentation — formatRelativeTime', () => {
  it('formata o horário de término em pt-BR, relativo a agora', () => {
    expect(formatRelativeTime(ago(20_000), NOW)).toBe('agora');
    expect(formatRelativeTime(ago(2 * 60_000), NOW)).toBe('há 2 min');
    expect(formatRelativeTime(ago(59 * 60_000), NOW)).toBe('há 59 min');
    expect(formatRelativeTime(ago(60 * 60_000), NOW)).toBe('há 1 h');
    expect(formatRelativeTime(ago(5 * 3_600_000), NOW)).toBe('há 5 h');
    expect(formatRelativeTime(ago(49 * 3_600_000), NOW)).toBe('há 2 d');
  });

  it('não quebra com data inválida ou no futuro', () => {
    expect(formatRelativeTime('xx', NOW)).toBe('');
    expect(formatRelativeTime(new Date(NOW + 5000).toISOString(), NOW)).toBe('agora');
  });
});
