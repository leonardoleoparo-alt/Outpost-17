const AudioContextClass = window.AudioContext || window.webkitAudioContext;

export class AudioManager {
  constructor() {
    this.enabled = true;
    this.volume = 0.46;
    this.context = null;
    this.master = null;
    this.noiseBuffer = null;
    this.lastPlayed = new Map();
    this.userActivated = false;

    this.handleFirstInteraction = this.handleFirstInteraction.bind(this);
    window.addEventListener('pointerdown', this.handleFirstInteraction, { once: true, capture: true });
    window.addEventListener('keydown', this.handleFirstInteraction, { once: true, capture: true });
  }

  get available() {
    return Boolean(AudioContextClass);
  }

  handleFirstInteraction() {
    this.userActivated = true;
    this.unlock();
  }

  unlock() {
    if (!this.enabled || !this.available || !this.userActivated) return false;
    if (!this.context) this.createContext();
    if (this.context.state === 'suspended') this.context.resume().catch(() => {});
    return true;
  }

  createContext() {
    this.context = new AudioContextClass();
    this.master = this.context.createGain();
    this.master.gain.value = this.enabled ? this.volume : 0;
    this.master.connect(this.context.destination);

    const length = Math.max(1, Math.floor(this.context.sampleRate * 0.35));
    this.noiseBuffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  }

  toggle() {
    this.enabled = !this.enabled;
    if (this.enabled) {
      this.unlock();
      if (this.master && this.context) {
        const now = this.context.currentTime;
        this.master.gain.cancelScheduledValues(now);
        this.master.gain.setTargetAtTime(this.volume, now, 0.015);
      }
      this.confirm();
    } else if (this.master && this.context) {
      const now = this.context.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(0, now, 0.012);
    }
    return this.enabled;
  }

  canPlay(key, interval = 0) {
    if (!this.enabled || !this.available) return false;
    if (!this.userActivated) return false;
    this.unlock();
    if (!this.context || !this.master) return false;
    const now = this.context.currentTime;
    const last = this.lastPlayed.get(key) ?? -Infinity;
    if (now - last < interval) return false;
    this.lastPlayed.set(key, now);
    return true;
  }

