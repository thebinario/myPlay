import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { createMidoteca, type Midoteca } from '../../../../src/index';
import type { FrameSampler, MediaProber } from '../../../../src/modules/media';
import { createTempDatabase, type TempDatabase } from '../../../helpers/temp-db';
import { createTempLibrary, type TempLibrary } from '../../../helpers/temp-library';

/**
 * Fixture files encode what ffprobe/ffmpeg would report:
 *   `dur=<ms>;frames=<hex,hex,...>;<noise>`
 * The real file hasher reads the real bytes; probe and frame sampling are
 * faked here (they are covered by the ffmpeg integration test).
 */
function fixture(durationMs: number, frames: string[], noise = ''): string {
  return `dur=${durationMs};frames=${frames.join(',')};${noise}`;
}

async function parse(path: string) {
  const text = await readFile(path, 'utf8');
  const [, dur, frames] = /^dur=(\d+);frames=([^;]*);/.exec(text) ?? [];
  return { durationMs: Number(dur), frames: frames ? frames.split(',') : [] };
}

const prober: MediaProber = {
  probe: async (path) => ({ durationMs: (await parse(path)).durationMs }),
};

const sampler: FrameSampler = {
  sampleHashes: async (path) => (await parse(path)).frames,
};

const FRAMES_A = ['00ff00ff00ff00ff', 'ffff0000ffff0000', '0f0f0f0f0f0f0f0f', 'aaaaaaaaaaaaaaaa'];
const FRAMES_A_REENCODED = [
  '00ff00ff00ff00fe',
  'ffff0000ffff0001',
  '0f0f0f0f0f0f0f0f',
  'aaaaaaaaaaaaaaab',
];
const FRAMES_B = ['ff00ff00ff00ff00', '0000ffff0000ffff', 'f0f0f0f0f0f0f0f0', '5555555555555555'];

