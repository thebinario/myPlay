// @ts-check
/**
 * Preload script: the security boundary between the sandboxed renderer and the
 * kernel. It exposes only the minimal bridge surface on `window.midoteca`; no
 * Node API, no `ipcRenderer`, no kernel types leak into the renderer.
 */
const { contextBridge, ipcRenderer } = require('electron');

const RPC_CHANNEL = 'midoteca:rpc';
const EVENT_CHANNEL = 'midoteca:event';
const PICK_DIRECTORY_CHANNEL = 'midoteca:pickDirectory';

contextBridge.exposeInMainWorld('midoteca', {
  // The main process answers with the transport envelope `{ ok, data }` /
  // `{ ok: false, error }`; the bridge contract exposes the payload directly and
  // surfaces failures as thrown errors. The unwrap stays inline because the
  // preload runs sandboxed and cannot `require` local files.
  invoke: async (method, params) => {
    const response = await ipcRenderer.invoke(RPC_CHANNEL, { method, params });
    if (!response || response.ok !== true) {
      throw new Error(response?.error?.message ?? 'Falha na comunicação com o núcleo.');
    }
    return response.data;
  },
  pickDirectory: () => ipcRenderer.invoke(PICK_DIRECTORY_CHANNEL),
  onEvent: (listener) => {
    const handler = (_event, payload) => listener(payload);
    ipcRenderer.on(EVENT_CHANNEL, handler);
    return () => {
      ipcRenderer.removeListener(EVENT_CHANNEL, handler);
    };
  },
});
