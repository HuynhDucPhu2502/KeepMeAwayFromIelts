"use client";

// Zero-asset synthesized game sound effects using the Web Audio API.
// Safe no-op in SSR or browsers without AudioContext; mute preference persists in localStorage.
const SFX_KEY = "kmafi:sfx:v1";
const SFX_EVENT = "kmafi:sfx";

let audioCtx: AudioContext | null = null;

export function isSfxEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(SFX_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSfxEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SFX_KEY, enabled ? "on" : "off");
    window.dispatchEvent(new Event(SFX_EVENT));
  } catch {
    // Ignore private-mode storage errors
  }
}

export function toggleSfx(): boolean {
  const next = !isSfxEnabled();
  setSfxEnabled(next);
  if (next) playTone(587.33, 0.08, "triangle", 0.09);
  return next;
}

export function subscribeSfx(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  window.addEventListener(SFX_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(SFX_EVENT, callback);
  };
}

function getContext(): AudioContext | null {
  if (typeof window === "undefined" || !isSfxEnabled()) return null;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) {
    try {
      audioCtx = new Ctor();
    } catch {
      return null;
    }
  }
  if (audioCtx.state === "suspended") {
    void audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function playTone(
  freq: number,
  duration: number,
  type: OscillatorType = "triangle",
  gainPeak = 0.08,
  delay = 0,
  endFreq?: number,
): void {
  const ctx = getContext();
  if (!ctx) return;
  try {
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (endFreq && endFreq > 0) {
      osc.frequency.exponentialRampToValueAtTime(endFreq, start + duration);
    }
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(gainPeak, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  } catch {
    // Ignore autoplay restrictions before first user gesture
  }
}

/** Crisp tactile mechanical keycap click (short, gentle, non-fatiguing). */
export function playKey(): void {
  playTone(620, 0.024, "triangle", 0.032, 0, 260);
}

// Pentatonic semitone offsets so consecutive combos sound musically ascending.
const COMBO_SEMITONES = [0, 2, 4, 7, 9, 12, 14, 16];

/** Bright chime that rises along a warm pentatonic scale with combo count. */
export function playSuccess(combo = 1): void {
  const step = COMBO_SEMITONES[Math.min(Math.max(0, combo - 1), COMBO_SEMITONES.length - 1)];
  const base = 523.25 * Math.pow(2, step / 12); // C5 root
  playTone(base, 0.11, "triangle", 0.085, 0);
  playTone(base * 1.5, 0.14, "sine", 0.055, 0.045);
}

/** Soft low woody thud for wrong answers, typos, or missed words. */
export function playError(): void {
  playTone(210, 0.12, "sawtooth", 0.055, 0, 145);
  playTone(165, 0.14, "triangle", 0.06, 0.04, 120);
}

/** Warm two-note chime when catching a +1 life heart word. */
export function playHeart(): void {
  playTone(587.33, 0.11, "sine", 0.09, 0); // D5
  playTone(880, 0.18, "triangle", 0.095, 0.07); // A5
}

/** Celebratory arpeggio when defeating a Boss word wave. */
export function playBossDefeat(): void {
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
  notes.forEach((n, i) => playTone(n, 0.16, "triangle", 0.09, i * 0.065));
}

/** Sparkling triad when activating Fever Mode x2. */
export function playFever(): void {
  const notes = [659.25, 830.61, 987.77, 1318.51]; // E5 G#5 B5 E6
  notes.forEach((n, i) => playTone(n, 0.13, "sine", 0.08, i * 0.045));
}

/** Subtle countdown tick for urgent final seconds. */
export function playTick(): void {
  playTone(880, 0.035, "sine", 0.04, 0, 660);
}

/** Gentle closing cadence on round complete / game over. */
export function playGameOver(win = false): void {
  if (win) {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, i) => playTone(n, 0.18, "triangle", 0.085, i * 0.08));
  } else {
    const notes = [392, 329.63, 261.63]; // G4 E4 C4
    notes.forEach((n, i) => playTone(n, 0.18, "triangle", 0.075, i * 0.1));
  }
}
