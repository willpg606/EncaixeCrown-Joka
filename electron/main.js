import fs from 'node:fs';
import net from 'node:net';
import path from 'path';
import { fileURLToPath } from 'url';
import { app, BrowserWindow, dialog, shell } from 'electron';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = !app.isPackaged;
const preferredPort = Number(process.env.PORT || 3333);
let currentServerPort = preferredPort;
let serverInstance;
let startServer;

app.disableHardwareAcceleration();

function getStorageDir() {
  if (isDev) {
    return path.join(app.getPath('userData'), 'storage');
  }

  return path.join(path.dirname(process.execPath), 'storage');
}

function writeStartupLog(message) {
  try {
    const storageDir = getStorageDir();
    fs.mkdirSync(storageDir, { recursive: true });
    const logPath = path.join(storageDir, 'desktop-startup.log');
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${message}\n`, 'utf-8');
  } catch {}
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
  writeStartupLog(`APP_VERSION=${app.getVersion()}`);
  writeStartupLog(`EXEC_PATH=${process.execPath}`);

  const win = new BrowserWindow({
    width: 1480,
    height: 920,
    minWidth: 1200,
    minHeight: 760,
    title: 'CROWN ENCAIXES PRO',
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    backgroundColor: '#f4f7fb',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.once('ready-to-show', () => {
    win.show();
  });

  await win.loadURL(
    `data:text/html;charset=utf-8,${encodeURIComponent(`
      <html>
        <body style="margin:0;font-family:Inter,Arial,sans-serif;background:#f4f7fb;display:flex;align-items:center;justify-content:center;min-height:100vh;color:#0f172a">
          <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:24px;padding:32px;box-shadow:0 20px 45px rgba(15,23,42,.08);max-width:480px;width:100%">
            <div style="font-size:12px;letter-spacing:.22em;text-transform:uppercase;color:#2563eb;font-weight:700">Inicializando</div>
            <h1 style="margin:12px 0 0;font-size:28px">CROWN ENCAIXES PRO</h1>
            <p style="margin:16px 0 0;line-height:1.6;color:#475569">Preparando o servidor local e carregando a operação.</p>
          </div>
        </body>
      </html>
    `)}`
  );

  try {
    if (!serverInstance) {
      currentServerPort = await getAvailablePort(preferredPort);
      process.env.STORAGE_DIR = getStorageDir();
      writeStartupLog(`STORAGE_DIR=${process.env.STORAGE_DIR}`);
      writeStartupLog(`PORT=${currentServerPort}`);

      if (!startServer) {
        ({ startServer } = await import('../backend/server.js'));
      }

      serverInstance = startServer(currentServerPort);
      await waitForServer(`http://localhost:${currentServerPort}/api/health`);
    }
  } catch (error) {
    writeStartupLog(`ERRO AO INICIAR: ${error?.stack || error?.message || error}`);
    dialog.showErrorBox(
      'Falha ao iniciar o CROWN ENCAIXES PRO',
      `${error?.message || 'O servidor local não conseguiu iniciar.'}\n\nConsulte o arquivo desktop-startup.log na pasta storage do aplicativo.`
    );
    await win.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(`
        <html>
          <body style="margin:0;font-family:Inter,Arial,sans-serif;background:#fef2f2;display:flex;align-items:center;justify-content:center;min-height:100vh;color:#7f1d1d">
            <div style="background:#ffffff;border:1px solid #fecaca;border-radius:24px;padding:32px;box-shadow:0 20px 45px rgba(127,29,29,.08);max-width:560px;width:100%">
              <div style="font-size:12px;letter-spacing:.22em;text-transform:uppercase;color:#dc2626;font-weight:700">Erro de inicialização</div>
              <h1 style="margin:12px 0 0;font-size:28px">Não foi possível abrir o sistema</h1>
              <p style="margin:16px 0 0;line-height:1.7;color:#7f1d1d">${String(error?.message || 'Falha desconhecida').replace(/</g, '&lt;')}</p>
              <p style="margin:16px 0 0;line-height:1.7;color:#991b1b">Abra o arquivo <strong>desktop-startup.log</strong> na pasta <strong>storage</strong> ao lado do executável para detalhes.</p>
            </div>
          </body>
        </html>
      `)}`
    );
    return;
  }

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
