const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const clientRoot = path.resolve(__dirname, '..');
const projectRoot = path.resolve(clientRoot, '..');
const electronBin = path.join(clientRoot, 'node_modules', '.bin', 'electron');
const devUrl = 'http://127.0.0.1:3333';
const children = new Set();
let electronProcess;
let restartTimer;
let restartingElectron = false;
let stopping = false;

function run(command, args, cwd = clientRoot) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: 'inherit', shell: false });
    children.add(child);
    child.once('error', reject);
    child.once('exit', (code) => {
      children.delete(child);
      if (code === 0) resolve();
      else reject(new Error(`${command} terminou com código ${code ?? 'desconhecido'}`));
    });
  });
}

async function waitForVite() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const response = await fetch(devUrl);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('Vite não iniciou em http://127.0.0.1:3333');
}

function startElectron() {
  electronProcess = spawn(electronBin, ['electron/main.cjs'], {
    cwd: clientRoot,
    stdio: 'inherit',
    env: { ...process.env, MIDOTECA_DEV_URL: devUrl },
  });
  children.add(electronProcess);
  electronProcess.once('exit', (code) => {
    children.delete(electronProcess);
    if (restartingElectron) {
      restartingElectron = false;
      return;
    }
    if (!stopping) stop(code ?? 0);
  });
}

function restartElectron() {
  if (restartingElectron) return;
  clearTimeout(restartTimer);
  restartTimer = setTimeout(() => {
    if (stopping) return;
    const previous = electronProcess;
    if (!previous || previous.exitCode !== null) return startElectron();
    restartingElectron = true;
    previous.once('exit', startElectron);
    previous.kill();
  }, 250);
}

function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  clearTimeout(restartTimer);
  for (const child of children) child.kill('SIGTERM');
  setTimeout(() => process.exit(exitCode), 300);
}

async function main() {
  await run('npm', ['run', 'desktop:core']);
  await run('npm', ['run', 'desktop:rebuild']);
  const coreWatcher = spawn('npx', ['tsc', '-p', 'tsconfig.build.json', '--watch', '--preserveWatchOutput'], {
    cwd: path.join(projectRoot, 'midoteca'),
    stdio: 'inherit',
  });
  children.add(coreWatcher);
  const vite = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--mode', 'stg'], {
    cwd: clientRoot,
    stdio: 'inherit',
  });
  children.add(vite);
  await waitForVite();
  startElectron();
  fs.watch(path.join(projectRoot, 'midoteca', 'dist'), restartElectron);
  fs.watch(path.join(clientRoot, 'electron'), { recursive: true }, restartElectron);
  console.log('Midoteca STG ativa. Renderer com HMR; núcleo e Electron reiniciam ao mudar.');
}

process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
main().catch((error) => {
  console.error(error);
  stop(1);
});
