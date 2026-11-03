const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1480, height: 940, minWidth: 1050, minHeight: 700,
    backgroundColor: '#101319',
    title: 'PixelForge Studio',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.loadFile(path.join(__dirname, 'index.html'));
}
app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

ipcMain.handle('save-project', async (_event, payload) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Save PixelForge project',
    defaultPath: 'untitled.pfs',
    filters: [{ name: 'PixelForge Project', extensions: ['pfs', 'json'] }]
  });
  if (canceled || !filePath) return { canceled: true };
  fs.writeFileSync(filePath, JSON.stringify(payload));
  return { canceled: false, filePath };
});
ipcMain.handle('open-project', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'PixelForge Project', extensions: ['pfs', 'json'] }]
  });
  if (canceled || !filePaths[0]) return { canceled: true };
  return { canceled: false, data: JSON.parse(fs.readFileSync(filePaths[0], 'utf8')), filePath: filePaths[0] };
});
ipcMain.handle('export-file', async (_event, { name, data, filters }) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    defaultPath: name,
    filters: filters || [{ name: 'PNG Image', extensions: ['png'] }]
  });
  if (canceled || !filePath) return { canceled: true };
  fs.writeFileSync(filePath, Buffer.from(data));
  return { canceled: false, filePath };
});
