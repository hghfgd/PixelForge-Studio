const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('pf', {
  saveProject: data => ipcRenderer.invoke('save-project', data),
  openProject: () => ipcRenderer.invoke('open-project'),
  exportFile: payload => ipcRenderer.invoke('export-file', payload)
});
