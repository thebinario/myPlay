/**
 * `map-catalog` — projeções puras do catálogo do kernel (`CourseTree`,
 * `DocumentSummary`, `MediaFile`) para o modelo da UI. Sem IPC, sem React.
 */
import { describe, it, expect } from 'vitest';
import type { CourseTree, DocumentSummary, MediaFile } from '@midoteca/core';
import {
  buildMediaUrl,
  mapCourseTree,
  mapDocumentSummary,
} from '@/modules/library/infrastructure/ipc/map-catalog';

function media(overrides: Partial<MediaFile> & { id: string }): MediaFile {
  return {
    sourceId: 'src-1',
    relativePath: `${overrides.id}.mp4`,
    mediaType: 'video',
    fileSize: 100,
    durationMs: 60_000,
    modifiedAt: '2026-10-01T00:00:00Z',
    sha256: null,
    availability: 'available',
    lastSeenAt: '2026-10-01T00:00:00Z',
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
    ...overrides,
  };
}

function courseTree(): CourseTree {
  return {
    totalDurationSeconds: 999,
    pdfCount: 3,
    completionPercentage: 50,
    course: {
      id: 'c1',
      title: 'Curso Real',
      description: null,
      metadata: { category: 'Engenharia', tags: ['x', 'y'], coverUrl: 'cover.png' },
      sourceId: 'src-1',
      relativePath: 'Curso Real',
      detectedTitle: 'Curso Real',
      titleSource: 'detected',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    },
    modules: [
      {
        id: 'm1',
        courseId: 'c1',
        title: 'Módulo A',
        sortOrder: 2,
        sortSource: 'detected',
        relativePath: 'Modulo A',
        detectedTitle: 'Modulo A',
        titleSource: 'detected',
        documents: [
          {
            id: 'd1',
            mediaFileId: 'pdf1',
            title: '02 - apostila.pdf',
            pageCount: 12,
            titleSource: 'detected',
          },
        ],
        lessons: [
          {
            id: 'l1',
            moduleId: 'm1',
            title: 'Aula 1',
            sortOrder: 1,
            sortSource: 'detected',
            relativePath: 'aula-01.mp4',
            detectedTitle: 'aula-01',
            titleSource: 'detected',
            media: [{ lessonId: 'l1', mediaFileId: 'mv1', role: 'primary' }],
          },
          {
            id: 'l2',
            moduleId: 'm1',
            title: 'Aula 2',
            sortOrder: 2,
            sortSource: 'detected',
            relativePath: 'aula-02.mp4',
            detectedTitle: 'aula-02',
            titleSource: 'detected',
            media: [{ lessonId: 'l2', mediaFileId: 'mv2', role: 'primary' }],
          },
        ],
      },
    ],
    sections: [],
    documents: [
      {
        id: 'd2',
        mediaFileId: 'pdf2',
        title: '01 - guia geral.pdf',
        pageCount: 6,
        titleSource: 'detected',
      },
    ],
  };
}

describe('buildMediaUrl', () => {
  it('monta URL do protocolo desktop codificando o caminho completo', () => {
    expect(buildMediaUrl('/Volumes/HD/', '/Curso/Aula 1.mp4')).toBe(
      'midoteca-media://media/%2FVolumes%2FHD%2FCurso%2FAula%201.mp4',
    );
  });

  it('retorna vazio quando falta raiz ou caminho relativo', () => {
    expect(buildMediaUrl(undefined, 'a.mp4')).toBe('');
    expect(buildMediaUrl('/Volumes/HD', null)).toBe('');
  });
});

