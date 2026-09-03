const { app, BrowserWindow, screen, ipcMain, Tray, Menu, globalShortcut, shell } = require('electron');
const os = require('os');
const path = require('path');

let win = null;
let learnWin = null;
let tray = null;
let prevCpu = null;
let cpuTimer = null;

function createWindow() {
  const display = screen.getPrimaryDisplay();
  const { width, height } = display.workAreaSize;

  win = new BrowserWindow({
    width,
    height,
    x: 0,
    y: 0,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile(path.join(__dirname, 'src', 'index.html'));

  // 开发模式：禁用缓存，避免修改后仍加载旧文件。
  win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Cache-Control': ['no-cache, no-store, must-revalidate'],
        Pragma: ['no-cache'],
        Expires: ['0'],
      },
    });
  });

  win.setIgnoreMouseEvents(true, { forward: true });
}

function openLearnMode() {
  console.log('[tray] === openLearnMode called ===');
  console.log('[tray] learnWin:', learnWin);
  
  if (learnWin && !learnWin.isDestroyed()) {
    console.log('[tray] existing non-destroyed window, showing...');
    if (learnWin.isMinimized()) learnWin.restore();
    learnWin.show();
    learnWin.focus();
    return;
  }

  console.log('[tray] creating BrowserWindow...');
  learnWin = new BrowserWindow({
    show: true,
    fullscreen: true,
    frame: false,
    transparent: false,
    backgroundColor: '#0a0a0a',
    alwaysOnTop: false,
    skipTaskbar: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: true,
      webSecurity: false,
    },
  });

  console.log('[tray] BrowserWindow created, path:', path.join(__dirname, 'src', 'learn.html'));

  learnWin.loadFile(path.join(__dirname, 'src', 'learn.html')).then(() => {
    console.log('[tray] loadFile resolved');
  }).catch((err) => {
    console.error('[tray] loadFile rejected:', err);
  });

  learnWin.webContents.on('dom-ready', () => {
    console.log('[tray] dom-ready event fired');
  });

  learnWin.webContents.on('did-finish-load', () => {
    console.log('[tray] did-finish-load event fired');
  });

  learnWin.webContents.on('did-fail-load', (event, errorCode, errorDescription, url) => {
    console.error('[tray] did-fail-load:', errorCode, errorDescription, url);
  });

  learnWin.on('closed', () => {
    console.log('[tray] learnWin closed');
    learnWin = null;
  });
}

function getCpuUsage() {
  const cpus = os.cpus();
  let totalIdle = 0;
  let totalTick = 0;

  for (const cpu of cpus) {
    for (const type in cpu.times) totalTick += cpu.times[type];
    totalIdle += cpu.times.idle;
  }

  let usage = 0;
  if (prevCpu) {
    const idleDiff = totalIdle - prevCpu.idle;
    const totalDiff = totalTick - prevCpu.total;
    usage = totalDiff > 0 ? 1 - idleDiff / totalDiff : 0;
  }

  prevCpu = { idle: totalIdle, total: totalTick };
  return usage;
}

function startCpuMonitor() {
  getCpuUsage();
  cpuTimer = setInterval(() => {
    const usage = getCpuUsage();
    if (win && !win.isDestroyed()) {
      win.webContents.send('cpu-usage', usage);
    }
  }, 5000);
}

ipcMain.handle('set-ignore-mouse', (_event, ignore) => {
  if (win && !win.isDestroyed()) {
    if (ignore) win.setIgnoreMouseEvents(true, { forward: true });
    else win.setIgnoreMouseEvents(false);
  }
});

ipcMain.handle('get-screen-bounds', () => {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  return { width, height };
});

ipcMain.handle('get-app-dir', () => __dirname);
ipcMain.handle('save-memory', () => true);
ipcMain.handle('get-bg-video-path', () => {
  return path.join(__dirname, 'assets', 'bg-video.mp4');
});
ipcMain.handle('close-learn-mode', () => {
  if (learnWin && !learnWin.isDestroyed()) learnWin.close();
});

function createTray() {
  tray = new Tray(path.join(__dirname, 'dino.ico'));
  const aboutPath = path.join(__dirname, 'about.txt');

  const menu = Menu.buildFromTemplate([
    { label: '显示恐龙', click: () => win && win.show() },
    { label: '隐藏恐龙', click: () => win && win.hide() },
    { type: 'separator' },
    { label: '打开学习模式', click: () => openLearnMode() },
    { type: 'separator' },
    { label: '重启', click: () => { app.relaunch(); app.quit(); } },
    { type: 'separator' },
    { label: '关于', click: () => shell.openPath(aboutPath) },
    { type: 'separator' },
    { label: '退出', click: () => app.quit() },
  ]);

  tray.setToolTip('恐龙桌宠');
  tray.setContextMenu(menu);
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  startCpuMonitor();

  globalShortcut.register('CommandOrControl+Shift+L', () => {
    openLearnMode();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (cpuTimer) clearInterval(cpuTimer);
  globalShortcut.unregisterAll();
});