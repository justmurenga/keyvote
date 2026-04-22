'use client';

// Lightweight notification sound + per-user preference (localStorage).
// No audio asset needed — uses the WebAudio API to synthesize a soft two-tone
// "ding". Defaults to ON, persists user choice across sessions.

const STORAGE_KEY = 'myvote:notif-sound';

export function getSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const v = window.localStorage.getItem(STORAGE_KEY);
  if (v === null) return true; // default ON
  return v === '1';
}

export function setSoundEnabled(enabled: boolean) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0');
  window.dispatchEvent(new CustomEvent('myvote:notif-sound-changed', { detail: enabled }));
}

let cachedCtx: AudioContext | null = null;
let lastPlayed = 0;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (cachedCtx) return cachedCtx;
  const Ctor: typeof AudioContext | undefined =
    (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!Ctor) return null;
  try {
    cachedCtx = new Ctor();
    return cachedCtx;
  } catch {
    return null;
  }
}

/**
 * Play a soft two-tone notification chime. Throttled to once per ~600ms so
 * burst arrivals don't spam the user.
 */
export function playNotificationSound(force = false) {
  if (!force && !getSoundEnabled()) return;
  const now = Date.now();
  if (now - lastPlayed < 600) return;
  lastPlayed = now;

  const ctx = getCtx();
  if (!ctx) return;

  // Some browsers suspend the context until a user gesture; resume best-effort.
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});

  const tone = (freq: number, startOffset: number, duration: number, peak = 0.18) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime + startOffset);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime + startOffset);
    gain.gain.exponentialRampToValueAtTime(peak, ctx.currentTime + startOffset + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + startOffset + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime + startOffset);
    osc.stop(ctx.currentTime + startOffset + duration + 0.05);
  };

  // Pleasant "ding-ding" — A5 then E6.
  tone(880, 0.0, 0.18);
  tone(1318.5, 0.12, 0.22);
}

/**
 * Short "whoosh" confirmation played when the local user sends a message.
 * Distinct from the incoming chime — single, lower, shorter blip. Respects
 * the same user mute preference and shares the throttle window.
 */
export function playSentSound(force = false) {
  if (!force && !getSoundEnabled()) return;
  const now = Date.now();
  if (now - lastPlayed < 250) return;
  lastPlayed = now;

  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  // Quick downward chirp ~ 600Hz -> 380Hz over 110ms.
  osc.frequency.setValueAtTime(600, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(380, ctx.currentTime + 0.11);
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.14, ctx.currentTime + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.13);
  osc.connect(gain).connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.18);
}
