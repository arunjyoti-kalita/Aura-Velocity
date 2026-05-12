/**
 * Neural Sound Engine - Synthesizes mechanical sounds using Web Audio API
 * No external files required.
 */

class SoundEngine {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // A soft, premium mechanical "Thump"
  playClunk() {
    this.init();
    const { ctx } = this;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(60, now);
    osc.frequency.exponentialRampToValueAtTime(0.01, now + 0.15);
    gain.gain.setValueAtTime(0.5, now); // Increased from 0.2
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  // A sharp but quiet "Tick"
  playClick() {
    this.init();
    const { ctx } = this;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.02);
    
    gain.gain.setValueAtTime(0.2, now); // Increased from 0.05
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.02);

    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.02);
  }

  // A haptic-style vibration buzz
  playBuzz() {
    this.init();
    const { ctx } = this;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, now);
    
    gain.gain.setValueAtTime(0.3, now); // Increased from 0.05
    gain.gain.linearRampToValueAtTime(0, now + 0.15); // Longer fade

    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  playCoinDrop() {
    this.init();
    const { ctx } = this;
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(2400, now);
    osc1.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    osc1.connect(gain1).connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.2);
  }

  playIncome() {
    this.init();
    const { ctx } = this;
    const now = ctx.currentTime;
    
    // Satisfying double-chime (ATM/Credit)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now); // A5
    osc1.frequency.exponentialRampToValueAtTime(1320, now + 0.1); // E6
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    osc1.connect(gain1).connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.3);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1046.5, now + 0.08); // C6
    osc2.frequency.exponentialRampToValueAtTime(1568, now + 0.18); // G6
    gain2.gain.setValueAtTime(0.15, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
    osc2.connect(gain2).connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.4);
  }

  playExpense() {
    this.init();
    const { ctx } = this;
    const now = ctx.currentTime;
    
    // Descending metallic clink (Coin drop)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(2000, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
    
    // Secondary rattle
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1200, now + 0.05);
    gain2.gain.setValueAtTime(0.05, now + 0.05);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc2.connect(gain2).connect(ctx.destination);
    osc2.start(now + 0.05);
    osc2.stop(now + 0.1);
  }

  play(type) {
    switch (type) {
      case 'click':
      case 'success':
        this.playClick();
        break;
      case 'clunk':
      case 'error':
        this.playClunk();
        break;
      case 'buzz':
      case 'warning':
        this.playBuzz();
        break;
      case 'coin':
        this.playCoinDrop();
        break;
      case 'income':
        this.playIncome();
        break;
      case 'expense':
        this.playExpense();
        break;
      default:
        this.playClick();
    }
  }
}

export const mechanicalAudio = new SoundEngine();
