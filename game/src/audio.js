// Every sound is synthesised with WebAudio: no audio files, no network.
// Short blips and sweeps for the effects, and a quiet pentatonic music loop
// that keeps time with the run. The context is created on the first gesture,
// so a page that only loads never makes a sound, and a headless screenshot
// run never touches audio at all.
const NOTE = {
  C4: 261.63, D4: 293.66, E4: 329.63, G4: 392.0, A4: 440.0,
  C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.0,
};

// A little autumn tune, two bars of eight eighth-notes, looped.
const MELODY = [
  NOTE.E4, NOTE.G4, NOTE.A4, NOTE.G4, NOTE.E4, NOTE.D4, NOTE.C4, NOTE.D4,
  NOTE.E4, NOTE.G4, NOTE.A5, NOTE.G4, NOTE.E5, NOTE.D5, NOTE.C5, NOTE.D5,
];
const BASS = [NOTE.C4, NOTE.C4, NOTE.G4, NOTE.G4, NOTE.A4, NOTE.A4, NOTE.G4, NOTE.E4];

export function createAudio() {
  let context = null;
  let musicGain = null;
  let muted = false;
  let musicTimer = null;
  let beat = 0;

  function ensure() {
    if (context) return true;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      context = new AudioContext();
      musicGain = context.createGain();
      musicGain.gain.value = 0.05;
      musicGain.connect(context.destination);
    } catch {
      return false;
    }
    return true;
  }

  /** Unlock audio from a user gesture and start the music loop. */
  function unlock() {
    if (!ensure()) return;
    if (context.state === 'suspended') context.resume().catch(() => {});
    if (!musicTimer) {
      musicTimer = window.setInterval(() => {
        if (muted || context.state !== 'running') return;
        const step = beat % MELODY.length;
        pluck(MELODY[step], 0.16, 'triangle', musicGain);
        if (step % 2 === 0) pluck(BASS[Math.floor(beat / 2) % BASS.length], 0.3, 'sine', musicGain);
        beat += 1;
      }, 210);
    }
  }

  function tone(freq, duration, type, volume, slideTo) {
    if (!ensure() || muted || context.state !== 'running') return;
    const now = context.currentTime;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(context.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  function pluck(freq, duration, type, out) {
    if (!ensure() || muted || context.state !== 'running') return;
    const now = context.currentTime;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(out ?? context.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  return {
    unlock,
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
    jump() { tone(280, 0.18, 'sine', 0.25, 620); },
    land() { tone(140, 0.08, 'sine', 0.12, 70); },
    dash() { tone(500, 0.22, 'sawtooth', 0.12, 1400); },
    corn() { tone(880, 0.09, 'square', 0.12); window.setTimeout(() => tone(1320, 0.12, 'square', 0.12), 70); },
    golden() {
      [1046, 1318, 1568].forEach((f, i) => window.setTimeout(() => tone(f, 0.14, 'triangle', 0.16), i * 80));
    },
    feather() { tone(660, 0.3, 'triangle', 0.14, 1320); },
    hit() { tone(180, 0.25, 'sawtooth', 0.3, 60); },
    knife() { tone(1200, 0.15, 'sine', 0.1, 300); },
    throwKnife() { tone(300, 0.2, 'sawtooth', 0.1, 900); },
    gobble() {
      // The turkey's own greeting: three quick low clucks.
      [0, 120, 260].forEach((at) => window.setTimeout(() => tone(220, 0.09, 'square', 0.16, 140), at));
    },
    farmerYell() { tone(140, 0.5, 'sawtooth', 0.22, 90); },
    caught() {
      [392, 330, 262, 196].forEach((f, i) => window.setTimeout(() => tone(f, 0.3, 'triangle', 0.18), i * 160));
    },
    escaped() {
      [523, 659, 784, 1046, 1318].forEach((f, i) => window.setTimeout(() => tone(f, 0.28, 'triangle', 0.18), i * 130));
    },
  };
}
