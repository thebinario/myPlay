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
  invoke: (method, params) => ipcRenderer.invoke(RPC_CHANNEL, { method, params }),
  pickDirectory: () => ipcRenderer.invoke(PICK_DIRECTORY_CHANNEL),
  onEvent: (listener) => {
    const handler = (_event, payload) => listener(payload);
    ipcRenderer.on(EVENT_CHANNEL, handler);
    return () => {
      ipcRenderer.removeListener(EVENT_CHANNEL, handler);
    };
  },
});
