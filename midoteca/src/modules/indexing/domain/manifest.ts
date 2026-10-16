/**
 * Contract for the optional `.midoteca/course.json` manifest. The manifest is
 * a human-editable, versioned overlay that supplies titles with higher
 * precedence than automatic detection but lower than manual edits.
 *
 * Precedence: manual > manifest > detected.
 */
export interface CourseManifest {
  version: 1;
  course?: { title?: string };
  modules?: Record<string, { title?: string }>;
  lessons?: Record<string, { title?: string }>;
}

export const MANIFEST_VERSION = 1;
export const MANIFEST_RELATIVE_PATH = '.midoteca/course.json';

export class ManifestParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ManifestParseError';
  }
}

/**
 * Validates and normalizes arbitrary JSON into a `CourseManifest`. Returns
 * `null` when the payload is not a manifest at all (e.g. plain object without
 * a version), and throws `ManifestParseError` for malformed known fields so
 * callers can surface a helpful diagnostic without aborting a scan.
 */
export function parseManifest(raw: unknown): CourseManifest | null {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }
  const obj = raw as Record<string, unknown>;
  if (!('version' in obj)) return null;

  const version = obj.version;
  if (version !== MANIFEST_VERSION) {
    throw new ManifestParseError(`Unsupported manifest version: ${String(version)}`);
  }

  const manifest: CourseManifest = { version: MANIFEST_VERSION };

  if (obj.course !== undefined) {
    manifest.course = parseTitleEntry(obj.course, 'course');
  }
  if (obj.modules !== undefined) {
    manifest.modules = parseTitleMap(obj.modules, 'modules');
  }
  if (obj.lessons !== undefined) {
    manifest.lessons = parseTitleMap(obj.lessons, 'lessons');
  }
  return manifest;
}

function parseTitleEntry(value: unknown, field: string): { title?: string } {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new ManifestParseError(`"${field}" must be an object`);
  }
  const entry = value as Record<string, unknown>;
  if (entry.title === undefined) return {};
  if (typeof entry.title !== 'string' || entry.title.trim() === '') {
    throw new ManifestParseError(`"${field}.title" must be a non-empty string`);
  }
  return { title: entry.title.trim() };
}

function parseTitleMap(value: unknown, field: string): Record<string, { title?: string }> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new ManifestParseError(`"${field}" must be an object`);
  }
  const result: Record<string, { title?: string }> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    result[key] = parseTitleEntry(entry, `${field}.${key}`);
  }
  return result;
}
