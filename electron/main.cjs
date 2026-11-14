const { app, BrowserWindow, ipcMain, shell, screen } = require('electron');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { detectRuntimes, runSubmission, stop } = require('./runner.cjs');
const { CodexService } = require('./ai.cjs');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { prepareCacheDirectory, findToolchainRoot } = require('./startup.cjs');

if (process.env.STUDIO_USER_DATA) app.setPath('userData', process.env.STUDIO_USER_DATA);
const primaryInstance = app.requestSingleInstanceLock();
if (!primaryInstance) app.quit();
if (primaryInstance) {
  const profile = app.getPath('userData');
  const profileId = crypto.createHash('sha256').update(profile).digest('hex').slice(0, 12);
  const cache = prepareCacheDirectory([
    process.env.STUDIO_USER_DATA
      ? path.join(profile, 'chromium-cache-v2')
      : path.join(process.env.LOCALAPPDATA || app.getPath('temp'), 'Syntax Studio', 'chromium-cache-v2', profileId),
    path.join(app.getPath('temp'), 'Syntax Studio', 'chromium-cache-v2', profileId),
  ]);
  // Chromium caches are disposable; keep them separate from progress and login data.
  app.setPath('sessionData', cache);
  const tools = findToolchainRoot({ executable: process.execPath, sourceRoot: path.join(__dirname, '..'), override: process.env.STUDIO_TOOLCHAIN_ROOT });
  if (tools) process.env.STUDIO_TOOLCHAIN_ROOT = tools;
}
let db, ai, mainWindow, readyToClose = false, closeTimer;
const allowedHosts = new Set(['docs.python.org', 'www.python.org', 'developer.mozilla.org', 'learn.microsoft.com', 'dotnet.microsoft.com', 'doc.rust-lang.org', 'www.rust-lang.org', 'dev.java', 'www.haskell.org', 'hackage.haskell.org', 'nodejs.org', 'github.com', 'auth.openai.com']);

function register(name, handler) {
  ipcMain.handle(name, (event, ...args) => {
    if (event.sender !== mainWindow?.webContents || event.senderFrame !== mainWindow?.webContents.mainFrame) throw new Error('無效的呼叫來源。');
    return handler(...args);
  });
}
app.whenReady().then(() => {
  if (!primaryInstance) return;
  fs.mkdirSync(app.getPath('userData'), { recursive: true });
  db = new DatabaseSync(path.join(app.getPath('userData'), 'learning.sqlite'));
  db.exec('CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
  ai = new CodexService({ dataDir: path.join(app.getPath('userData'), 'codex'), openExternal: url => shell.openExternal(url) });
  register('runtimes', () => detectRuntimes(true));
  register('run', async input => {
    if (typeof input?.stdin !== 'string') throw new Error('輸入格式不正確。');
    const checked = await runSubmission(input, [{ input: input.stdin, expected: '', label: '手動執行' }]);
    return checked.results[0];
  });
  register('check', input => runSubmission(input, input?.tests));
  register('load', () => {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('progress');
    return row ? JSON.parse(row.value) : null;
  });
  register('save', progress => {
    const value = JSON.stringify(progress);
    if (value.length > 6000000 || !progress || typeof progress.drafts !== 'object' || !Array.isArray(progress.completed)) throw new Error('進度資料格式不正確。');
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run('progress', value);
  });
  register('openExternal', async input => {
    const url = new URL(input);
    if (url.protocol !== 'https:' || !allowedHosts.has(url.hostname)) throw new Error('不支援的外部連結。');
    await shell.openExternal(url.toString());
  });
  register('authStatus', () => ai.status());
  register('login', () => ai.login());
  register('logout', () => ai.logout());
  register('closeReady', () => { readyToClose = true; clearTimeout(closeTimer); mainWindow.close(); });
  register('review', input => {
    if (!input || ['language', 'topic', 'task', 'code', 'results'].some(k => typeof input[k] !== 'string' || input[k].length > 100000)) throw new Error('評閱資料格式不正確。');
    return ai.review(input);
  });
  const available = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workAreaSize;
  mainWindow = new BrowserWindow({
    width: Math.min(1480, available.width), height: Math.min(960, available.height),
    minWidth: Math.min(1000, available.width), minHeight: Math.min(600, available.height), show: false,
    title: 'Syntax Studio · 語法之間', backgroundColor: '#f5f5ef', autoHideMenuBar: true,
    icon: path.join(__dirname, '..', 'dist', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false },
  });
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('close', event => {
    if (readyToClose || mainWindow.webContents.isDestroyed()) return;
    event.preventDefault();
    mainWindow.webContents.send('before-close');
    if (!closeTimer) closeTimer = setTimeout(() => { readyToClose = true; mainWindow.close(); }, 3000);
  });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', event => event.preventDefault());
  const devUrl = process.env.STUDIO_DEV_URL;
  if (devUrl === 'http://127.0.0.1:5173') mainWindow.loadURL(devUrl);
  else mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
});
app.on('window-all-closed', () => app.quit());
app.on('second-instance', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
});
app.on('before-quit', () => { readyToClose = true; });
app.on('will-quit', () => { stop(); ai?.stop(); db?.close(); });
