import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { prepareDesktopRelease } from '../../scripts/prepare-desktop-release.cjs';

const roots: string[] = [];

interface Call {
  args: string[];
  cwd: string;
  capture: boolean;
}

function writeJson(file: string, data: unknown) {
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

function createFixture() {
  const root = mkdtempSync(path.join(tmpdir(), 'midoteca-prepare-'));
  roots.push(root);
  const clientRoot = path.join(root, 'client');
  const coreRoot = path.join(root, 'midoteca');
  mkdirSync(path.join(clientRoot, 'electron'), { recursive: true });
  mkdirSync(path.join(clientRoot, 'dist'), { recursive: true });
  mkdirSync(path.join(coreRoot, 'dist'), { recursive: true });
  writeFileSync(path.join(clientRoot, 'electron', 'main.cjs'), '');
  writeFileSync(path.join(clientRoot, 'dist', 'index.html'), '<html></html>');
  writeFileSync(path.join(coreRoot, 'dist', 'index.js'), '');
  writeFileSync(path.join(clientRoot, 'package-lock.json'), '{}\n');
  writeFileSync(path.join(coreRoot, 'package-lock.json'), '{}\n');
  writeJson(path.join(coreRoot, 'package.json'), {
    name: '@midoteca/core',
    version: '0.1.0',
    dependencies: { 'better-sqlite3': '^12.0.0' },
    devDependencies: { typescript: '^5.0.0' },
    scripts: { build: 'tsc' },
  });
  writeJson(path.join(clientRoot, 'package.json'), {
    name: 'midoteca-desktop',
    version: '1.0.0',
    main: 'electron/main.cjs',
    dependencies: { '@midoteca/core': 'file:../midoteca', react: '^19.0.0' },
    devDependencies: { vite: '^6.0.0' },
    scripts: { build: 'vite build' },
  });
  return { clientRoot, coreRoot };
}

function fakeNpm() {
  const calls: Call[] = [];
  const runNpm = (args: string[], cwd: string, capture = false) => {
    calls.push({ args, cwd, capture });
    if (args[0] === 'pack') {
      return JSON.stringify([{ filename: 'midoteca-core-0.1.0.tgz', bundled: ['better-sqlite3'] }]);
    }
    if (args[0] === 'install' || args[0] === 'ci') {
      const installed = path.join(cwd, 'node_modules', '@midoteca', 'core');
      mkdirSync(installed, { recursive: true });
      writeJson(path.join(installed, 'package.json'), { name: '@midoteca/core' });
    }
    return null;
  };
  return { calls, runNpm };
}

afterEach(() => {
  while (roots.length > 0) {
    rmSync(roots.pop() as string, { recursive: true, force: true });
  }
});

describe('prepareDesktopRelease', () => {
  it('monta o pacote do núcleo com as dependências empacotadas', () => {
    const { clientRoot } = createFixture();
    const { runNpm } = fakeNpm();

    prepareDesktopRelease({ clientRoot, version: '0.0.0-beta.1', channel: 'beta', runNpm });

    const core = JSON.parse(
      readFileSync(path.join(clientRoot, 'release', 'core', 'package.json'), 'utf8'),
    );
    expect(core.bundleDependencies).toEqual(['better-sqlite3']);
    expect(core.devDependencies).toBeUndefined();
    expect(core.scripts).toBeUndefined();
  });

  it('instala o app sem exigir um lock já sincronizado com o tarball', () => {
    const { clientRoot } = createFixture();
    const { calls, runNpm } = fakeNpm();
    const appStage = path.join(clientRoot, 'release', 'app');

    prepareDesktopRelease({ clientRoot, version: '0.0.0-beta.1', channel: 'beta', runNpm });

    const appCalls = calls.filter((call) => call.cwd === appStage);
    expect(appCalls.map((call) => call.args[0])).toEqual(['install']);
    expect(appCalls[0].args).toEqual(expect.arrayContaining(['--omit=dev', '--ignore-scripts']));

    const app = JSON.parse(readFileSync(path.join(appStage, 'package.json'), 'utf8'));
    expect(app.version).toBe('0.0.0-beta.1');
    expect(app.dependencies['@midoteca/core']).toBe('file:midoteca-core-0.1.0.tgz');
    expect(app.devDependencies).toBeUndefined();
    expect(app.scripts).toBeUndefined();
    expect(existsSync(path.join(appStage, 'node_modules', '@midoteca', 'core'))).toBe(true);
  });

  it('instala as dependências de produção do núcleo a partir do lockfile', () => {
    const { clientRoot } = createFixture();
    const { calls, runNpm } = fakeNpm();

    prepareDesktopRelease({ clientRoot, version: '0.0.0-beta.1', channel: 'beta', runNpm });

    const coreStage = path.join(clientRoot, 'release', 'core');
    const coreCalls = calls.filter((call) => call.cwd === coreStage);
    expect(coreCalls.map((call) => call.args[0])).toEqual(['ci', 'pack']);
    expect(coreCalls[0].args).toEqual(
      expect.arrayContaining(['ci', '--omit=dev', '--ignore-scripts']),
    );
  });
});
