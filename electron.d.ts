interface ElectronAPI {
  openFileDialog: () => Promise<string>;
  readFile: (filePath: string) => Promise<Uint8Array>;
  decodeAudioData: (uint8Array: Uint8Array) => Promise<any>;
}

interface Window {
  electron: ElectronAPI;
}
