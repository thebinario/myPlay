import { describe, it, expect } from 'vitest';
import {
  canCheckAvailability,
  createLibrarySource,
  isDuplicateSource,
  normalizeSourcePath,
  sourceDisplayName,
} from '@/modules/sources/domain/source-rules';

describe('sources/domain — source-rules', () => {
  it('normaliza separadores e remove barras finais', () => {
    expect(normalizeSourcePath('  D:\\Cursos\\  ')).toBe('D:/Cursos');
    expect(normalizeSourcePath('/media/hd/')).toBe('/media/hd');
  });

  it('deriva um nome legível do caminho', () => {
    expect(sourceDisplayName('D:/Cursos/TypeScript')).toBe('TypeScript');
    expect(sourceDisplayName('D:/')).toBe('D:');
  });

  it('detecta duplicidade ignorando caixa e barras finais', () => {
    const sources = [createLibrarySource('D:/Cursos', { id: 's1' })];
    expect(isDuplicateSource(sources, 'd:/cursos/')).toBe(true);
    expect(isDuplicateSource(sources, 'D:/Outro')).toBe(false);
    expect(isDuplicateSource(sources, '   ')).toBe(false);
  });

  it('cria fonte conectada e sem conteúdos conhecidos', () => {
    const source = createLibrarySource('D:/Filmes', { id: 's1', name: '  ' });
    expect(source).toMatchObject({
      id: 's1',
      path: 'D:/Filmes',
      name: 'Filmes',
      status: 'connected',
      itemCount: 0,
      lastScannedAt: null,
    });
  });

  it('não permite verificar uma fonte já em verificação', () => {
    expect(canCheckAvailability({ ...createLibrarySource('D:/A'), status: 'connected' })).toBe(
      true,
    );
    expect(canCheckAvailability({ ...createLibrarySource('D:/A'), status: 'checking' })).toBe(
      false,
    );
  });
});
