const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const ftp = require('basic-ftp');
const fs = require('fs-extra');
const net = require('net');

let mainWindow;
let ftpClient = null;
let currentPath = '/';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1060,
    minHeight: 700,
    backgroundColor: '#050508',
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    icon: path.join(__dirname, 'renderer', 'icon.ico')
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (ftpClient) ftpClient.close();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

function listToEntries(list) {
  return list.map(item => ({
    name: item.name,
    type: item.type === 2 ? 'directory' : 'file',
    size: item.size,
    date: item.modifiedAt ? item.modifiedAt.toISOString() : null
  }));
}

ipcMain.handle('ftp-connect', async (_, { host, user, password, port }) => {
  try {
    if (ftpClient) { ftpClient.close(); ftpClient = null; }
    ftpClient = new ftp.Client();
    ftpClient.ftp.verbose = false;
    await ftpClient.access({ host, port: port || 21, user, password, secure: false });
    currentPath = '/';
    return { success: true };
  } catch (err) {
    ftpClient = null;
    return { success: false, error: err.message };
  }
});

ipcMain.handle('ftp-disconnect', async () => {
  if (ftpClient) { ftpClient.close(); ftpClient = null; }
  currentPath = '/';
  return { success: true };
});

ipcMain.handle('ftp-list', async (_, targetPath) => {
  if (!ftpClient) return { success: false, error: 'Not connected' };
  try {
    await ftpClient.cd(targetPath || currentPath);
    currentPath = await ftpClient.pwd();
    const list = await ftpClient.list();
    return { success: true, entries: listToEntries(list), currentPath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('ftp-navigate', async (_, folderName) => {
  if (!ftpClient) return { success: false, error: 'Not connected' };
  try {
    if (folderName === '..') await ftpClient.cdup();
    else await ftpClient.cd(folderName);
    currentPath = await ftpClient.pwd();
    const list = await ftpClient.list();
    return { success: true, entries: listToEntries(list), currentPath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('ftp-delete', async (_, filename) => {
  if (!ftpClient) return { success: false, error: 'Not connected' };
  try {
    const list = await ftpClient.list();
    const target = list.find(f => f.name === filename);
    if (!target) return { success: false, error: 'File not found' };
    if (target.type === 2) await ftpClient.removeDir(filename);
    else await ftpClient.remove(filename);
    const updated = await ftpClient.list();
    return { success: true, entries: listToEntries(updated), currentPath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('ftp-upload', async () => {
  if (!ftpClient) return { success: false, error: 'Not connected' };
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    title: 'Select files to upload to PS4'
  });
  if (result.canceled || !result.filePaths.length) return { success: false, error: 'Cancelled' };
  try {
    for (const filePath of result.filePaths) {
      await ftpClient.uploadFrom(filePath, path.basename(filePath));
    }
    const list = await ftpClient.list();
    return { success: true, entries: listToEntries(list), currentPath, uploaded: result.filePaths.length };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('ftp-upload-paths', async (_, filePaths) => {
  if (!ftpClient) return { success: false, error: 'Not connected' };
  if (!filePaths?.length) return { success: false, error: 'No files' };
  try {
    for (const filePath of filePaths) {
      await ftpClient.uploadFrom(filePath, path.basename(filePath));
    }
    const list = await ftpClient.list();
    return { success: true, entries: listToEntries(list), currentPath, uploaded: filePaths.length };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('ftp-download', async (_, filename) => {
  if (!ftpClient) return { success: false, error: 'Not connected' };
  const result = await dialog.showSaveDialog(mainWindow, { defaultPath: filename, title: 'Save file from PS4' });
  if (result.canceled || !result.filePath) return { success: false, error: 'Cancelled' };
  try {
    await fs.ensureDir(path.dirname(result.filePath));
    await ftpClient.downloadTo(result.filePath, filename);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('ftp-rename', async (_, { oldName, newName }) => {
  if (!ftpClient) return { success: false, error: 'Not connected' };
  try {
    await ftpClient.rename(oldName, newName);
    const list = await ftpClient.list();
    return { success: true, entries: listToEntries(list), currentPath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('ftp-mkdir', async (_, folderName) => {
  if (!ftpClient) return { success: false, error: 'Not connected' };
  try {
    await ftpClient.ensureDir(folderName);
    await ftpClient.cd(currentPath);
    const list = await ftpClient.list();
    return { success: true, entries: listToEntries(list), currentPath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('ftp-duplicate', async (_, filename) => {
  if (!ftpClient) return { success: false, error: 'Not connected' };
  try {
    const os = require('os');
    const tmpFile = path.join(os.tmpdir(), filename);
    await ftpClient.downloadTo(tmpFile, filename);
    const ext = path.extname(filename);
    const base = path.basename(filename, ext);
    let copyName = `${base}_copy${ext}`;
    const list = await ftpClient.list();
    const names = list.map(f => f.name);
    let i = 2;
    while (names.includes(copyName)) { copyName = `${base}_copy${i}${ext}`; i++; }
    await ftpClient.uploadFrom(tmpFile, copyName);
    await fs.remove(tmpFile);
    const updated = await ftpClient.list();
    return { success: true, entries: listToEntries(updated), currentPath, copyName };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('ftp-moveto', async (_, { filename, targetDir }) => {
  if (!ftpClient) return { success: false, error: 'Not connected' };
  try {
    const dest = targetDir.endsWith('/') ? `${targetDir}${filename}` : `${targetDir}/${filename}`;
    await ftpClient.rename(filename, dest);
    const list = await ftpClient.list();
    return { success: true, entries: listToEntries(list), currentPath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('ftp-getprops', async (_, filename) => {
  if (!ftpClient) return { success: false, error: 'Not connected' };
  try {
    const list = await ftpClient.list();
    const item = list.find(f => f.name === filename);
    if (!item) return { success: false, error: 'File not found' };
    return {
      success: true,
      props: {
        name: item.name,
        type: item.type === 2 ? 'Directory' : 'File',
        size: item.size,
        date: item.modifiedAt ? item.modifiedAt.toISOString() : null,
        permissions: item.permissions || '—',
        path: `${currentPath === '/' ? '' : currentPath}/${item.name}`
      }
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('payload-send', async (_, { host, port, filePath }) => {
  return new Promise((resolve) => {
    if (!filePath) { resolve({ success: false, error: 'No file selected' }); return; }
    fs.readFile(filePath, (err, data) => {
      if (err) { resolve({ success: false, error: err.message }); return; }
      const sock = new net.Socket();
      const timeout = setTimeout(() => {
        sock.destroy();
        resolve({ success: false, error: 'Connection timed out' });
      }, 8000);
      sock.connect(parseInt(port), host, () => {
        sock.write(data, () => {
          clearTimeout(timeout);
          sock.destroy();
          resolve({ success: true, size: data.length });
        });
      });
      sock.on('error', (e) => {
        clearTimeout(timeout);
        resolve({ success: false, error: e.message });
      });
    });
  });
});

ipcMain.handle('payload-pick-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Payload (.bin)',
    filters: [{ name: 'Payload', extensions: ['bin', 'self', 'elf', 'pkg'] }, { name: 'All Files', extensions: ['*'] }],
    properties: ['openFile']
  });
  if (result.canceled || !result.filePaths.length) return { success: false };
  return { success: true, filePath: result.filePaths[0], name: path.basename(result.filePaths[0]) };
});

ipcMain.handle('open-external', (_, url) => shell.openExternal(url));
ipcMain.handle('window-minimize', () => mainWindow.minimize());
ipcMain.handle('window-maximize', () => mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize());
ipcMain.handle('window-close', () => mainWindow.close());

ipcMain.handle('ftp-newfile', async (_, filename) => {
  if (!ftpClient) return { success: false, error: 'Not connected' };
  try {
    const os = require('os');
    const tmp = path.join(os.tmpdir(), filename);
    await fs.writeFile(tmp, '');
    await ftpClient.uploadFrom(tmp, filename);
    await fs.remove(tmp);
    const list = await ftpClient.list();
    const entries = list.map(item => ({
      name: item.name,
      type: item.type === 2 ? 'directory' : 'file',
      size: item.size,
      date: item.modifiedAt ? item.modifiedAt.toISOString() : null
    }));
    return { success: true, entries, currentPath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
