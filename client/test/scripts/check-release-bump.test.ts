import { describe, expect, it } from 'vitest';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { checkReleaseBump, compareVersions } = require('../../scripts/check-release-bump.cjs');

const changelog = (version: string) =>
  `# Changelog\n\n## [${version}] - 2026-11-21\n\n- Algo novo.\n`;

describe('scripts — check-release-bump', () => {
  it('ordena versões SemVer com pré-release beta', () => {
    expect(compareVersions('1.1.0-beta.1', '1.0.0')).toBeGreaterThan(0);
    expect(compareVersions('1.1.0', '1.1.0-beta.9')).toBeGreaterThan(0);
    expect(compareVersions('1.1.0-beta.10', '1.1.0-beta.9')).toBeGreaterThan(0);
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
  });

  it('aceita um PR que sobe a versão e registra a entrada no CHANGELOG', () => {
    expect(
      checkReleaseBump({
        baseVersion: '1.0.0',
        headVersion: '1.1.0-beta.1',
        changelog: changelog('1.1.0-beta.1'),
      }),
    ).toEqual([]);
  });

  it('rejeita um PR que não sobe a versão', () => {
    const errors = checkReleaseBump({
      baseVersion: '1.1.0-beta.1',
      headVersion: '1.1.0-beta.1',
      changelog: changelog('1.1.0-beta.1'),
    });
    expect(errors.join('\n')).toMatch(/maior que 1\.1\.0-beta\.1/);
  });

  it('rejeita um PR sem a entrada da nova versão no CHANGELOG', () => {
    const errors = checkReleaseBump({
      baseVersion: '1.0.0',
      headVersion: '1.1.0-beta.1',
      changelog: changelog('1.0.0'),
    });
    expect(errors.join('\n')).toMatch(/CHANGELOG\.md.*\[1\.1\.0-beta\.1\]/);
  });

  it('rejeita versões fora do formato X.Y.Z ou X.Y.Z-beta.N', () => {
    const errors = checkReleaseBump({
      baseVersion: '1.0.0',
      headVersion: '1.1',
      changelog: changelog('1.1'),
    });
    expect(errors.join('\n')).toMatch(/formato/);
  });
});
