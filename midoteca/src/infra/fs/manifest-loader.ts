import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ManifestLoader } from '../../core/indexing/ports';
import {
  MANIFEST_RELATIVE_PATH,
  parseManifest,
  type CourseManifest,
} from '../../core/indexing/manifest';

/**
 * Reads the optional `.midoteca/course.json` manifest from a course directory.
 * A missing file, unreadable file or malformed JSON all resolve to `null`:
 * a bad manifest must never abort an otherwise valid scan.
 */
export class FsManifestLoader implements ManifestLoader {
  constructor(private readonly relativePath: string = MANIFEST_RELATIVE_PATH) {}

  async load(courseDir: string): Promise<CourseManifest | null> {
    const manifestPath = join(courseDir, ...this.relativePath.split('/'));
    let raw: string;
    try {
      raw = await readFile(manifestPath, 'utf8');
    } catch {
      return null;
    }
    try {
      return parseManifest(JSON.parse(raw));
    } catch {
      return null;
    }
  }
}
