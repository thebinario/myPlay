// @ts-check
/**
 * Electron main process: hosts the Midoteca kernel (`@midoteca/core`) and
 * exposes it to the renderer over a single IPC channel. This is the only place
 * where `better-sqlite3` (a native Node module) is loaded; the renderer stays
 * sandboxed and never imports the kernel at runtime.
 */
const path = require('node:path');
const { realpath } = require('node:fs/promises');
const { app, BrowserWindow, dialog, ipcMain, protocol } = require('electron');
const { createMidoteca, createDesktopApi, DESKTOP_EVENTS } = require('@midoteca/core');
const { createLibraryMediaResponse } = require('./library-media-response.cjs');
const { runDesktopSmoke } = require('./desktop-smoke.cjs');

const RPC_CHANNEL = 'midoteca:rpc';
const EVENT_CHANNEL = 'midoteca:event';
const PICK_DIRECTORY_CHANNEL = 'midoteca:pickDirectory';
const MEDIA_SCHEME = 'midoteca-media';

protocol.registerSchemesAsPrivileged([
  {
    scheme: MEDIA_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      stream: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

/** @type {import('electron').BrowserWindow | null} */
let mainWindow = null;
/** @type {ReturnType<typeof createMidoteca> | null} */
let midoteca = null;
/** @type {ReturnType<typeof createDesktopApi> | null} */
let api = null;

function broadcast(event) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(EVENT_CHANNEL, event);
  }
}

function isInsideRoot(filePath, rootPath) {
  const relative = path.relative(rootPath, filePath);
  return (
    relative === '' ||
    (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))
  );
}

async function serveLibraryMedia(request) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response(null, { status: 405 });
  }

  try {
    const requestedPath = path.resolve(decodeURIComponent(new URL(request.url).pathname.slice(1)));
    const [filePath, sources] = await Promise.all([
      realpath(requestedPath),
      midoteca.sources.listSources(),
    ]);
    const roots = await Promise.all(
      sources.map((source) => realpath(source.rootPath).catch(() => null)),
    );
    if (!roots.some((root) => root && isInsideRoot(filePath, root))) {
      return new Response(null, { status: 403 });
    }
    return createLibraryMediaResponse(filePath, request);
  } catch {
    return new Response(null, { status: 404 });
  }
}

function startKernel() {
  midoteca = createMidoteca();
  api = createDesktopApi(midoteca);
  for (const name of DESKTOP_EVENTS) {
    midoteca.events.on(name, (payload) => {
      broadcast({ name, payload: payload ?? null });
    });
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    backgroundColor: '#0D111B',
    title: 'Midoteca',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const devUrl = process.env.MIDOTECA_DEV_URL;
  if (devUrl) {
    void mainWindow.loadURL(devUrl);
  } else {
    void mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  try {
    startKernel();
  } catch (error) {
    const detail =
      error instanceof Error
        ? error.cause instanceof Error
          ? error.cause.message
          : error.message
        : String(error);
    console.error('[main] falha ao iniciar o núcleo:', error);
    dialog.showErrorBox('Falha ao iniciar o núcleo da Midoteca', detail);
    app.exit(1);
    return;
  }
  protocol.handle(MEDIA_SCHEME, serveLibraryMedia);

  if (process.env.MIDOTECA_SMOKE === '1') {
    await runDesktopSmoke(api, midoteca, app);
    return;
  }

  ipcMain.handle(RPC_CHANNEL, async (_event, request) => api.handle(request));

  ipcMain.handle(PICK_DIRECTORY_CHANNEL, async () => {
    const result = await dialog.showOpenDialog(mainWindow ?? undefined, {
      properties: ['openDirectory', 'createDirectory'],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (midoteca) midoteca.close();
});
