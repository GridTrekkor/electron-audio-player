const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const { AudioContext: NodeAudioContext, AudioBuffer: NodeAudioBuffer } = require('node-web-audio-api');

const createWindow = () => {
  const preloadPath = path.join(__dirname, 'preload.js');
  console.log('Preload Path:', preloadPath);

  if (!require('fs').existsSync(preloadPath)) {
    console.error('Preload script not found:', preloadPath);
    return;
  }

  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: true
    }
  });

  win.loadFile('index.html');
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
