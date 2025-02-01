interface ElectronAPI {
  openFileDialog: () => Promise<string>;
  readFile: (filePath: string) => Promise<Uint8Array>;
  decodeAudioData: (uint8Array: Uint8Array) => Promise<any>;
  readMetadata: (filePath: string) => Promise<IAudioMetadata>;
}

interface Window {
  electron: ElectronAPI;
}
