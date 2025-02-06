"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const fsPromises = require('fs').promises;
const { contextBridge, ipcRenderer } = require('electron');
const mmCjs = require('music-metadata');
contextBridge.exposeInMainWorld('electron', {
    ipcRenderer: {
        send: (channel, ...args) => ipcRenderer.send(channel, ...args),
        on: (channel, listener) => ipcRenderer.on(channel, listener)
    },
    openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
    readFile: (filePath) => __awaiter(void 0, void 0, void 0, function* () {
        const data = yield fsPromises.readFile(filePath);
        console.log('Read file data:', data);
        return new Uint8Array(data);
    }),
    decodeAudioDataStream: () => {
        return new Promise((resolve, reject) => {
            const audioContext = new AudioContext();
            const stream = new ReadableStream({
                start(controller) {
                    ipcRenderer.on('audio-chunk', (_event, chunk) => {
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
            const chunks = [];
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
                    audioContext.decodeAudioData(combined.buffer, (audioBuffer) => {
                        const source = audioContext.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(audioContext.destination);
                        source.start();
                        resolve();
                    }, reject);
                    return;
                }
                chunks.push(value);
                reader.read().then(processChunk);
            });
        });
    },
    readMetadata: (filePath) => __awaiter(void 0, void 0, void 0, function* () {
        // Load music-metadata ESM module
        const mmEsm = yield mmCjs.loadMusicMetadata();
        const metadata = yield mmEsm.parseFile(filePath);
        return metadata;
    })
});
