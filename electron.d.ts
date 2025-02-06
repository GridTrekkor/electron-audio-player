interface ElectronAPI {
  openFileDialog: () => Promise<string>;
  readFile: (filePath: string) => Promise<Uint8Array>;
  decodeAudioData: (uint8Array: Uint8Array) => Promise<any>;
  decodeAudioDataStream: () => Promise<AudioBuffer>; // Add this line
  ipcRenderer: {
    send: (channel: string, ...args: any[]) => void;
    on: (channel: string, listener: (event: any, ...args: any[]) => void) => void;
  };
  readMetadata: (filePath: string) => Promise<IAudioMetadata>;
}

interface Window {
  electron: ElectronAPI;
}
