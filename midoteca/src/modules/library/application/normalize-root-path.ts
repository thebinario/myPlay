import { ValidationError } from '../../../core/errors';

/** Trims, normalizes separators and strips a trailing slash from a root path. */
export function normalizeRootPath(rootPath: string): string {
  if (typeof rootPath !== 'string' || rootPath.trim() === '') {
    throw new ValidationError('rootPath must be a non-empty string');
  }
  let value = rootPath.trim().replace(/\\/g, '/');
  if (value.length > 1 && value.endsWith('/')) {
    value = value.replace(/\/+$/, '');
  }
  return value;
}
