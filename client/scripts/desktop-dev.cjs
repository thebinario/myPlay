// @ts-check
/**
 * Desktop dev orchestrator: starts the Vite dev server (HMR) and launches the
 * Electron shell against it, so edits to the renderer hot-reload in the desktop
 * window instead of requiring a full `desktop:prod` rebuild.
 *
 * - Renderer changes (src/**) → Vite HMR (no restart).
 * - Main/preload changes (electron/**) → Electron restarts automatically.
 *
 * No extra dependencies: it polls the dev server and forwards signals.
 */
const path = require('node:path');
const http = require('node:http');
const fs = require('node:fs');
const { spawn, spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const CORE_DIR = path.join(ROOT, '..', 'midoteca');
const BIN = path.join(ROOT, 'node_modules', '.bin');
const PORT = Number(process.env.MIDOTECA_DEV_PORT ?? 3333);
const DEV_URL = process.env.MIDOTECA_DEV_URL ?? `http://localhost:${PORT}`;

/** @type {import('node:child_process').ChildProcess | null} */
let vite = null;
/** @type {import('node:child_process').ChildProcess | null} */
let electron = null;
let shuttingDown = false;
let restarting = false;
let rebuiltForElectron = false;

function bin(name) {
  return path.join(BIN, process.platform === 'win32' ? `${name}.cmd` : name);
}

/** True when `better-sqlite3` is compiled for the Electron ABI the shell uses. */
function electronNativeReady() {
  const probe = spawnSync(
    bin('electron'),
    [
      '-e',
      "try{new (require('better-sqlite3'))(':memory:').close();console.log('ABI_OK')}catch{console.log('ABI_FAIL')}",
    ],
    { cwd: CORE_DIR, env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, encoding: 'utf8' },
  );
  return (probe.stdout ?? '').includes('ABI_OK');
}

/**
 * The kernel loads `better-sqlite3`, a native module. Node (`npm test`) and
 * Electron use different ABIs, so the shell needs the Electron build. We only
 * recompile when the current binding does not match, and restore the Node build
 * on exit so the test suite keeps working.
 */
function ensureNativeModule() {
  if (process.env.MIDOTECA_SKIP_REBUILD === '1' || electronNativeReady()) return;
  console.log('[dev] better-sqlite3 não está no ABI do Electron — recompilando…');
  const result = spawnSync('npm', ['run', 'desktop:rebuild'], { cwd: ROOT, stdio: 'inherit' });
  rebuiltForElectron = result.status === 0 && electronNativeReady();
  if (!rebuiltForElectron) {
    console.error('[dev] falha ao recompilar o better-sqlite3 para o Electron.');
    process.exit(1);
  }
}

function restoreNodeAbi() {
  if (!rebuiltForElectron || process.env.MIDOTECA_KEEP_ELECTRON_ABI === '1') return;
  console.log('[dev] restaurando o ABI do Node (better-sqlite3) para os testes…');
  spawnSync('npm', ['run', 'desktop:rebuild:node'], { cwd: ROOT, stdio: 'inherit' });
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of [electron, vite]) {
    if (child && !child.killed) child.kill();
  }
  restoreNodeAbi();
  process.exit(code);
}

function startVite() {
  vite = spawn(bin('vite'), [], { cwd: ROOT, stdio: 'inherit', env: process.env });
  vite.on('exit', (code) => {
    if (!shuttingDown && !restarting) shutdown(code ?? 0);
  });
}

function waitForServer(timeoutMs = 60_000) {
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const request = http.get(DEV_URL, (response) => {
        response.resume();
        resolve();
      });
      request.on('error', () => {
        if (Date.now() - startedAt > timeoutMs) {
          reject(new Error(`dev server não respondeu em ${DEV_URL}`));
        } else {
          setTimeout(attempt, 250);
        }
      });
    };
    attempt();
  });
}

function startElectron() {
  electron = spawn(bin('electron'), ['electron/main.cjs'], {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, MIDOTECA_DEV_URL: DEV_URL },
  });
  electron.on('exit', (code) => {
    if (shuttingDown) return;
    if (restarting) {
      restarting = false;
      startElectron();
      return;
    }
    shutdown(code ?? 0);
  });
}

function restartElectron() {
  if (!electron || shuttingDown) return;
  restarting = true;
  electron.kill();
}

/** Restarts Electron when the main process or preload changes. */
function watchMainProcess() {
  const dir = path.join(ROOT, 'electron');
  if (!fs.existsSync(dir)) return;
  let timer = null;
  try {
    fs.watch(dir, { recursive: true }, () => {
      clearTimeout(timer);
      timer = setTimeout(restartElectron, 150);
    });
  } catch {
    console.warn('[dev] watch do processo principal indisponível nesta plataforma');
  }
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

(async () => {
  ensureNativeModule();
  console.log(`[dev] Vite em ${DEV_URL} (HMR) · Electron apontando para o dev server`);
  startVite();
  try {
    await waitForServer();
  } catch (error) {
    console.error(`[dev] ${error instanceof Error ? error.message : String(error)}`);
    shutdown(1);
    return;
  }
  startElectron();
  watchMainProcess();
})();
