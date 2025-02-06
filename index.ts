const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const { AudioContext: NodeAudioContext, AudioBuffer: NodeAudioBuffer } = require('node-web-audio-api');

const createWindow = () => {
  const preloadPath = path.join(__dirname, 'preload.js');
  console.log('Preload Path:', preloadPath);

  if (!fs.existsSync(preloadPath)) {
    console.error('Preload script not found:', preloadPath);
    return;
  }

  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  const win = new BrowserWindow({
    width: 800,
    height: 600,
    x: width - 800,
    y: height - 600,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: true
    }
  });

  win.loadFile('index.html');
  win.webContents.openDevTools();

  win.webContents.on('devtools-opened', () => {
    const devToolsWindow = BrowserWindow.getAllWindows().find((w: any) => w.title === 'DevTools');
    if (devToolsWindow) {
      devToolsWindow.setBounds({
        x: 0,
        y: 0,
        width: 600,
        height: 600
      });
    }
  });
};

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Audio Files', extensions: ['flac'] }]
  });
  return result.filePaths[0];
});

ipcMain.handle('decode-audio-data', async (_event: any, arrayBuffer: ArrayBuffer) => {
  const audioContext = new NodeAudioContext();
  try {
    console.log('ArrayBuffer received for decoding:', arrayBuffer);

    const decodedData = await new Promise<AudioBuffer>((resolve, reject) => {
      audioContext.decodeAudioData(arrayBuffer, resolve, reject);
    });

    console.log('Decoded Data:', decodedData);

    if (decodedData instanceof NodeAudioBuffer) {
      // Convert AudioBuffer to a transferable format
      const bufferData = {
        duration: decodedData.duration,
        sampleRate: decodedData.sampleRate,
        numberOfChannels: decodedData.numberOfChannels,
        length: decodedData.length,
        data: Array.from({ length: decodedData.numberOfChannels }, (_, i) => decodedData.getChannelData(i))
      };
      return bufferData;
    } else {
      throw new Error('Decoded buffer does not have expected AudioBuffer properties');
    }
  } catch (error) {
    console.error('Error decoding audio data:', error);
    throw error;
  }
});

ipcMain.handle('decode-audio-data-stream', async (_event: any, filePath: string) => {
  const readStream = fs.createReadStream(filePath);
  console.log('Read Stream created:', readStream);
  interface AudioChunkEvent {
    sender: {
      send: (channel: string, ...args: any[]) => void;
    };
  }

  readStream.on('data', (chunk: Buffer) => {
    (_event as AudioChunkEvent).sender.send('audio-chunk', chunk);
  });
  readStream.on('end', () => {
    _event.sender.send('audio-end');
  });
});
