import { describe, expect, it } from 'vitest';
import { organize, type PlannedCourse } from '../../../../src/modules/indexing/domain/organization';
import type { DiscoveredFile, MediaKind } from '../../../../src/modules/indexing/domain/types';
import { FLAT_COURSE_LISTING } from '../../../fixtures/flat-course-listing';

const VIDEO = /\.(ts|mp4)$/i;

function file(relativePath: string, kind: MediaKind): DiscoveredFile {
  const fileName = relativePath.split('/').pop()!;
  const dot = fileName.lastIndexOf('.');
  return {
    absolutePath: `/lib/${relativePath}`,
    relativePath,
    fileName,
    extension: dot > 0 ? fileName.slice(dot).toLowerCase() : '',
    kind,
    size: 100,
    modifiedAt: '2024-01-01T00:00:00.000Z',
  };
}

/** Only videos and PDFs are discovered (the scanner ignores .txt/.xlsx). */
function flatFolder(folder: string, names: readonly string[]): DiscoveredFile[] {
  return names.flatMap((name) => {
    if (VIDEO.test(name)) return [file(`${folder}/${name}`, 'video')];
    if (/\.pdf$/i.test(name)) return [file(`${folder}/${name}`, 'pdf')];
    return [];
  });
}

function onlyCourse(files: DiscoveredFile[]): PlannedCourse {
  const plan = organize(files, { rootLabel: 'biblioteca' });
  expect(plan.courses).toHaveLength(1);
  return plan.courses[0];
}

function modulesOf(course: PlannedCourse) {
  return course.sections.flatMap((section) => section.modules);
}

describe('modules detected from file names in a flat folder', () => {
  const course = onlyCourse(flatFolder('Mesa', FLAT_COURSE_LISTING));
  const modules = modulesOf(course);
  const byTitle = new Map(modules.map((module) => [module.title, module]));

  it('splits lives, the explicit "Módulo N" marker and the web series into modules', () => {
    expect(modules.map((module) => module.title)).toEqual([
      'Módulo 1',
      'Lives',
      'Módulo 2 - Análise Intermarket e Sentimento',
      'Websérie - MACRO DRIVERS',
    ]);
  });

  it('keeps every lesson exactly once, in file order inside each module', () => {
    const lessonPaths = modules.flatMap((module) => module.lessons.map((l) => l.relativePath));
    expect(new Set(lessonPaths).size).toBe(lessonPaths.length);
    // 106 video files (two share "037"); each file stays its own lesson.
    expect(lessonPaths).toHaveLength(106);

    const lives = byTitle.get('Lives')!;
    expect(lives.lessons.map((l) => l.order)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10]);

    const first = byTitle.get('Módulo 1')!;
    expect(first.lessons.map((l) => l.order)).toEqual([1, 11, 12, 13, 14, 15, 16, 17]);

    const second = byTitle.get('Módulo 2 - Análise Intermarket e Sentimento')!;
    expect(second.lessons).toHaveLength(86);
    expect(second.lessons[0].order).toBe(18);
    expect(second.lessons.at(-1)!.order).toBe(105);
  });

  it('keeps each file of the series as its own lesson (never orphans an indexed one)', () => {
    const series = byTitle.get('Websérie - MACRO DRIVERS')!;
    expect(series.lessons.map((l) => l.videos)).toEqual([
      ['Mesa/037 - Websérie - MACRO DRIVERS - Ep.2 - O que movem os juros_ - 1080p.mp4'],
      ['Mesa/037 - Websérie - MACRO DRIVERS - Ep.3 - O Ciclo de alta começa - audio.mp4'],
      ['Mesa/039 - Websérie - MACRO DRIVERS - Ep.3 - O Ciclo de alta começa - 1080p.mp4'],
    ]);
  });

  it('gives each detected module a stable synthetic path that is not a folder', () => {
    const paths = modules.map((module) => module.relativePath);
    expect(new Set(paths).size).toBe(paths.length);
    for (const path of paths) expect(path.startsWith('Mesa/::')).toBe(true);
  });

  it('attaches "Aula NN" materials to the module holding that lesson', () => {
    const docTitles = (title: string) => byTitle.get(title)!.documents.map((d) => d.title);
    expect(docTitles('Módulo 1')).toEqual([
      'Aula 05 - Introdução aos futuros',
      "Aula 06 - Dúvidas Gerais - Futuros vs CFD's",
      'Aula 07 - Especificação dos ativos',
    ]);
    expect(docTitles('Módulo 2 - Análise Intermarket e Sentimento')).toContain(
      'Aula 66- Opções - Parte III',
    );
    const attached = modules.reduce((sum, module) => sum + module.documents.length, 0);
    expect(attached + course.documents.length).toBe(73);
    expect(course.documents).toEqual([]);
  });
});

describe('a source that points straight at the flat course folder', () => {
  const files = flatFolder('x', FLAT_COURSE_LISTING).map((f) => ({
    ...f,
    relativePath: f.fileName,
  }));
  const plan = organize(files, { rootLabel: 'Profissão trader' });
  const modules = plan.courses[0].sections.flatMap((section) => section.modules);

  it('splits the root course the same way', () => {
    expect(plan.courses).toHaveLength(1);
    expect(plan.courses[0].relativePath).toBe('');
    expect(modules.map((module) => module.title)).toEqual([
      'Módulo 1',
      'Lives',
      'Módulo 2 - Análise Intermarket e Sentimento',
      'Websérie - MACRO DRIVERS',
    ]);
    expect(modules.map((module) => module.relativePath)).toEqual([
      '::aulas',
      '::lives',
      '::modulo-2',
      '::serie-websérie-macro-drivers',
    ]);
    expect(modules.reduce((sum, module) => sum + module.documents.length, 0)).toBe(73);
  });
});

describe('flat folders without name signals', () => {
  it('keep the single implicit module', () => {
    const course = onlyCourse(
      flatFolder('Curso X', ['01 - Intro.mp4', '02 - Setup.mp4', 'Apostila.pdf']),
    );
    const modules = modulesOf(course);
    expect(modules.map((module) => module.title)).toEqual(['Aulas']);
    expect(modules[0].relativePath).toBe('Curso X');
    expect(modules[0].documents.map((d) => d.title)).toEqual(['Apostila']);
  });

  it('keep numbered lessons together when no module marker exists', () => {
    const course = onlyCourse(
      flatFolder('Curso Y', ['Aula 01 - A.mp4', 'Aula 02 - B.mp4', 'Aula 03 - C.mp4']),
    );
    expect(modulesOf(course).map((module) => module.title)).toEqual(['Aulas']);
  });

  it('do not touch modules that come from real folders', () => {
    const course = onlyCourse([
      file('Curso Z/Módulo 1/Live 01.mp4', 'video'),
      file('Curso Z/Módulo 1/Aula 01 - Intro.mp4', 'video'),
    ]);
    const modules = modulesOf(course);
    expect(modules.map((module) => module.title)).toEqual(['Módulo 1']);
    expect(modules[0].lessons).toHaveLength(2);
  });
});
