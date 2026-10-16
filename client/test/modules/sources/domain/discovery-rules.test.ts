import { describe, it, expect } from 'vitest';
import { discoveredKindFromPath } from '@/modules/sources/domain/discovery-rules';

describe('discoveredKindFromPath — classificação de arquivos descobertos', () => {
  it.each([
    ['Curso/aula-01.mp4', 'movie'],
    ['Filme/Series/F01E02.MKV', 'movie'],
    ['Backup/documentario.mov', 'movie'],
    ['Docs/manual.PDF', 'document'],
    ['Docs/guia.pdf', 'document'],
  ] as const)('mapeia %s → %s', (relativePath, kind) => {
    expect(discoveredKindFromPath(relativePath)).toBe(kind);
  });

  it('ignora arquivos sem conteúdo catalogável', () => {
    expect(discoveredKindFromPath('Curso/legenda.srt')).toBeNull();
    expect(discoveredKindFromPath('Curso/.DS_Store')).toBeNull();
    expect(discoveredKindFromPath('Curso/sem-extensao')).toBeNull();
  });
});
