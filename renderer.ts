let audioContext: AudioContext;
let source: AudioBufferSourceNode | null = null;
let gainNode: GainNode;
let startTime: number;
let elapsedTime = 0;
let animationFrameId: number;
let showRemainingTime = false;
let isPaused = false;
let pauseTime = 0;
let equalizerEnabled = true;
const filters: BiquadFilterNode[] = [];

const frequencies = [60, 170, 310, 600, 1000, 3000, 6000, 12000];

const createFilters = () => {
  frequencies.forEach((frequency) => {
    const filter = audioContext.createBiquadFilter();
    filter.type = 'peaking';
    filter.frequency.value = frequency;
    filter.Q.value = 1;
    filter.gain.value = 0;
    filters.push(filter);
  });

  // Connect filters in series
  filters.reduce((prev, curr) => {
    prev.connect(curr);
    return curr;
  });
};

const updateTimeDisplay = () => {
  if (audioContext && startTime !== undefined && source && !isPaused) {
    elapsedTime = audioContext.currentTime - startTime;
  }
  const totalDuration = source?.buffer?.duration || 0;
  const timeToShow = showRemainingTime ? totalDuration - elapsedTime : elapsedTime;
  const minutes = Math.floor(timeToShow / 60);
  const seconds = Math.floor(timeToShow % 60);
  const timeLabel = showRemainingTime ? 'Remaining Time' : 'Elapsed Time';
  const timeDisplayElement = document.getElementById('time-display');
  if (timeDisplayElement) {
    timeDisplayElement.textContent = `${timeLabel}: ${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
  if (!isPaused) {
    animationFrameId = requestAnimationFrame(updateTimeDisplay);
  }
};

const playAudio = async () => {
  if (source) {
    source.stop();
    source.disconnect();
  }
  source = audioContext.createBufferSource();
  source.buffer = await window.electron.decodeAudioDataStream();
  if (equalizerEnabled) {
    source.connect(filters[0]).connect(gainNode).connect(audioContext.destination);
  } else {
    if (!source) throw new Error('Audio source is not defined');
    source.connect(gainNode).connect(audioContext.destination);
    source.start(0, pauseTime);
    startTime = audioContext.currentTime - pauseTime;
    isPaused = false;
    updateTimeDisplay();
    console.log('Playback started');
  }
};

document.getElementById('select-file')?.addEventListener('click', async () => {
  const filePath = await window.electron.openFileDialog();
  if (filePath) {
    try {
      console.log('File path selected:', filePath);

      // Read and log metadata
      const metadata = await window.electron.readMetadata(filePath);
      console.log('File metadata:', metadata);

      // Read the file in chunks and send to preload script
      const fileData = await window.electron.readFile(filePath);
      const chunkSize = 1024 * 16; // 16KB chunks
      for (let i = 0; i < fileData.length; i += chunkSize) {
        const chunk = fileData.slice(i, i + chunkSize);
        window.electron.ipcRenderer.send('audio-chunk', chunk);
      }
      window.electron.ipcRenderer.send('audio-end');

      audioContext = new AudioContext();
      gainNode = audioContext.createGain();
      gainNode.gain.value = 0.25; // Set initial volume to 25%

      // Create and connect filters
      createFilters();

      playAudio(); // Start playback automatically
    } catch (error) {
      console.error('Error playing audio file:', error);
    }
  }
});

document.getElementById('play-file')?.addEventListener('click', () => {
  if (!isPaused || !source) return;
  source.disconnect();
  source.connect(gainNode).connect(audioContext.destination);
  source.start(0, pauseTime);
  startTime = audioContext.currentTime - pauseTime;
  isPaused = false;
  updateTimeDisplay();
  console.log('Playback started');
});

document.getElementById('stop-playback')?.addEventListener('click', () => {
  if (source) {
    source.stop();
    source = null;
    pauseTime = 0;
    isPaused = false;
    cancelAnimationFrame(animationFrameId);
    elapsedTime = 0;
    updateTimeDisplay();
    console.log('Playback stopped');
  }
});

document.getElementById('volume-control')?.addEventListener('input', (event) => {
  const volume = (event.target as HTMLInputElement).value;
  if (gainNode) {
    gainNode.gain.value = parseFloat(volume);
    console.log('Volume set to:', volume);
  }
});

document.getElementById('time-display')?.addEventListener('click', () => {
  showRemainingTime = !showRemainingTime;
  updateTimeDisplay();
});

// Create a container for the sliders
const sliderContainer = document.getElementById('slider-container');

// Create sliders for each frequency band
frequencies.forEach((frequency, index) => {
  const sliderWrapper = document.createElement('div');
  sliderWrapper.className = 'slider-wrapper';

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = '-30';
  slider.max = '30';
  slider.value = '0';
  slider.step = '1';
  slider.className = 'slider';
  slider.addEventListener('input', (event) => {
    const value = parseFloat((event.target as HTMLInputElement).value);
    filters[index].gain.value = value;
    console.log(`Frequency ${frequency} Hz gain set to: ${value} dB`);

    // If group sliders is checked, adjust other sliders
    const groupSliders = (document.getElementById('group-sliders') as HTMLInputElement).checked;
    if (groupSliders) {
      frequencies.forEach((_, i) => {
        if (i !== index) {
          const distance = Math.abs(i - index);
          const adjustment = value / (distance + 1);
          const currentSlider = sliderContainer?.children[i] as HTMLElement;
          const currentInput = currentSlider.querySelector('input') as HTMLInputElement;
          const newValue = parseFloat(currentInput.value) + adjustment;
          currentInput.value = newValue.toString();
          filters[i].gain.value = newValue;
        }
      });
    }
  });

  const label = document.createElement('label');
  label.textContent = `${frequency} Hz`;
  label.className = 'slider-label';

  sliderWrapper.appendChild(slider);
  sliderWrapper.appendChild(label);
  sliderContainer?.appendChild(sliderWrapper);
});

// Toggle equalizer button
document.getElementById('toggle-equalizer')?.addEventListener('click', () => {
  equalizerEnabled = !equalizerEnabled;
  console.log(`Equalizer ${equalizerEnabled ? 'enabled' : 'disabled'}`);
  if (source) {
    source.disconnect();
    if (equalizerEnabled) {
      source.connect(filters[0]).connect(gainNode).connect(audioContext.destination);
    } else {
      source.connect(gainNode).connect(audioContext.destination);
    }
  }
});
