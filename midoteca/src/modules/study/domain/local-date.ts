import { ValidationError } from '../../../core/errors';
import type { LocalDate } from './types';

/**
 * Study days follow the user's local calendar, not UTC: a session at 23:50
 * belongs to that evening. Dates are plain `YYYY-MM-DD` strings so they sort
 * and compare lexicographically.
 */

const pad = (value: number) => String(value).padStart(2, '0');
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function toLocalDate(date: Date): LocalDate {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function minuteOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function parse(date: LocalDate): Date {
  const match = DATE_RE.exec(date);
  if (!match) throw new ValidationError(`Data inválida: ${date}`);
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function assertLocalDate(value: unknown, field: string): LocalDate {
  if (typeof value !== 'string' || !DATE_RE.test(value)) {
    throw new ValidationError(`O campo "${field}" deve ser uma data AAAA-MM-DD`);
  }
  if (toLocalDate(parse(value)) !== value) {
    throw new ValidationError(`O campo "${field}" não é uma data válida`);
  }
  return value;
}

/** 0 = domingo … 6 = sábado (same as `Date#getDay`). */
export function weekdayOf(date: LocalDate): number {
  return parse(date).getDay();
}

export function addDays(date: LocalDate, days: number): LocalDate {
  const value = parse(date);
  value.setDate(value.getDate() + days);
  return toLocalDate(value);
}

/** Weeks start on Monday (Brazilian calendar convention for routines). */
export function startOfWeek(date: LocalDate): LocalDate {
  return addDays(date, -((weekdayOf(date) + 6) % 7));
}
