const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs').promises;

contextBridge.exposeInMainWorld('electron', {
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  readFile: async (filePath) => {
    const data = await fs.readFile(filePath);
    console.log('Read file data:', data);
    return new Uint8Array(data);
  },
  decodeAudioData: (uint8Array) => {
    const arrayBuffer = uint8Array.buffer;
    console.log('ArrayBuffer to decode:', arrayBuffer);
    return ipcRenderer.invoke('decode-audio-data', arrayBuffer);
  },
});

// const { contextBridge, ipcRenderer } = require('electron');
// const fs = require('fs').promises;

// contextBridge.exposeInMainWorld('electron', {
//   openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
//   readFile: async (filePath) => {
//     const data = await fs.readFile(filePath);
//     console.log('Read file data:', data);
//     return new Uint8Array(data);
//   },
//   decodeAudioData: (uint8Array) => {
//     const arrayBuffer = uint8Array.buffer;
//     console.log('ArrayBuffer to decode:', arrayBuffer);
//     return new Promise((resolve, reject) => {
//       const audioContext = new AudioContext();
//       audioContext.decodeAudioData(
//         arrayBuffer,
//         (decodedData) => {
//           console.log('Decoded Data:', decodedData);
//           console.log('Decoded Data Properties:', {
//             duration: decodedData.duration,
//             sampleRate: decodedData.sampleRate,
//             numberOfChannels: decodedData.numberOfChannels,
//             length: decodedData.length,
//           });
//           // Check if decodedData has properties of AudioBuffer
//           if (decodedData && typeof decodedData.duration === 'number' && typeof decodedData.sampleRate === 'number') {
//             resolve(decodedData);
//           } else {
//             reject(new Error('Decoded buffer does not have expected AudioBuffer properties'));
//           }
//         },
//         (error) => {
//           reject(error);
//         }
//       );
//     });
//   },
// });
