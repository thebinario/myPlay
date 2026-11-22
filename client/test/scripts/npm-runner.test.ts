import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createNpmRunner } from '../../scripts/npm-runner.cjs';

const directories: string[] = [];

function temporaryDirectory() {
  const directory = mkdtempSync(path.join(tmpdir(), 'midoteca-npm-runner-'));
  directories.push(directory);
  return directory;
}

afterEach(() => {
  while (directories.length > 0) {
    rmSync(directories.pop() as string, { recursive: true, force: true });
  }
});

describe('createNpmRunner', () => {
  it('captura saída maior que o buffer padrão do child_process', () => {
    const cwd = temporaryDirectory();
    const cli = path.join(cwd, 'npm-cli.cjs');
    const bytes = 4 * 1024 * 1024;
    writeFileSync(cli, `process.stdout.write('x'.repeat(${bytes}));\n`);
    const runNpm = createNpmRunner({ npmCli: cli });

    const output = runNpm([], cwd, true);

    expect(output).toHaveLength(bytes);
  });

  it('falha quando o CLI do npm não está disponível', () => {
    const runNpm = createNpmRunner({ npmCli: '' });

    expect(() => runNpm([], process.cwd(), true)).toThrow(/npm run desktop:release/);
  });
});
