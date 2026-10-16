// @ts-check
/**
 * Electron main process: hosts the Midoteca kernel (`@midoteca/core`) and
 * exposes it to the renderer over a single IPC channel. This is the only place
 * where `better-sqlite3` (a native Node module) is loaded; the renderer stays
 * sandboxed and never imports the kernel at runtime.
 */
const path = require('node:path');
const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const { createMidoteca, createDesktopApi, DESKTOP_EVENTS } = require('@midoteca/core');

const RPC_CHANNEL = 'midoteca:rpc';
const EVENT_CHANNEL = 'midoteca:event';
const PICK_DIRECTORY_CHANNEL = 'midoteca:pickDirectory';

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
  startKernel();

  // Smoke mode: boots the kernel inside Electron (real native SQLite), runs a
  // round-trip RPC and exits. Used by CI/verification without opening a window.
  if (process.env.MIDOTECA_SMOKE === '1') {
    const response = await api.handle({ method: 'system.info' });
    console.log(`MIDOTECA_SMOKE ${JSON.stringify(response)}`);
    app.quit();
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
