import { ValidationError } from './errors';
import { newId } from './ids';

export function assertNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`Field "${field}" must be a non-empty string`);
  }
  return value;
}

export function normalizeOptionalString(value: unknown, field: string): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') {
    throw new ValidationError(`Field "${field}" must be a string when provided`);
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export function assertFiniteNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ValidationError(`Field "${field}" must be a finite number`);
  }
  return value;
}

export function assertNonNegativeNumber(value: unknown, field: string): number {
  const num = assertFiniteNumber(value, field);
  if (num < 0) {
    throw new ValidationError(`Field "${field}" must be greater than or equal to 0`);
  }
  return num;
}

export function assertOptionalNonNegativeNumber(value: unknown, field: string): number | null {
  if (value === undefined || value === null) return null;
  return assertNonNegativeNumber(value, field);
}

export function assertInteger(value: unknown, field: string): number {
  const num = assertFiniteNumber(value, field);
  if (!Number.isInteger(num)) {
    throw new ValidationError(`Field "${field}" must be an integer`);
  }
  return num;
}

export function assertNonNegativeInteger(value: unknown, field: string): number {
  const num = assertNonNegativeNumber(value, field);
  if (!Number.isInteger(num)) {
    throw new ValidationError(`Field "${field}" must be an integer`);
  }
  return num;
}

export function assertOptionalInteger(value: unknown, field: string): number | null {
  if (value === undefined || value === null) return null;
  return assertInteger(value, field);
}

export function assertOneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string,
): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new ValidationError(`Field "${field}" must be one of: ${allowed.join(', ')}`);
  }
  return value as T;
}

/**
 * Ensures a stable id on input records: keeps the provided UUID or mints one.
 * Callers may supply ids (e.g. deterministic seeds/tests), but never paths.
 */
export function resolveId(id: string | undefined, field: string): string {
  if (id === undefined || id === null) return newId();
  return assertNonEmptyString(id, field);
}
