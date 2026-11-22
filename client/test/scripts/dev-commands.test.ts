import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createDevCommands } from '../../scripts/dev-commands.cjs';

const ROOT = path.join(__dirname, '..', '..');

/**
 * No Windows, o Node recusa executar `.cmd` sem shell (EINVAL) e não acha `npm`
 * sem extensão (ENOENT): a verificação do ABI dava sempre falha e a
 * recompilação do better-sqlite3 nem rodava. Os comandos do `npm run dev`
 * apontam para executáveis reais, que rodam sem shell em qualquer plataforma.
 */
describe('createDevCommands', () => {
  const commands = createDevCommands({ root: ROOT, npmCli: process.env.npm_execpath });

  it('executa o Electron como Node sem shell (verificação do ABI)', () => {
    const { command, args } = commands.electron(['-e', 'console.log("ok")']);
    const result = spawnSync(command, args, {
      encoding: 'utf8',
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
    });
    expect(result.error).toBeUndefined();
    expect(result.stdout.trim()).toBe('ok');
  });

  it('executa o npm sem shell', () => {
    const { command, args } = commands.npm(['-v']);
    const result = spawnSync(command, args, { encoding: 'utf8' });
    expect(result.error).toBeUndefined();
    expect(result.stdout.trim()).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('executa o Vite sem shell', () => {
    const { command, args } = commands.vite(['--version']);
    const result = spawnSync(command, args, { encoding: 'utf8', cwd: ROOT });
    expect(result.error).toBeUndefined();
    expect(result.stdout).toMatch(/vite\/\d+/);
  });

  it('exige a entrada pelo npm quando o CLI do npm não é conhecido', () => {
    const withoutNpm = createDevCommands({ root: ROOT, npmCli: '' });
    expect(() => withoutNpm.npm(['-v'])).toThrow(/npm run dev/);
  });
});
