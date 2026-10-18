import { describe, expect, it } from 'vitest';
import {
  cleanName,
  naturalCompare,
  organize,
  parseSubtitle,
} from '../src/modules/indexing/domain/organization';
import type { DiscoveredFile, MediaKind } from '../src/modules/indexing/domain/types';

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

describe('name parsing', () => {
  it('strips ordering prefixes and normalizes separators', () => {
    expect(cleanName('01 - Introdução.mp4')).toEqual({
      order: 1,
      title: 'Introdução',
    });
    expect(cleanName('02_instalacao.mp4')).toEqual({
      order: 2,
      title: 'instalacao',
    });
    expect(cleanName('03.Setup Final.mp4')).toEqual({
      order: 3,
      title: 'Setup Final',
    });
    expect(cleanName('Aula sem numero.mp4')).toEqual({
      order: Number.MAX_SAFE_INTEGER,
      title: 'Aula sem numero',
    });
  });

  it('compares numerically-aware', () => {
    expect(naturalCompare('aula 2', 'aula 10')).toBeLessThan(0);
    expect(naturalCompare('aula 10', 'aula 2')).toBeGreaterThan(0);
    expect(naturalCompare('Aula', 'aula')).toBe(0);
  });

  it('parses subtitle language suffixes', () => {
    expect(parseSubtitle('mod/01 - Intro.pt-BR.srt')).toEqual({
      base: 'mod/01 - Intro',
      language: 'pt-br',
    });
    expect(parseSubtitle('mod/01 - Intro.srt')).toEqual({
      base: 'mod/01 - Intro',
      language: null,
    });
  });
});

