'use strict';

// Textline - Hauptprozess: Fenster, Dateien lesen/schreiben, Sitzung, Python, Drucken und Updates.
// Die ganze Oberfläche (Tabs, Menüs, Dialoge, Editor) lebt im Renderer.
const { app, BrowserWindow, ipcMain, dialog, shell, Menu, nativeTheme, net } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');
const files = require('./files');
const fileIcons = require('./fileicons');
const { Python } = require('./python');
const { t: tr } = require('./shared/i18n');

const APP_ID = 'win.mert.Textline';
const REPO = 'erqf1/textline';
// --selftest <ordner>: Selbsttest; --siteshots <ordner>: Bilder für die Website (beides unsichtbar)
const testArg = ['--selftest', '--siteshots'].find((a) => process.argv.includes(a));
const selfTest = testArg ? process.argv[process.argv.indexOf(testArg) + 1] : null;

if (process.platform === 'win32') app.setAppUserModelId(APP_ID);
if (selfTest) app.setPath('userData', path.join(selfTest, 'userdata'));

let win = null;
let settings = {};
let closingAllowed = false;
const pendingFiles = [];

const userFile = (name) => path.join(app.getPath('userData'), name);
const t = (key, vars) => tr(settings.language || 'en', key, vars);

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}
function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data));
  fs.renameSync(tmp, file);
}

/** Dateien aus der Befehlszeile ("Öffnen mit", Doppelklick) */
function filesFromArgs(argv, cwd) {
  const out = [];
  const args = argv.slice(app.isPackaged ? 1 : 2);
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--selftest' || a === '--siteshots') {
      i++;
      continue;
    }
    if (!a || a.startsWith('-')) continue;
    const p = path.resolve(cwd || process.cwd(), a);
    try {
      if (fs.statSync(p).isFile()) out.push(p);
    } catch {
      // gibt es nicht (z. B. Chromium-Schalter) - ignorieren
    }
  }
  return out;
}

if (!selfTest && !app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', (_e, argv, cwd) => {
    const list = filesFromArgs(argv, cwd);
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
      if (list.length) win.webContents.send('app:open-files', list);
    }
  });
}

// macOS: Dateien per Finder/Dock
app.on('open-file', (e, file) => {
  e.preventDefault();
  if (win && win.webContents && !win.webContents.isLoading()) win.webContents.send('app:open-files', [file]);
  else pendingFiles.push(file);
});

const python = new Python(app.getPath('userData'), (channel, payload) => {
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
});

function createWindow() {
  const state = settings.window || {};
  win = new BrowserWindow({
    width: state.width || 1180,
    height: state.height || 780,
    x: state.x,
    y: state.y,
    minWidth: 520,
    minHeight: 360,
    show: false,
    title: 'Textline',
    backgroundColor: settings.mode === 'light' || (settings.mode !== 'dark' && !nativeTheme.shouldUseDarkColors) ? '#ffffff' : '#0d0f14',
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      spellcheck: false,
      // Selbsttest: das versteckte Fenster soll trotzdem normal zeichnen (Bilder)
      backgroundThrottling: !selfTest,
    },
  });
  if (state.maximized) win.maximize();
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.once('ready-to-show', () => {
    if (!selfTest) win.show();
  });
  // Links aus Vorschauen nie im Programmfenster öffnen
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (url !== win.webContents.getURL()) e.preventDefault();
  });
  const remember = () => {
    if (!win || win.isDestroyed() || win.isMinimized()) return;
    const maximized = win.isMaximized();
    const b = maximized ? settings.window || {} : win.getBounds();
    settings.window = { x: b.x, y: b.y, width: b.width, height: b.height, maximized };
  };
  win.on('resize', remember);
  win.on('move', remember);
  win.on('maximize', remember);
  win.on('unmaximize', remember);
  // Schließen: erst fragt der Renderer (Sitzung sichern bzw. ungespeicherte Änderungen), dann geht es zu
  win.on('close', (e) => {
    if (closingAllowed || selfTest) return;
    e.preventDefault();
    win.webContents.send('app:closing');
  });
  win.on('closed', () => {
    win = null;
  });
}

