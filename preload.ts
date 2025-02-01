import * as fs from 'fs/promises';

import { contextBridge, ipcRenderer } from 'electron';

import mmCjs from 'music-metadata';

// import { loadMusicMetadata } from 'music-metadata';

type MusicMetadataCjs = {
  loadMusicMetadata: () => Promise<typeof import('music-metadata')>;
};

contextBridge.exposeInMainWorld('electron', {
  openFileDialog: (): Promise<string> => ipcRenderer.invoke('open-file-dialog'),
  readFile: async (filePath: string): Promise<Uint8Array> => {
    const data = await fs.readFile(filePath);
    console.log('Read file data:', data);
    return new Uint8Array(data);
  },
  decodeAudioData: (uint8Array: Uint8Array): Promise<any> => {
    const arrayBuffer = uint8Array.buffer;
    console.log('ArrayBuffer to decode:', arrayBuffer);
    return ipcRenderer.invoke('decode-audio-data', arrayBuffer);
  },
  readMetadata: async (filePath: string): Promise<mmCjs.IAudioMetadata> => {
    // Load music-metadata ESM module
    const mmEsm = await (mmCjs as any as MusicMetadataCjs).loadMusicMetadata();
    const metadata = await mmEsm.parseFile(filePath);
    return metadata;
  }
});
