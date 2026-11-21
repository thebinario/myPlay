import { readFile } from 'node:fs/promises';
import type { Cue } from '../domain/content-chunking';
import type { SubtitleReader } from '../domain/ports';
import { parseSubtitles } from './subtitle-parser';

/** Many legacy .srt files are Windows-1252; fall back when UTF-8 is invalid. */
function decode(bytes: Buffer): string {
  const utf8 = bytes.toString('utf8');
  return utf8.includes('�') ? bytes.toString('latin1') : utf8;
}

export class FsSubtitleReader implements SubtitleReader {
  async readCues(absolutePath: string): Promise<Cue[]> {
    return parseSubtitles(decode(await readFile(absolutePath)));
  }
}