describe('duplicate analysis (SQLite + real files)', () => {
  let temp: TempDatabase;
  let library: TempLibrary;
  let app: Midoteca;

  beforeEach(() => {
    temp = createTempDatabase();
    library = createTempLibrary();
    app = createMidoteca({ databaseFile: temp.file, mediaTools: { prober, sampler } });
  });

  afterEach(async () => {
    await app.jobRunner.stop();
    app.close();
    temp.cleanup();
    library.cleanup();
  });

  async function scanAndAnalyze(): Promise<string> {
    const sources = await app.sources.listSources();
    const source = sources[0] ?? (await app.sources.addSource({ rootPath: library.root }));
    await app.indexer.runScan({ sourceId: source.id });
    await app.jobRunner.drain();
    return source.id;
  }

  async function lessonIdOf(courseTitle: string): Promise<string> {
    const page = await app.queries.listCourses({ limit: 50, offset: 0 });
    const course = page.items.find((item) => item.title.includes(courseTitle))!;
    const tree = await app.courses.getTree(course.id);
    return tree!.modules[0].lessons[0].id;
  }

  it('probes the duration and groups identical copies by full sha256', async () => {
    const content = fixture(600_000, FRAMES_A, 'same-bytes');
    library.write('Curso A/Modulo 1/01 - Intro.mp4', content);
    library.write('Curso B/Modulo 1/01 - Intro (Cópia).mp4', content);
    library.write('Curso C/Modulo 1/01 - Outra.mp4', fixture(300_000, FRAMES_B));

    await scanAndAnalyze();

    const groups = await app.duplicates.listGroups();
    expect(groups).toHaveLength(1);
    expect(groups[0].kind).toBe('exact');
    expect(groups[0].members.map((m) => m.relativePath).sort()).toEqual([
      'Curso A/Modulo 1/01 - Intro.mp4',
      'Curso B/Modulo 1/01 - Intro (Cópia).mp4',
    ]);
    expect(groups[0].members[0].lessons[0]).toMatchObject({ courseTitle: expect.any(String) });

    const rows = app.database
      .prepare(
        `SELECT relative_path, duration_ms, sha256, partial_hash FROM media_files ORDER BY relative_path`,
      )
      .all() as Array<{
      relative_path: string;
      duration_ms: number;
      sha256: string | null;
      partial_hash: string | null;
    }>;
    expect(rows.every((row) => row.partial_hash && row.duration_ms > 0)).toBe(true);
    // Full hashes only for files that share size + partial hash.
    expect(rows.filter((row) => row.sha256).map((row) => row.relative_path)).toHaveLength(2);
  });

  it('detects re-encoded copies by perceptual fingerprint when durations match', async () => {
    library.write('Curso A/Modulo 1/01 - Aula.mp4', fixture(600_000, FRAMES_A, 'hd'));
    library.write(
      'Curso B/Modulo 1/01 - Aula 480p.mp4',
      fixture(601_000, FRAMES_A_REENCODED, 'sd-smaller'),
    );
    library.write('Curso C/Modulo 1/01 - Diferente.mp4', fixture(600_500, FRAMES_B, 'other'));

    await scanAndAnalyze();

    const groups = await app.duplicates.listGroups();
    expect(groups).toHaveLength(1);
    expect(groups[0].kind).toBe('perceptual');
    expect(groups[0].members).toHaveLength(2);
  });

  it('shows that a duplicate lesson was already watched and lets the person reuse it', async () => {
    const content = fixture(60_000, FRAMES_A, 'same');
    library.write('Curso A/Modulo 1/01 - Intro.mp4', content);
    library.write('Curso B/Modulo 1/01 - Intro.mp4', content);
    await scanAndAnalyze();
    const watched = await lessonIdOf('Curso A');
    const other = await lessonIdOf('Curso B');

    for (let from = 0; from < 54_000; from += 9_000) {
      await app.watchProgress.recordSegment({
        lessonId: watched,
        fromMs: from,
        toMs: from + 9_000,
      });
    }

    const page = await app.queries.listCourses({ limit: 50, offset: 0 });
    const courseB = page.items.find((item) => item.title.includes('Curso B'))!;
    const tree = await app.courses.getTree(courseB.id);
    expect(tree!.modules[0].lessons[0].watchedElsewhere).toMatchObject({
      lessonId: watched,
      courseTitle: expect.stringContaining('Curso A'),
      watchedRatio: 0.9,
    });

    const reused = await app.duplicates.markAsWatched({ lessonId: other, fromLessonId: watched });
    expect(reused.completionSource).toBe('duplicate');
    expect(reused.completedAt).not.toBeNull();
  });

  it('refuses to reuse progress between lessons that are not duplicates', async () => {
    library.write('Curso A/Modulo 1/01 - Um.mp4', fixture(60_000, FRAMES_A, 'one'));
    library.write('Curso B/Modulo 1/01 - Dois.mp4', fixture(30_000, FRAMES_B, 'two'));
    await scanAndAnalyze();
    await expect(
      app.duplicates.markAsWatched({
        lessonId: await lessonIdOf('Curso B'),
        fromLessonId: await lessonIdOf('Curso A'),
      }),
    ).rejects.toThrow(/duplicate/i);
  });

  it('re-analyzes a file whose content changed', async () => {
    const content = fixture(60_000, FRAMES_A, 'same');
    library.write('Curso A/Modulo 1/01 - Intro.mp4', content);
    library.write('Curso B/Modulo 1/01 - Intro.mp4', content);
    await scanAndAnalyze();
    expect(await app.duplicates.listGroups()).toHaveLength(1);

    library.write(
      'Curso B/Modulo 1/01 - Intro.mp4',
      fixture(45_000, FRAMES_B, 'edited'),
      new Date('2030-01-01T00:00:00Z'),
    );
    await scanAndAnalyze();

    expect(await app.duplicates.listGroups()).toHaveLength(0);
  });

  it('reports analysis status for the settings screen', async () => {
    library.write('Curso A/Modulo 1/01 - Intro.mp4', fixture(60_000, FRAMES_A));
    await scanAndAnalyze();
    expect(await app.duplicates.analysisStatus()).toMatchObject({
      pending: 0,
      analyzed: 1,
      failed: 0,
    });
  });
});
