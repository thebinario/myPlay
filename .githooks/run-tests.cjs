#!/usr/bin/env node
// Roda, no pre-commit, os testes relacionados aos arquivos preparados (staged)
// de client/ e midoteca/ (`vitest related`). Ver docs/CONVENTIONS.md §2.
//
// - midoteca/: todos os testes afetados.
// - client/: projetos `unit` e `integration` (o `storybook` precisa de
//   navegador e roda na CI).
// - O better-sqlite3 pode estar compilado para o Node (testes) ou para o
//   Electron (app em desenvolvimento). O hook usa o runtime que consegue
//   carregá-lo: Node, ou o próprio Electron como Node (ELECTRON_RUN_AS_NODE).
// - MIDOTECA_HOOK_TESTS=all roda a suíte inteira dos pacotes tocados.

const { execFileSync, spawnSync } = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const CODE = /\.(ts|tsx|js|jsx|cjs|mjs)$/;

const PROJECTS = [
  { name: 'midoteca', dirs: ['src/', 'test/'], args: [] },
  {
    name: 'client',
    dirs: ['src/', 'test/', 'electron/', 'scripts/'],
    args: ['--project', 'unit', '--project', 'integration'],
  },
];

function stagedFiles() {
  const out = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z'], {
    cwd: root,
    encoding: 'utf8',
  });
  return out.split('\0').filter(Boolean);
}

function canLoadSqlite(command, env) {
  const probe = spawnSync(
    command,
    ['-e', "require('better-sqlite3')(':memory:').close()"],
    { cwd: path.join(root, 'midoteca'), env, stdio: 'ignore', windowsHide: true },
  );
  return probe.status === 0;
}

/** Node when the native module matches it, else Electron running as Node. */
function resolveRuntime() {
  if (canLoadSqlite(process.execPath, process.env)) {
    return { command: process.execPath, env: process.env, label: 'Node' };
  }
  let electron = null;
  try {
    electron = require(require.resolve('electron', { paths: [path.join(root, 'client')] }));
  } catch {
    // Electron não instalado
  }
  const env = { ...process.env, ELECTRON_RUN_AS_NODE: '1' };
  if (typeof electron === 'string' && canLoadSqlite(electron, env)) {
    return { command: electron, env, label: 'Electron (como Node)' };
  }
  return null;
}

function main() {
  const all = process.env.MIDOTECA_HOOK_TESTS === 'all';
  const staged = stagedFiles();
  const work = PROJECTS.map((project) => ({
    ...project,
    files: staged
      .filter((file) => file.startsWith(`${project.name}/`))
      .map((file) => file.slice(project.name.length + 1))
      .filter((file) => CODE.test(file) && project.dirs.some((dir) => file.startsWith(dir))),
  })).filter((project) => project.files.length > 0);
  if (work.length === 0) return 0;

  const runtime = resolveRuntime();
  if (!runtime) {
    console.error(
      'pre-commit: o better-sqlite3 não carrega nem no Node nem no Electron.\n' +
        '  Rode `npm --prefix client run desktop:rebuild:node` (com o app fechado) e tente de novo.',
    );
    return 1;
  }

  for (const project of work) {
    const cwd = path.join(root, project.name);
    const vitest = path.join(cwd, 'node_modules', 'vitest', 'vitest.mjs');
    const args = all
      ? [vitest, 'run', ...project.args]
      : [vitest, 'related', '--run', '--passWithNoTests', ...project.args, ...project.files];
    console.log(
      `pre-commit: testes ${all ? 'de' : 'relacionados em'} ${project.name}/ (${runtime.label})`,
    );
    const result = spawnSync(runtime.command, args, {
      cwd,
      env: runtime.env,
      stdio: 'inherit',
      windowsHide: true,
    });
    if (result.status !== 0) {
      console.error(
        `pre-commit: testes de ${project.name}/ falharam; o commit foi interrompido.`,
      );
      return result.status ?? 1;
    }
  }
  return 0;
}

process.exit(main());