describe('organize', () => {
  it('maps a nested tree into course > section > module > lesson', () => {
    const plan = organize(
      [
        file('Curso A/Modulo 1/01 - Intro.mp4', 'video'),
        file('Curso A/Modulo 1/02 - Setup.mp4', 'video'),
        file('Curso A/Modulo 2/03 - Fim.mp4', 'video'),
        file('Curso A/Modulo 1/Apostila.pdf', 'pdf'),
        file('Curso A/Apostila Geral.pdf', 'pdf'),
      ],
      { rootLabel: 'HD' },
    );

    expect(plan.courses).toHaveLength(1);
    const course = plan.courses[0];
    expect(course.relativePath).toBe('Curso A');
    expect(course.title).toBe('Curso A');
    expect(course.collectionPath).toBeNull();
    expect(course.sections).toHaveLength(1);
    expect(course.sections[0].modules.map((m) => m.relativePath)).toEqual([
      'Curso A/Modulo 1',
      'Curso A/Modulo 2',
    ]);
    expect(course.sections[0].modules[0].lessons.map((l) => l.title)).toEqual(['Intro', 'Setup']);
    expect(course.sections[0].modules[0].documents.map((d) => d.title)).toEqual(['Apostila']);
    expect(course.documents.map((d) => d.title)).toEqual(['Apostila Geral']);
    expect(plan.looseDocuments).toHaveLength(0);
  });

  it('treats a plain sub-folder as a section and collapses the module', () => {
    const plan = organize(
      [file('Curso B/01 - Solto.mp4', 'video'), file('Curso B/Sub/01 - Aninhado.mp4', 'video')],
      { rootLabel: 'HD' },
    );
    const course = plan.courses[0];
    const sectionTitles = course.sections.map((s) => s.title).sort();
    expect(sectionTitles).toContain('Conteúdo');
    expect(sectionTitles).toContain('Sub');
    const sub = course.sections.find((s) => s.title === 'Sub')!;
    expect(sub.modules.map((m) => m.title)).toContain('Aulas');
  });

  it('places root PDFs beside course videos in the implicit module ordered by name', () => {
    const plan = organize(
      [
        file('midoteca_test/video.mp4', 'video'),
        file('midoteca_test/03 - terceiro.pdf', 'pdf'),
        file('midoteca_test/01 - primeiro.pdf', 'pdf'),
        file('midoteca_test/02 - segundo.pdf', 'pdf'),
      ],
      { rootLabel: 'HD' },
    );

    const section = plan.courses[0].sections[0];
    expect(section.modules).toHaveLength(1);
    expect(section.modules[0].title).toBe('Aulas');
    expect(section.modules[0].documents.map((document) => document.title)).toEqual([
      'primeiro',
      'segundo',
      'terceiro',
    ]);
  });

  it('puts root PDFs inside a synthetic course when root videos exist', () => {
    const plan = organize(
      [file('raiz.mp4', 'video'), file('manual.pdf', 'pdf'), file('SemVideo/nota.pdf', 'pdf')],
      { rootLabel: 'HD Cursos' },
    );
    expect(plan.courses).toHaveLength(1);
    expect(plan.courses[0].title).toBe('HD Cursos');
    expect(plan.courses[0].relativePath).toBe('');
    expect(plan.courses[0].sections[0].modules[0].lessons).toHaveLength(1);
    expect(
      plan.courses[0].sections[0].modules[0].documents.map((document) => document.title),
    ).toEqual(['manual']);
    expect(plan.looseDocuments.map((d) => d.title)).toEqual(['nota']);
  });

  it('matches subtitles to sibling videos as tracks', () => {
    const plan = organize(
      [
        file('Curso/Mod/01 - Intro.mp4', 'video'),
        file('Curso/Mod/01 - Intro.pt-BR.srt', 'subtitle'),
        file('Curso/Mod/99 - Orfa.srt', 'subtitle'),
      ],
      { rootLabel: 'HD' },
    );
    expect(plan.tracks).toEqual([
      {
        videoRelativePath: 'Curso/Mod/01 - Intro.mp4',
        subtitleRelativePath: 'Curso/Mod/01 - Intro.pt-BR.srt',
        language: 'pt-br',
      },
    ]);
  });

  it('derives collections, facets, sections and dedups encodings from real paths', () => {
    const base =
      'Coleção 01 - Tecnologia/Programação Front-end/Udemy/Curso 01 - Lógica de Programação';
    const plan = organize(
      [
        file(`${base}/Aulas/Aula 01 - Boas-vindas.webm`, 'video'),
        file(`${base}/Aulas/Aula 02 - Lógica 720p.mp4`, 'video'),
        file(`${base}/Aulas/Aula 02 - Lógica 1080p (Cópia).mp4`, 'video'),
        file(`${base}/Aulas/Apostila.pdf`, 'pdf'),
        file(`${base}/03 - Ao Vivo/Aula 03 - Vídeo 540p.ts`, 'video'),
        file(`${base}/03 - Ao Vivo/Apostila 05 - Resumo.pdf`, 'pdf'),
      ],
      { rootLabel: 'HD' },
    );

    expect(plan.collections).toHaveLength(1);
    const collection = plan.collections[0];
    expect(collection.relativePath).toBe('Coleção 01 - Tecnologia');
    expect(collection.courses).toHaveLength(1);

    const course = collection.courses[0];
    expect(course.title).toBe('Curso 01 - Lógica de Programação');
    expect(course.collectionPath).toBe('Coleção 01 - Tecnologia');
    expect(course.category).toBe('Programação Front-end');
    expect(course.provider).toBe('Udemy');
    expect(plan.courses[0].relativePath).toBe(course.relativePath);

    const sectionTitles = course.sections.map((s) => s.title).sort();
    expect(sectionTitles).toEqual(['Ao Vivo', 'Aulas']);

    const aulas = course.sections.find((s) => s.title === 'Aulas')!;
    const logic = aulas.modules[0].lessons.find((l) => l.videos.length === 2);
    expect(logic).toBeDefined();
    expect(aulas.modules[0].documents.map((d) => d.title)).toEqual(['Apostila']);

    const aoVivo = course.sections.find((s) => s.title === 'Ao Vivo')!;
    expect(aoVivo.modules[0].lessons).toHaveLength(1);
    expect(aoVivo.modules[0].documents.map((d) => d.title)).toEqual(['Apostila 05 - Resumo']);
  });

  it('keeps PDF-only folders (no course marker, no videos) as loose documents', () => {
    const plan = organize([file('Coleção 01/Programação/Udemy/Curso X/SemVideo/nota.pdf', 'pdf')], {
      rootLabel: 'HD',
    });
    expect(plan.courses).toHaveLength(0);
    expect(plan.looseDocuments.map((d) => d.title)).toEqual(['nota']);
  });
});
