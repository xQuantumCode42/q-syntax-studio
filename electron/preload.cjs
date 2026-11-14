const { contextBridge, ipcRenderer } = require('electron');
const invoke = name => (...args) => ipcRenderer.invoke(name, ...args);
contextBridge.exposeInMainWorld('studio', {
  ...Object.fromEntries(['runtimes', 'run', 'check', 'load', 'save', 'openExternal', 'authStatus', 'login', 'logout', 'review'].map(name => [name, invoke(name)])),
  onClosing(callback) {
    const listener = async () => { try { await callback(); await ipcRenderer.invoke('closeReady'); } catch { await ipcRenderer.invoke('closeReady'); } };
    ipcRenderer.on('before-close', listener);
    return () => ipcRenderer.removeListener('before-close', listener);
  },
});
