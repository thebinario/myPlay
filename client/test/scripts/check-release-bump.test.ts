import { describe, expect, it } from 'vitest';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { checkReleaseNotes, compareVersions } = require('../../scripts/check-release-bump.cjs');

const RELEASED = '## [1.1.0-beta.2] - 2026-11-21\n\n### Adicionado\n\n- Algo antigo.\n';
const doc = (unreleased: string, extra = '') =>
  `# Changelog\n\n## [Unreleased]\n${unreleased}\n${extra}${RELEASED}`;

describe('scripts — check-release-bump', () => {
  it('ordena versões SemVer com pré-release beta', () => {
    expect(compareVersions('1.1.0-beta.1', '1.0.0')).toBeGreaterThan(0);
    expect(compareVersions('1.1.0', '1.1.0-beta.9')).toBeGreaterThan(0);
    expect(compareVersions('1.1.0-beta.10', '1.1.0-beta.9')).toBeGreaterThan(0);
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
  });

  it('aceita um PR comum que registra a mudança em [Unreleased] sem mexer na versão', () => {
    expect(
      checkReleaseNotes({
        baseVersion: '1.1.0-beta.2',
        headVersion: '1.1.0-beta.2',
        baseChangelog: doc(''),
        headChangelog: doc('\n### Corrigido\n\n- Ordem dos módulos.\n'),
      }),
    ).toEqual([]);
  });

  it('rejeita um PR comum que não acrescenta nada em [Unreleased]', () => {
    const errors = checkReleaseNotes({
      baseVersion: '1.1.0-beta.2',
      headVersion: '1.1.0-beta.2',
      baseChangelog: doc('\n### Adicionado\n\n- Algo.\n'),
      headChangelog: doc('\n### Adicionado\n\n- Algo.\n'),
    });
    expect(errors.join('\n')).toMatch(/\[Unreleased\]/);
  });

  it('rejeita um CHANGELOG sem a seção [Unreleased]', () => {
    const errors = checkReleaseNotes({
      baseVersion: '1.1.0-beta.2',
      headVersion: '1.1.0-beta.2',
      baseChangelog: doc(''),
      headChangelog: `# Changelog\n\n${RELEASED}`,
    });
    expect(errors.join('\n')).toMatch(/\[Unreleased\]/);
  });

  it('aceita o PR de release: versão maior e notas movidas para a seção da versão', () => {
    expect(
      checkReleaseNotes({
        baseVersion: '1.1.0-beta.2',
        headVersion: '1.1.0-beta.3',
        baseChangelog: doc('\n### Corrigido\n\n- Ordem dos módulos.\n'),
        headChangelog: doc(
          '',
          '## [1.1.0-beta.3] - 2026-11-30\n\n### Corrigido\n\n- Ordem dos módulos.\n\n',
        ),
      }),
    ).toEqual([]);
  });

  it('rejeita release sem a seção da nova versão', () => {
    const errors = checkReleaseNotes({
      baseVersion: '1.1.0-beta.2',
      headVersion: '1.1.0-beta.3',
      baseChangelog: doc('\n- Algo.\n'),
      headChangelog: doc('\n- Algo.\n'),
    });
    expect(errors.join('\n')).toMatch(/\[1\.1\.0-beta\.3\]/);
  });

  it('rejeita versão que regride ou fora do formato X.Y.Z[-beta.N]', () => {
    const base = { baseChangelog: doc(''), headChangelog: doc('\n- Algo.\n') };
    expect(
      checkReleaseNotes({ ...base, baseVersion: '1.1.0-beta.2', headVersion: '1.1.0-beta.1' }).join(
        '\n',
      ),
    ).toMatch(/maior que 1\.1\.0-beta\.2/);
    expect(
      checkReleaseNotes({ ...base, baseVersion: '1.1.0-beta.2', headVersion: '1.1' }).join('\n'),
    ).toMatch(/formato/);
  });
});
