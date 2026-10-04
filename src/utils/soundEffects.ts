import { Platform } from 'react-native';

let ExpoAudio: any = null;
try {
  // Safe dynamic require so missing TurboModule never crashes app startup
  ExpoAudio = require('expo-av')?.Audio;
} catch {
  ExpoAudio = null;
}

/**
 * Web Audio API synthesizer for instant, crisp, zero-latency sound effects on web.
 */
function playWebChime(notes: number[], duration = 0.15) {
  try {
    if (typeof window === 'undefined') return;
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0.001, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.25, now + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + duration + 0.05);
    });
  } catch (e) {
    // AudioContext autoplay restrictions or disabled
  }
}

/**
 * Plays sound effects with sound toggle check.
 */
export const playSound = {
  /**
   * Correct Answer Chime (bright double-tone C6 -> E6).
   */
  correct: async (enabled = true) => {
    if (!enabled) return;

    if (Platform.OS === 'web') {
      playWebChime([1046.5, 1318.5], 0.22);
      return;
    }

    if (!ExpoAudio) return;

    try {
      await ExpoAudio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      // Simple clean notification tone
      const { sound } = await ExpoAudio.Sound.createAsync(
        {
          uri: 'https://assets.mixkit.co/active_storage/sfx/2874/2874-preview.mp3',
        },
        { shouldPlay: true, volume: 0.8 }
      );

      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync().catch(() => {});
        }
      });
    } catch {
      // Audio playback failsafe
    }
  },

  /**
   * Achievement / Reward Unlock Fanfare (triumphant arpeggio: C5 -> E5 -> G5 -> C6).
   */
  reward: async (enabled = true) => {
    if (!enabled) return;

    if (Platform.OS === 'web') {
      playWebChime([523.25, 659.25, 783.99, 1046.5], 0.35);
      return;
    }

    if (!ExpoAudio) return;

    try {
      await ExpoAudio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      const { sound } = await ExpoAudio.Sound.createAsync(
        {
          uri: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
        },
        { shouldPlay: true, volume: 0.9 }
      );

      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync().catch(() => {});
        }
      });
    } catch {
      // Audio playback failsafe
    }
  },
};