function buildMenu() {
  if (process.platform !== 'darwin') {
    Menu.setApplicationMenu(null);
    return;
  }
  // macOS braucht ein Bearbeiten-Menü, sonst gehen Kopieren/Einfügen per Cmd nicht
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { role: 'appMenu' },
    { role: 'editMenu' },
    { role: 'windowMenu' },
  ]));
}

// ---------------------------------------------------------------- IPC: Einstellungen und Sitzung
ipcMain.handle('settings:get', () => settings);
ipcMain.handle('settings:set', (_e, next) => {
  const iconsBefore = settings.fileIcons;
  settings = { ...next, window: settings.window, fileIconsApplied: settings.fileIconsApplied };
  writeJson(userFile('settings.json'), settings);
  if (settings.fileIcons !== iconsBefore) syncFileIcons(true);
  return true;
});
// Dateisymbole im Explorer (Windows, installierte Version): hell, dunkel oder wie Windows
function syncFileIcons(force) {
  const save = (patch) => {
    settings = { ...settings, ...patch };
    writeJson(userFile('settings.json'), settings);
  };
  if (force) {
    const want = fileIcons.resolve(settings.fileIcons || 'auto');
    fileIcons.apply(want).then((ok) => ok && save({ fileIconsApplied: want }));
  } else fileIcons.sync(settings, save);
}
ipcMain.handle('session:get', () => readJson(userFile('session.json'), null));
ipcMain.handle('session:set', (_e, data) => {
  writeJson(userFile('session.json'), data);
  return true;
});
ipcMain.handle('app:initial-files', () => {
  const list = [...filesFromArgs(process.argv, process.cwd()), ...pendingFiles];
  pendingFiles.length = 0;
  return list;
});
ipcMain.handle('app:info', () => ({
  version: app.getVersion(),
  platform: process.platform,
  home: os.homedir(),
  dark: nativeTheme.shouldUseDarkColors,
  selfTest: !!selfTest,
  fileIcons: fileIcons.available(),
}));
ipcMain.handle('app:close-now', () => {
  closingAllowed = true;
  python.stopAll();
  if (win) win.close();
});
ipcMain.handle('app:set-title', (_e, title) => {
  if (win) win.setTitle(title);
});
nativeTheme.on('updated', () => {
  if (win) win.webContents.send('app:system-theme', nativeTheme.shouldUseDarkColors);
  if ((settings.fileIcons || 'auto') === 'auto' && fileIcons.resolve('auto') !== (settings.fileIconsApplied || 'light')) syncFileIcons(true);
});

// ---------------------------------------------------------------- IPC: Dateien
ipcMain.handle('file:open-dialog', async (_e, { title, filters, defaultPath } = {}) => {
  const r = await dialog.showOpenDialog(win, {
    title,
    defaultPath,
    properties: ['openFile', 'multiSelections'],
    filters,
  });
  return r.canceled ? [] : r.filePaths;
});
ipcMain.handle('file:save-dialog', async (_e, { title, defaultPath, filters } = {}) => {
  const r = await dialog.showSaveDialog(win, { title, defaultPath, filters });
  return r.canceled ? null : r.filePath;
});
ipcMain.handle('file:read', (_e, file, encoding) => {
  try {
    return files.read(file, encoding);
  } catch (err) {
    return { error: err.code || String(err.message), size: err.size };
  }
});
ipcMain.handle('file:write', (_e, file, text, opts) => {
  try {
    const mtime = files.write(file, text, opts);
    known.set(file, mtime);
    return { mtime };
  } catch (err) {
    return { error: err.code || String(err.message) };
  }
});
ipcMain.handle('file:exists', (_e, file) => {
  try {
    return fs.statSync(file).isFile();
  } catch {
    return false;
  }
});
ipcMain.handle('file:temp', (_e, name, text) => {
  const dir = path.join(os.tmpdir(), 'textline');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, name);
  fs.writeFileSync(file, text);
  return file;
});

