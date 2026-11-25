import { describe, expect, it } from 'vitest';
import {
  groupCourseOptions,
  type StudyCourseOption,
} from '../../../../src/modules/study/domain/course-options';

const option = (
  title: string,
  library: { id: string | null; name: string },
  collectionTitle: string | null = null,
): StudyCourseOption => ({
  courseId: `${library.id}:${title}`,
  title,
  sourceId: library.id,
  libraryName: library.name,
  collectionTitle,
  moduleCount: 2,
  lessonCount: 10,
});

const trader = { id: 's1', name: 'Wyllian Capucci - Profissão trader' };
const produtividade = { id: 's2', name: 'Produtividade e Gestão do Tempo' };
const sans = { id: 's3', name: 'SANS_Collection' };
const loose = { id: null, name: 'Cursos avulsos' };

const catalog = [
  option('Profissão trader Análise de Fluxo e Opções', trader),
  option('Módulo 1 - Introdução', produtividade),
  option('Módulo 5 - Foco', produtividade),
  option('FOR 508 - Advanced Forensics', sans, 'Forense'),
  option('Inglês técnico', loose),
];

describe('groupCourseOptions', () => {
  it('agrupa os cursos pela biblioteca de origem, na ordem do catálogo', () => {
    const groups = groupCourseOptions(catalog, '');
    expect(groups.map((group) => [group.libraryName, group.courses.length])).toEqual([
      ['Wyllian Capucci - Profissão trader', 1],
      ['Produtividade e Gestão do Tempo', 2],
      ['SANS_Collection', 1],
      ['Cursos avulsos', 1],
    ]);
  });

  it('pesquisa sem diferenciar acentos nem maiúsculas, em curso, coleção e biblioteca', () => {
    expect(groupCourseOptions(catalog, 'FLUXO')[0].courses.map((c) => c.title)).toEqual([
      'Profissão trader Análise de Fluxo e Opções',
    ]);
    expect(groupCourseOptions(catalog, 'forense').map((g) => g.libraryName)).toEqual([
      'SANS_Collection',
    ]);
    const byLibrary = groupCourseOptions(catalog, 'gestao');
    expect(byLibrary.map((g) => g.libraryName)).toEqual(['Produtividade e Gestão do Tempo']);
    expect(byLibrary[0].courses).toHaveLength(2);
  });

  it('exige todos os termos (biblioteca + curso) e devolve vazio sem correspondência', () => {
    expect(
      groupCourseOptions(catalog, 'produtividade foco').flatMap((g) =>
        g.courses.map((c) => c.title),
      ),
    ).toEqual(['Módulo 5 - Foco']);
    expect(groupCourseOptions(catalog, 'kubernetes')).toEqual([]);
  });
});