describe('mapCourseTree', () => {
  it('projeta módulos e aulas com duração, videoUrl e category/tags do metadata', () => {
    const mediaById = new Map([
      ['mv1', media({ id: 'mv1', durationMs: 90_000, relativePath: 'Curso/aula-01.mp4' })],
      ['mv2', media({ id: 'mv2', durationMs: 30_000, relativePath: 'Curso/aula-02.mp4' })],
      [
        'pdf1',
        media({
          id: 'pdf1',
          mediaType: 'pdf',
          durationMs: null,
          relativePath: 'Curso/apostila.pdf',
        }),
      ],
      [
        'pdf2',
        media({ id: 'pdf2', mediaType: 'pdf', durationMs: null, relativePath: 'Curso/guia.pdf' }),
      ],
    ]);
    const roots = new Map([['src-1', '/Volumes/HD']]);

    const course = mapCourseTree(courseTree(), mediaById, roots);

    expect(course.id).toBe('c1');
    expect(course.type).toBe('course');
    expect(course.title).toBe('Curso Real');
    expect(course.description).toBe('');
    expect(course.category).toBe('Engenharia');
    expect(course.tags).toEqual(['x', 'y']);
    expect(course.collectionId).toBeNull();
    expect(course.sections).toBeUndefined();
    expect(course.totalDuration).toBe(999);
    expect(course.modules).toHaveLength(1);
    expect(course.modules[0].title).toBe('Módulo A');
    expect(course.modules[0].lessons.map((l) => l.duration)).toEqual([90, 30]);
    expect(course.modules[0].lessons[0].videoUrl).toBe(
      'midoteca-media://media/%2FVolumes%2FHD%2FCurso%2Faula-01.mp4',
    );
    expect(course.modules[0].lessons[0].materials).toEqual([]);
    expect(course.modules[0].lessons[0].completed).toBe(false);
    expect(course.modules[0].documents?.map((doc) => doc.title)).toEqual(['02 - apostila.pdf']);
    expect(course.pdfCount).toBe(3);
    expect(course.modules[0].documents?.[0].fileUrl).toBe(
      'midoteca-media://media/%2FVolumes%2FHD%2FCurso%2Fapostila.pdf',
    );
  });

  it('marca aula como indisponível quando o arquivo físico sumiu', () => {
    const mediaById = new Map([['mv1', media({ id: 'mv1', availability: 'missing' })]]);
    const course = mapCourseTree(courseTree(), mediaById, new Map([['src-1', '/HD']]));

    expect(course.modules[0].lessons[0].isUnavailable).toBe(true);
    expect(course.modules[0].lessons[1].isUnavailable).toBeFalsy();
    expect(course.modules[0].lessons[1].duration).toBe(0);
  });

  it('projeta seções e collectionId quando o curso pertence a uma coleção', () => {
    const base = courseTree();
    const tree: CourseTree = {
      ...base,
      course: { ...base.course, collectionId: 'col-1' },
      sections: [
        {
          id: 's1',
          courseId: 'c1',
          title: 'Módulo A',
          sortOrder: 1,
          sortSource: 'detected',
          relativePath: 'Modulo A',
          titleSource: 'detected',
          modules: base.modules,
        },
      ],
    };

    const course = mapCourseTree(tree, new Map(), new Map());

    expect(course.collectionId).toBe('col-1');
    expect(course.sections).toHaveLength(1);
    expect(course.sections?.[0].id).toBe('s1');
    expect(course.sections?.[0].modules[0].id).toBe('m1');
  });
});

describe('mapDocumentSummary', () => {
  it('projeta o documento com páginas e fileUrl resolvido', () => {
    const summary: DocumentSummary = {
      id: 'd1',
      title: 'Manual.pdf',
      mediaFileId: 'mv9',
      titleSource: 'detected',
      pageCount: 42,
    };
    const mediaById = new Map([
      [
        'mv9',
        media({ id: 'mv9', mediaType: 'pdf', durationMs: null, relativePath: 'docs/Manual.pdf' }),
      ],
    ]);

    const doc = mapDocumentSummary(summary, mediaById, new Map([['src-1', '/HD']]));

    expect(doc).toMatchObject({
      id: 'd1',
      type: 'document',
      title: 'Manual.pdf',
      totalPages: 42,
      lastReadPage: 1,
      fileUrl: 'midoteca-media://media/%2FHD%2Fdocs%2FManual.pdf',
    });
  });

  it('tolera documento sem arquivo físico conhecido', () => {
    const summary: DocumentSummary = {
      id: 'd2',
      title: 'Órfão.pdf',
      mediaFileId: 'missing',
      titleSource: 'detected',
      pageCount: null,
    };

    const doc = mapDocumentSummary(summary, new Map(), new Map());

    expect(doc.totalPages).toBe(0);
    expect(doc.fileUrl).toBe('');
  });
});
