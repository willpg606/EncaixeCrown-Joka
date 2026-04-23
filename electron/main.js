import { app, BrowserWindow, shell } from 'electron';
import net from 'node:net';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = !app.isPackaged;
const preferredPort = Number(process.env.PORT || 3333);
let currentServerPort = preferredPort;
let serverInstance;
let startServer;

function getStorageDir() {
  if (isDev) {
    return path.join(app.getPath('userData'), 'storage');
  }

  return path.join(path.dirname(process.execPath), 'storage');
}

function getAvailablePort(startPort) {
  return new Promise((resolve, reject) => {
    const tryPort = (port) => {
      const tester = net.createServer();

      tester.once('error', (error) => {
        if (error.code === 'EADDRINUSE') {
          tryPort(port + 1);
          return;
        }

        reject(error);
      });

      tester.once('listening', () => {
        tester.close(() => resolve(port));
      });

      tester.listen(port, '127.0.0.1');
    };

    tryPort(startPort);
  });
}

async function waitForServer(url, retries = 60) {
  for (let index = 0; index < retries; index += 1) {
    try {
      const response = await fetch(url);

      if (response.ok) {
        return;
      }
    } catch {}

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error('Servidor local não respondeu a tempo.');
}

async function createWindow() {
  if (!serverInstance) {
    currentServerPort = await getAvailablePort(preferredPort);
    process.env.STORAGE_DIR = getStorageDir();
    if (!startServer) {
      ({ startServer } = await import('../backend/server.js'));
    }
    serverInstance = startServer(currentServerPort);
    await waitForServer(`http://localhost:${currentServerPort}/api/health`);
  }

  const win = new BrowserWindow({
    width: 1480,
    height: 920,
    minWidth: 1200,
    minHeight: 760,
    title: 'CROWN ENCAIXES PRO',
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    backgroundColor: '#f4f7fb',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  await win.loadURL(`http://localhost:${currentServerPort}`);

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    win.webContents.openDevTools({ mode: 'detach' });
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (serverInstance) {
    serverInstance.close();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