  tone({ frequency = 440, endFrequency = frequency, duration = 0.08, gain = 0.08, type = 'sine', delay = 0 }) {
    if (!this.context || !this.master) return;
    const start = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const amp = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), start + duration);
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), start + 0.008);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(amp);
    amp.connect(this.master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.015);
    oscillator.onended = () => {
      oscillator.disconnect();
      amp.disconnect();
    };
  }

  noise({ duration = 0.05, gain = 0.035, frequency = 1500, delay = 0 }) {
    if (!this.context || !this.master || !this.noiseBuffer) return;
    const start = this.context.currentTime + delay;
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const amp = this.context.createGain();
    source.buffer = this.noiseBuffer;
    filter.type = 'lowpass';
    filter.frequency.value = frequency;
    amp.gain.setValueAtTime(Math.max(0.0001, gain), start);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter);
    filter.connect(amp);
    amp.connect(this.master);
    source.start(start, 0, Math.min(duration + 0.02, this.noiseBuffer.duration));
    source.stop(start + duration + 0.02);
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      amp.disconnect();
    };
  }

  towerShot(type) {
    if (!this.canPlay(`shot:${type}`, type === 'airDefense' ? 0.035 : 0.045)) return;
    if (type === 'marksman') {
      this.tone({ frequency: 180, endFrequency: 90, duration: 0.095, gain: 0.055, type: 'square' });
      this.noise({ duration: 0.06, gain: 0.035, frequency: 1000 });
    } else if (type === 'airDefense') {
      this.tone({ frequency: 420, endFrequency: 210, duration: 0.06, gain: 0.034, type: 'sawtooth' });
    } else if (type === 'scout') {
      this.tone({ frequency: 650, endFrequency: 860, duration: 0.045, gain: 0.025, type: 'sine' });
    } else {
      this.tone({ frequency: 300, endFrequency: 180, duration: 0.055, gain: 0.04, type: 'square' });
      this.noise({ duration: 0.035, gain: 0.02, frequency: 1700 });
    }
  }

  impact(killed = false) {
    if (!this.canPlay(killed ? 'kill' : 'impact', killed ? 0.055 : 0.04)) return;
    this.noise({ duration: killed ? 0.07 : 0.035, gain: killed ? 0.035 : 0.018, frequency: killed ? 1100 : 1800 });
    if (killed) this.tone({ frequency: 520, endFrequency: 760, duration: 0.075, gain: 0.026, type: 'triangle' });
  }

  baseHit() {
    if (!this.canPlay('baseHit', 0.09)) return;
    this.tone({ frequency: 115, endFrequency: 55, duration: 0.18, gain: 0.09, type: 'sawtooth' });
    this.noise({ duration: 0.12, gain: 0.05, frequency: 650 });
  }

  placement() {
    if (!this.canPlay('placement', 0.08)) return;
    this.tone({ frequency: 210, endFrequency: 145, duration: 0.07, gain: 0.045, type: 'triangle' });
    this.noise({ duration: 0.045, gain: 0.025, frequency: 900 });
  }

  upgrade() {
    if (!this.canPlay('upgrade', 0.08)) return;
    this.tone({ frequency: 440, endFrequency: 620, duration: 0.08, gain: 0.045, type: 'sine' });
    this.tone({ frequency: 620, endFrequency: 880, duration: 0.09, gain: 0.04, type: 'sine', delay: 0.075 });
  }

  sell() {
    if (!this.canPlay('sell', 0.08)) return;
    this.tone({ frequency: 760, endFrequency: 600, duration: 0.07, gain: 0.035, type: 'triangle' });
    this.tone({ frequency: 980, endFrequency: 820, duration: 0.06, gain: 0.025, type: 'triangle', delay: 0.055 });
  }

  error() {
    if (!this.canPlay('error', 0.18)) return;
    this.tone({ frequency: 170, endFrequency: 135, duration: 0.11, gain: 0.038, type: 'square' });
  }

  waveStart(finalWave = false) {
    if (!this.canPlay(finalWave ? 'finalWave' : 'waveStart', 0.25)) return;
    const base = finalWave ? 260 : 330;
    this.tone({ frequency: base, endFrequency: base * 1.18, duration: 0.11, gain: 0.045, type: 'triangle' });
    this.tone({ frequency: base * 1.35, endFrequency: base * 1.55, duration: 0.12, gain: 0.04, type: 'triangle', delay: 0.105 });
    if (finalWave) this.tone({ frequency: 145, endFrequency: 95, duration: 0.28, gain: 0.055, type: 'sawtooth', delay: 0.02 });
  }

  waveClear() {
    if (!this.canPlay('waveClear', 0.25)) return;
    this.tone({ frequency: 460, endFrequency: 580, duration: 0.08, gain: 0.04, type: 'sine' });
    this.tone({ frequency: 610, endFrequency: 760, duration: 0.1, gain: 0.04, type: 'sine', delay: 0.075 });
  }

  pause(paused) {
    if (!this.canPlay('pause', 0.1)) return;
    this.tone({ frequency: paused ? 270 : 380, endFrequency: paused ? 210 : 520, duration: 0.075, gain: 0.028, type: 'triangle' });
  }

  speed() {
    if (!this.canPlay('speed', 0.08)) return;
    this.tone({ frequency: 480, endFrequency: 650, duration: 0.055, gain: 0.025, type: 'sine' });
  }

  victory() {
    if (!this.canPlay('victory', 0.5)) return;
    [392, 494, 587, 784].forEach((frequency, index) => {
      this.tone({ frequency, endFrequency: frequency * 1.015, duration: 0.19, gain: 0.045, type: 'triangle', delay: index * 0.13 });
    });
  }

  gameOver() {
    if (!this.canPlay('gameOver', 0.5)) return;
    this.tone({ frequency: 260, endFrequency: 150, duration: 0.28, gain: 0.055, type: 'sawtooth' });
    this.tone({ frequency: 185, endFrequency: 90, duration: 0.34, gain: 0.045, type: 'triangle', delay: 0.18 });
  }

  confirm() {
    if (!this.canPlay('confirm', 0.08)) return;
    this.tone({ frequency: 520, endFrequency: 690, duration: 0.06, gain: 0.025, type: 'sine' });
  }
}
