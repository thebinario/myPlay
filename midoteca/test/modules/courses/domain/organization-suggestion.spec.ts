import { describe, expect, it } from 'vitest';
import {
  buildSuggestedModules,
  orderLessonsForSuggestion,
  planDocumentTargets,
  suggestionCoversCourse,
} from '../../../../src/modules/courses/domain/organization-suggestion';

describe('orderLessonsForSuggestion', () => {
  it('follows the files order even when detection already split the course', () => {
    const modules = [
      {
        lessons: [
          { id: 'a', title: 'Aula 01', relativePath: '011 - Aula 01.ts' },
          { id: 'b', title: 'Informações', relativePath: '001 - Informações.ts' },
        ],
      },
      { lessons: [{ id: 'c', title: 'Live', relativePath: '002 - Live.ts' }] },
      { lessons: [{ id: 'd', title: 'Aula 10', relativePath: '100 - Aula 10.ts' }] },
    ];
    expect(orderLessonsForSuggestion(modules).map((l) => l.id)).toEqual(['b', 'c', 'a', 'd']);
  });

  it('keeps the module order for lessons without a file path', () => {
    const modules = [
      { lessons: [{ id: 'x', title: 'X', relativePath: null }] },
      { lessons: [{ id: 'y', title: 'Y', relativePath: null }] },
    ];
    expect(orderLessonsForSuggestion(modules).map((l) => l.id)).toEqual(['x', 'y']);
  });
});

describe('buildSuggestedModules', () => {
  const ids = ['l1', 'l2', 'l3', 'l4', 'l5', 'l6'];

  it('turns 1-based starts into contiguous modules covering every lesson', () => {
    expect(
      buildSuggestedModules(ids, [
        { title: 'Lives', start: 1 },
        { title: 'Introdução', start: 3 },
        { title: 'Volume', start: 5 },
      ]),
    ).toEqual([
      { title: 'Lives', lessonIds: ['l1', 'l2'] },
      { title: 'Introdução', lessonIds: ['l3', 'l4'] },
      { title: 'Volume', lessonIds: ['l5', 'l6'] },
    ]);
  });

  it('drops starts that go backwards or out of range and forces the first one to 1', () => {
    expect(
      buildSuggestedModules(ids, [
        { title: 'A', start: 2 },
        { title: 'B', start: 4 },
        { title: 'C', start: 3 },
        { title: 'D', start: 99 },
      ]),
    ).toEqual([
      { title: 'A', lessonIds: ['l1', 'l2', 'l3'] },
      { title: 'B', lessonIds: ['l4', 'l5', 'l6'] },
    ]);
  });

  it('names untitled modules and trims titles', () => {
    expect(
      buildSuggestedModules(
        ['l1', 'l2'],
        [
          { title: '  ', start: 1 },
          { title: ' Fim ', start: 2 },
        ],
      ),
    ).toEqual([
      { title: 'Módulo 1', lessonIds: ['l1'] },
      { title: 'Fim', lessonIds: ['l2'] },
    ]);
  });

  it('falls back to a single module when nothing usable came back', () => {
    expect(buildSuggestedModules(['l1', 'l2'], [])).toEqual([
      { title: 'Módulo 1', lessonIds: ['l1', 'l2'] },
    ]);
  });
});

describe('suggestionCoversCourse', () => {
  const modules = [
    { title: 'A', lessonIds: ['l1', 'l2'] },
    { title: 'B', lessonIds: ['l3'] },
  ];

  it('accepts a suggestion that still covers exactly the course lessons', () => {
    expect(suggestionCoversCourse(modules, ['l3', 'l2', 'l1'])).toBe(true);
  });

  it('rejects it when the course gained or lost lessons since it was made', () => {
    expect(suggestionCoversCourse(modules, ['l1', 'l2'])).toBe(false);
    expect(suggestionCoversCourse(modules, ['l1', 'l2', 'l3', 'l4'])).toBe(false);
  });
});

describe('planDocumentTargets', () => {
  const modules = [
    { title: 'Intro', lessons: [{ title: 'Hotmart Club - Aula 05 - Futuros' }] },
    { title: 'Opções', lessons: [{ title: 'Hotmart Club - Aula 66 - Estruturadas' }] },
  ];

  it('sends "Aula NN" materials to the module holding lesson NN, others to the course', () => {
    expect(
      planDocumentTargets(modules, [
        { documentId: 'd1', title: 'Aula 66- Opções - Parte III' },
        { documentId: 'd2', title: 'Aula 05 - Introdução aos futuros' },
        { documentId: 'd3', title: 'Apostila geral' },
      ]),
    ).toEqual([
      { documentId: 'd1', moduleIndex: 1 },
      { documentId: 'd2', moduleIndex: 0 },
      { documentId: 'd3', moduleIndex: null },
    ]);
  });
});
