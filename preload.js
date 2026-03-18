const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ps4ftp', {
  connect: (opts) => ipcRenderer.invoke('ftp-connect', opts),
  disconnect: () => ipcRenderer.invoke('ftp-disconnect'),
  list: (p) => ipcRenderer.invoke('ftp-list', p),
  navigate: (f) => ipcRenderer.invoke('ftp-navigate', f),
  delete: (f) => ipcRenderer.invoke('ftp-delete', f),
  upload: () => ipcRenderer.invoke('ftp-upload'),
  uploadPaths: (paths) => ipcRenderer.invoke('ftp-upload-paths', paths),
  download: (f) => ipcRenderer.invoke('ftp-download', f),
  rename: (o, n) => ipcRenderer.invoke('ftp-rename', { oldName: o, newName: n }),
  mkdir: (n) => ipcRenderer.invoke('ftp-mkdir', n),
  newFile: (n) => ipcRenderer.invoke('ftp-newfile', n),
  duplicate: (f) => ipcRenderer.invoke('ftp-duplicate', f),
  moveto: (f, d) => ipcRenderer.invoke('ftp-moveto', { filename: f, targetDir: d }),
  getprops: (f) => ipcRenderer.invoke('ftp-getprops', f),
  payloadSend: (opts) => ipcRenderer.invoke('payload-send', opts),
  payloadPickFile: () => ipcRenderer.invoke('payload-pick-file'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window-maximize'),
  closeWindow: () => ipcRenderer.invoke('window-close')
});
