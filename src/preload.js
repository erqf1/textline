'use strict';

// Schmale Brücke zwischen Oberfläche und Hauptprozess (keine Node-APIs im Renderer)
const { contextBridge, ipcRenderer, webUtils } = require('electron');

const invoke = (channel, ...args) => ipcRenderer.invoke(channel, ...args);
const on = (channel, cb) => {
  const f = (_e, payload) => cb(payload);
  ipcRenderer.on(channel, f);
  return () => ipcRenderer.removeListener(channel, f);
};

contextBridge.exposeInMainWorld('api', {
  info: () => invoke('app:info'),
  getSettings: () => invoke('settings:get'),
  setSettings: (s) => invoke('settings:set', s),
  getSession: () => invoke('session:get'),
  setSession: (s) => invoke('session:set', s),
  initialFiles: () => invoke('app:initial-files'),
  onOpenFiles: (cb) => on('app:open-files', cb),
  onClosing: (cb) => on('app:closing', cb),
  onSystemTheme: (cb) => on('app:system-theme', cb),
  closeNow: () => invoke('app:close-now'),
  updateReady: () => ipcRenderer.send('app:update-ready'),
  setTitle: (title) => invoke('app:set-title', title),
  setGlass: (opts) => invoke('win:glass', opts),

  openDialog: (opts) => invoke('file:open-dialog', opts),
  saveDialog: (opts) => invoke('file:save-dialog', opts),
  readFile: (file, encoding) => invoke('file:read', file, encoding),
  writeFile: (file, text, opts) => invoke('file:write', file, text, opts),
  exists: (file) => invoke('file:exists', file),
  tempFile: (name, text) => invoke('file:temp', name, text),
  watch: (list) => invoke('file:watch', list),
  onFileChanged: (cb) => on('file:changed', cb),
  pathForFile: (file) => webUtils.getPathForFile(file),

  openExternal: (url) => invoke('shell:open-external', url),
  openPath: (p) => invoke('shell:open-path', p),
  reveal: (p) => invoke('shell:reveal', p),
  printHtml: (html) => invoke('print:html', html),

  py: {
    resolve: (force) => invoke('py:resolve', force),
    ensureEnv: () => invoke('py:ensure-env'),
    run: (interp, file, cwd) => invoke('py:run', interp, file, cwd),
    shell: (interp, cwd) => invoke('py:shell', interp, cwd),
    write: (id, text) => invoke('py:write', id, text),
    stop: (id) => invoke('py:stop', id),
    pipList: (interp) => invoke('py:pip-list', interp),
    pip: (interp, args) => invoke('py:pip', interp, args),
    check: (interp, code) => invoke('py:check', interp, code),
    pypi: (name) => invoke('py:pypi', name),
    onEvent: (cb) => on('py:event', cb),
  },
});
