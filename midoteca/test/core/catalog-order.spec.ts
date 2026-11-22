import { describe, expect, it } from 'vitest';
import {
  compareCatalogEntries,
  compareCatalogTitles,
  ordinalNumber,
} from '../../src/core/catalog-order';

const sortTitles = (titles: string[]) => [...titles].sort(compareCatalogTitles);

describe('core/catalog-order', () => {
  it('ordena módulos numerados pelo número, não pelo texto (2 antes de 10)', () => {
    expect(
      sortTitles(['Módulo 10 - Bônus', 'Módulo 2 - Alta Performance', 'Módulo 1 - Introdução']),
    ).toEqual(['Módulo 1 - Introdução', 'Módulo 2 - Alta Performance', 'Módulo 10 - Bônus']);
  });

  it('coloca itens sem numeração (Bônus, Extras) depois dos numerados', () => {
    expect(sortTitles(['Bônus', 'Módulo 2', 'Extras', 'Módulo 1'])).toEqual([
      'Módulo 1',
      'Módulo 2',
      'Bônus',
      'Extras',
    ]);
  });

  it('ignora acentos e caixa: "Modulo 2" fica entre "Módulo 1" e "MÓDULO 3"', () => {
    expect(sortTitles(['MÓDULO 3', 'Modulo 2', 'Módulo 1'])).toEqual([
      'Módulo 1',
      'Modulo 2',
      'MÓDULO 3',
    ]);
  });

  it('reproduz a lista relatada: numerados em ordem e o bônus sem número por último', () => {
    expect(
      sortTitles([
        'Bônus',
        'Módulo 1 - Introdução',
        'Módulo 10 - Bônus',
        'Modulo 2 - Alta Performance',
        'Módulo 3 - Priorização',
        'Módulo 4 - Definição de objetivos e planejamento',
        'Módulo 5 -Foco',
        'Módulo 6 - Hábito e disciplina',
      ]),
    ).toEqual([
      'Módulo 1 - Introdução',
      'Modulo 2 - Alta Performance',
      'Módulo 3 - Priorização',
      'Módulo 4 - Definição de objetivos e planejamento',
      'Módulo 5 -Foco',
      'Módulo 6 - Hábito e disciplina',
      'Módulo 10 - Bônus',
      'Bônus',
    ]);
  });

  it('reconhece numeração no início ou após uma palavra ordinal', () => {
    expect(ordinalNumber('03 - Abertura')).toBe(3);
    expect(ordinalNumber('Aula 7: Revisão')).toBe(7);
    expect(ordinalNumber('Capítulo 12')).toBe(12);
    expect(ordinalNumber('Module 4 – Setup')).toBe(4);
    expect(ordinalNumber('[02] Ferramentas')).toBe(2);
  });

  it('não confunde número no nome do assunto com numeração (Python 3 ≠ item 3)', () => {
    expect(ordinalNumber('Python 3 para iniciantes')).toBeNull();
    expect(ordinalNumber('Bônus')).toBeNull();
    expect(sortTitles(['Python 3', 'Java', 'Álgebra'])).toEqual(['Álgebra', 'Java', 'Python 3']);
  });

  it('respeita a ordem persistida (manual ou prefixo) antes do título', () => {
    const entries = [
      { sortOrder: 2, title: 'Módulo 1' },
      { sortOrder: 0, title: 'Bônus' },
      { sortOrder: 2, title: 'Aula' },
    ];
    expect([...entries].sort(compareCatalogEntries).map((e) => e.title)).toEqual([
      'Bônus',
      'Módulo 1',
      'Aula',
    ]);
  });
});
