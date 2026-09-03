const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('dinoAPI', {
  setIgnoreMouse: (ignore) => ipcRenderer.invoke('set-ignore-mouse', ignore),
  getScreenBounds: () => ipcRenderer.invoke('get-screen-bounds'),
  onSaveMemory: (data) => ipcRenderer.invoke('save-memory', data),
  getBgVideoPath: () => ipcRenderer.invoke('get-bg-video-path'),
  onCpuUsage: (callback) => {
    ipcRenderer.on('cpu-usage', (event, usage) => callback(usage));
  },
  onOptChanged: (callback) => {
    ipcRenderer.on('opt-changed', (event, opt) => callback(opt));
  },
});
