let audioCtx: AudioContext | null = null;

export const playSound = (type: 'tick' | 'message' | 'start' | 'vote' | 'eliminated' | 'win' | 'lose') => {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const playOscillator = (freq: number, type: OscillatorType, duration: number, vol = 0.1) => {
      if (!audioCtx) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(vol, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    };

    switch (type) {
      case 'tick':
        playOscillator(800, 'sine', 0.1, 0.05);
        break;
      case 'message':
        playOscillator(600, 'sine', 0.1, 0.05);
        setTimeout(() => playOscillator(800, 'sine', 0.1, 0.05), 100);
        break;
      case 'start':
        playOscillator(440, 'square', 0.2, 0.05);
        setTimeout(() => playOscillator(554, 'square', 0.2, 0.05), 200);
        setTimeout(() => playOscillator(659, 'square', 0.4, 0.05), 400);
        break;
      case 'vote':
        playOscillator(300, 'triangle', 0.2, 0.1);
        break;
      case 'eliminated':
        playOscillator(200, 'sawtooth', 0.5, 0.1);
        setTimeout(() => playOscillator(150, 'sawtooth', 0.5, 0.1), 300);
        break;
      case 'win':
        playOscillator(523.25, 'sine', 0.2, 0.1);
        setTimeout(() => playOscillator(659.25, 'sine', 0.2, 0.1), 200);
        setTimeout(() => playOscillator(783.99, 'sine', 0.2, 0.1), 400);
        setTimeout(() => playOscillator(1046.50, 'sine', 0.4, 0.1), 600);
        break;
      case 'lose':
        playOscillator(300, 'sawtooth', 0.3, 0.1);
        setTimeout(() => playOscillator(250, 'sawtooth', 0.3, 0.1), 300);
        setTimeout(() => playOscillator(200, 'sawtooth', 0.6, 0.1), 600);
        break;
    }
  } catch (e) {
    console.error("Audio play failed", e);
  }
};
