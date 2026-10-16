import type { JsonObject, JsonValue } from './json';

export function encodeJson(value: JsonValue | undefined | null): string | null {
  if (value === undefined || value === null) return null;
  return JSON.stringify(value);
}

/** Parses a JSON column into an object, returning null for anything else. */
export function decodeObject(text: string | null | undefined): JsonObject | null {
  if (text === null || text === undefined) return null;
  try {
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as JsonObject;
    }
    return null;
  } catch {
    return null;
  }
}

/** Parses a JSON column into any JSON value (settings store primitives too). */
export function decodeJson(text: string | null | undefined): JsonValue {
  if (text === null || text === undefined) return null;
  try {
    return JSON.parse(text) as JsonValue;
  } catch {
    return null;
  }
}
