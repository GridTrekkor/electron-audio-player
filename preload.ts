const fsPromises = require('fs').promises;

const { contextBridge, ipcRenderer } = require('electron');

const mmCjs = require('music-metadata');

type MusicMetadataCjs = {
  loadMusicMetadata: () => Promise<typeof import('music-metadata')>;
};

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    send: (channel: string, ...args: any[]) => ipcRenderer.send(channel, ...args),
    on: (channel: string, listener: any) => ipcRenderer.on(channel, listener)
  },
  openFileDialog: (): Promise<string> => ipcRenderer.invoke('open-file-dialog'),
  readFile: async (filePath: string): Promise<Uint8Array> => {
    const data = await fsPromises.readFile(filePath);
    console.log('Read file data:', data);
    return new Uint8Array(data);
  },
  decodeAudioDataStream: (): Promise<void> => {
    return new Promise((resolve, reject) => {
      const audioContext = new AudioContext();
      const stream = new ReadableStream({
        start(controller) {
          ipcRenderer.on('audio-chunk', (_event: any, chunk: any) => {
            console.log('Received audio chunk:', chunk);
            controller.enqueue(chunk);
          });
          ipcRenderer.on('audio-end', () => {
            console.log('Audio stream ended');
            controller.close();
          });
        }
      });

      const reader = stream.getReader();
      const chunks: Uint8Array[] = [];
      reader.read().then(function processChunk({ done, value }) {
        console.log('Reader read:', { done, value });
        if (done) {
          const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
          const combined = new Uint8Array(totalLength);
          let offset = 0;
          for (const chunk of chunks) {
            combined.set(chunk, offset);
            offset += chunk.length;
          }
          audioContext.decodeAudioData(
            combined.buffer,
            (audioBuffer) => {
              const source = audioContext.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(audioContext.destination);
              source.start();
              resolve();
            },
            reject
          );
          return;
        }
        chunks.push(value);
        reader.read().then(processChunk);
      });
    });
  },
  readMetadata: async (filePath: string): Promise<any> => {
    // Load music-metadata ESM module
    const mmEsm = await (mmCjs as any as MusicMetadataCjs).loadMusicMetadata();
    const metadata = await mmEsm.parseFile(filePath);
    return metadata;
  }
});
