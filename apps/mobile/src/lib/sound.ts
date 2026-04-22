/**
 * Mobile parity for `apps/web/src/lib/notifications/sound.ts`.
 *
 * The web app synthesizes a soft chime via the WebAudio API. React Native
 * has no equivalent without pulling in expo-av (not currently a
 * dependency), so on mobile we deliver the same UX through a short
 * vibration burst. The user-visible *contract* is identical:
 *   - default ON
 *   - persists across launches
 *   - throttled so burst arrivals don't spam the user
 *   - exposes get/set + an event listeners can react to
 *
 * Storage uses the same logical key as the web build (`myvote:notif-sound`)
 * but is namespaced through AsyncStorage.
 */
import { Vibration, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'myvote:notif-sound';

// Tiny in-process pub/sub so screens can react to preference changes without
// pulling in EventEmitter from rn core (which adds noise to TS types).
type Listener = (enabled: boolean) => void;
const listeners = new Set<Listener>();

let cachedEnabled: boolean | null = null;
let lastPlayed = 0;

/** Synchronous read of the cached value. Returns true if not yet loaded. */
export function getSoundEnabled(): boolean {
  return cachedEnabled === null ? true : cachedEnabled;
}

/** Async load — call once on app start (e.g. from RootLayout). */
export async function initSoundPreference(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(STORAGE_KEY);
    cachedEnabled = v === null ? true : v === '1';
  } catch {
    cachedEnabled = true;
  }
  return cachedEnabled;
}

export async function setSoundEnabled(enabled: boolean): Promise<void> {
  cachedEnabled = enabled;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, enabled ? '1' : '0');
  } catch {
    /* swallow — preference is best-effort */
  }
  for (const l of listeners) {
    try {
      l(enabled);
    } catch {
      /* ignore listener errors */
    }
  }
}

export function onSoundPreferenceChanged(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Play the "incoming notification" cue. On mobile this is a short two-pulse
 * vibration (≈ 80ms + 60ms gap + 120ms) — recognisable but unobtrusive.
 * Throttled to once per ~600ms to mirror the web behaviour.
 */
export function playNotificationSound(force = false): void {
  if (!force && !getSoundEnabled()) return;
  const now = Date.now();
  if (now - lastPlayed < 600) return;
  lastPlayed = now;
  try {
    if (Platform.OS === 'ios') {
      // iOS ignores patterns; just trigger a single short vibrate.
      Vibration.vibrate();
    } else {
      Vibration.vibrate([0, 80, 60, 120]);
    }
  } catch {
    /* ignore — vibration is best-effort */
  }
}

/**
 * Cue played when the local user sends a message. Shorter / softer.
 */
export function playSentSound(force = false): void {
  if (!force && !getSoundEnabled()) return;
  const now = Date.now();
  if (now - lastPlayed < 250) return;
  lastPlayed = now;
  try {
    Vibration.vibrate(40);
  } catch {
    /* ignore */
  }
}