// Änderungen von außen bemerken (anderes Programm hat die Datei gespeichert)
const watchers = new Map();
const known = new Map();
ipcMain.handle('file:watch', (_e, list) => {
  const want = new Set(list);
  for (const [p, w] of watchers) {
    if (!want.has(p)) {
      w.close();
      watchers.delete(p);
    }
  }
  for (const p of want) {
    if (watchers.has(p)) continue;
    try {
      known.set(p, fs.statSync(p).mtimeMs);
      let timer = null;
      const w = fs.watch(p, () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          let mtime = null;
          try {
            mtime = fs.statSync(p).mtimeMs;
          } catch {
            // gelöscht oder umbenannt
          }
          if (mtime !== null && mtime === known.get(p)) return;
          known.set(p, mtime);
          if (win) win.webContents.send('file:changed', { path: p, deleted: mtime === null });
        }, 250);
      });
      w.on('error', () => {
        watchers.delete(p);
      });
      watchers.set(p, w);
    } catch {
      // nicht beobachtbar (Netzlaufwerk o. ä.)
    }
  }
});

ipcMain.handle('shell:open-external', (_e, url) => {
  if (/^https?:\/\//i.test(url)) shell.openExternal(url);
});
ipcMain.handle('shell:open-path', (_e, p) => shell.openPath(p));
ipcMain.handle('shell:reveal', (_e, p) => shell.showItemInFolder(p));

// Drucken: der Renderer schickt fertiges HTML (eingefärbter Code), ein unsichtbares Fenster druckt es
ipcMain.handle('print:html', async (_e, html) => {
  const file = path.join(os.tmpdir(), `textline-print-${Date.now()}.html`);
  fs.writeFileSync(file, html);
  const pw = new BrowserWindow({ show: false, webPreferences: { sandbox: true, javascript: false } });
  await pw.loadFile(file);
  return new Promise((resolve) => {
    pw.webContents.print({ printBackground: true }, (ok, reason) => {
      pw.destroy();
      fs.rm(file, { force: true }, () => {});
      resolve({ ok, reason });
    });
  });
});

// ---------------------------------------------------------------- IPC: Python
ipcMain.handle('py:resolve', (_e, force) => {
  if (force) python.baseCache = null;
  return python.resolve(settings);
});
ipcMain.handle('py:ensure-env', () => python.ensureEnv());
ipcMain.handle('py:run', (_e, interp, file, cwd) => python.run(interp, file, cwd));
ipcMain.handle('py:shell', (_e, interp, cwd) => python.shell(interp, cwd));
ipcMain.handle('py:write', (_e, id, text) => python.write(id, text));
ipcMain.handle('py:stop', (_e, id) => python.stop(id));
ipcMain.handle('py:pip-list', (_e, interp) => python.pipList(interp));
ipcMain.handle('py:pip', async (_e, interp, args) => {
  const { id, done } = python.pip(interp, args);
  const res = await done;
  return { id, code: res.code };
});
ipcMain.handle('py:check', (_e, interp, code) => python.check(interp, code));
ipcMain.handle('py:pypi', async (_e, name) => {
  try {
    const res = await net.fetch(`https://pypi.org/pypi/${encodeURIComponent(name)}/json`, { headers: { 'User-Agent': 'Textline' } });
    if (res.status === 404) return { notFound: true };
    if (!res.ok) return { error: `HTTP ${res.status}` };
    const j = await res.json();
    const i = j.info || {};
    return {
      name: i.name,
      version: i.version,
      summary: i.summary,
      homepage: i.home_page || (i.project_urls && (i.project_urls.Homepage || i.project_urls.Home || i.project_urls.Source)) || i.project_url,
      author: i.author || i.maintainer,
      license: i.license_expression || (i.license && i.license.length < 60 ? i.license : ''),
      requiresPython: i.requires_python,
    };
  } catch (err) {
    return { error: String(err.message || err) };
  }
});

// ---------------------------------------------------------------- Updates (wie bei Webcase)
function isTarGz() {
  if (process.platform !== 'linux') return false;
  const exe = app.getPath('exe');
  return !exe.startsWith('/usr/') && !exe.startsWith('/opt/');
}

function setupAutoUpdate() {
  if (!app.isPackaged || selfTest) return;
  if (process.env.PORTABLE_EXECUTABLE_DIR || process.platform === 'darwin' || isTarGz()) return setupUpdateNotice();
  let autoUpdater;
  try {
    ({ autoUpdater } = require('electron-updater'));
  } catch {
    return;
  }
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  const check = () => autoUpdater.checkForUpdates().catch(() => {});
  let retry = null;
  autoUpdater.on('error', () => {
    clearTimeout(retry);
    retry = setTimeout(check, 10 * 60 * 1000);
  });
  const laterFile = userFile('update.json');
  let asking = false;
  autoUpdater.on('update-downloaded', async (info) => {
    const later = readJson(laterFile, {});
    if (asking || (later.version === info.version && Date.now() < later.until)) return;
    asking = true;
    const { response } = await dialog.showMessageBox(win, {
      type: 'info',
      buttons: [t('restartNow'), t('later')],
      defaultId: 0,
      cancelId: 1,
      title: t('updateTitle'),
      message: t('updateReady', { version: info.version }),
      detail: t('updateDetail'),
    });
    asking = false;
    if (response === 0) {
      closingAllowed = false;
      // erst die Sitzung sichern lassen, dann installieren
      win.webContents.send('app:closing', { update: true });
      ipcMain.once('app:update-ready', () => {
        closingAllowed = true;
        autoUpdater.quitAndInstall();
      });
    } else {
      writeJson(laterFile, { version: info.version, until: Date.now() + 14 * 24 * 3600 * 1000 });
    }
  });
  setTimeout(check, 5000);
  setInterval(check, 60 * 60 * 1000);
}

function setupUpdateNotice() {
  const laterFile = userFile('update.json');
  const newer = (a, b) => {
    const pa = a.split('.').map(Number), pb = b.split('.').map(Number);
    for (let i = 0; i < 3; i++) if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0);
    return false;
  };
  let asked = false;
  const check = async () => {
    if (asked) return;
    try {
      const res = await net.fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
        headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Textline' },
      });
      if (!res.ok) return;
      const rel = await res.json();
      const version = String(rel.tag_name || '').replace(/^v/, '');
      if (!version || !newer(version, app.getVersion())) return;
      const later = readJson(laterFile, {});
      if (later.version === version && Date.now() < later.until) return;
      asked = true;
      const { response } = await dialog.showMessageBox(win, {
        type: 'info',
        buttons: [t('openDownloadPage'), t('later')],
        defaultId: 0,
        cancelId: 1,
        title: t('updateTitle'),
        message: t('updateAvailable', { version }),
        detail: t('updateManualDetail'),
      });
      if (response === 0) shell.openExternal(rel.html_url || `https://github.com/${REPO}/releases/latest`);
      else writeJson(laterFile, { version, until: Date.now() + 14 * 24 * 3600 * 1000 });
    } catch {
      // offline - später nochmal
    }
  };
  setTimeout(check, 8000);
  setInterval(check, 6 * 60 * 60 * 1000);
}
ipcMain.on('app:update-ready', () => {});

// ---------------------------------------------------------------- Start
app.whenReady().then(() => {
  settings = readJson(userFile('settings.json'), {});
  buildMenu();
  createWindow();
  setupAutoUpdate();
  if (!selfTest) setTimeout(() => syncFileIcons(false), 3000);
  if (selfTest) require(path.join(__dirname, '..', 'tools', testArg === '--siteshots' ? 'siteshots.js' : 'selftest.js'))(win, selfTest, { python });
});

app.on('before-quit', () => {
  try {
    writeJson(userFile('settings.json'), settings);
  } catch {
    // egal
  }
});
app.on('window-all-closed', () => {
  python.stopAll();
  app.quit();
});
app.on('activate', () => {
  if (!win) createWindow();
});
