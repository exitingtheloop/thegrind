// ─── Background Music (singleton) ──────────────────────────────
// Starts on first user interaction (click/touch/keydown).
// Persists across component unmounts via module-level Audio element.
// Returns { muted, toggleMute } for UI control.

import { useState, useEffect, useCallback } from 'react';
import bgmLoop from '../assets/bgm-loop.mp3';

let audio: HTMLAudioElement | null = null;
let started = false;
let globalMuted = false;

function ensureAudio(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio(bgmLoop);
    audio.loop = true;
    audio.volume = 0.25;
  }
  return audio;
}

function tryStart() {
  if (started) return;
  const a = ensureAudio();
  a.play()
    .then(() => {
      started = true;
    })
    .catch(() => {
      // Browser blocked — will retry on next interaction
    });
}

/**
 * Call once at the App level. Attaches a one-time interaction
 * listener to start music, and provides mute/unmute control.
 */
export function useBackgroundMusic() {
  const [muted, setMuted] = useState(globalMuted);

  // Attach one-time listeners to start music on first interaction
  useEffect(() => {
    const handler = () => {
      tryStart();
      if (started) {
        // Clean up listeners once music is playing
        document.removeEventListener('click', handler, true);
        document.removeEventListener('touchstart', handler, true);
        document.removeEventListener('keydown', handler, true);
      }
    };

    document.addEventListener('click', handler, true);
    document.addEventListener('touchstart', handler, true);
    document.addEventListener('keydown', handler, true);

    return () => {
      document.removeEventListener('click', handler, true);
      document.removeEventListener('touchstart', handler, true);
      document.removeEventListener('keydown', handler, true);
    };
  }, []);

  const toggleMute = useCallback(() => {
    const a = ensureAudio();
    globalMuted = !globalMuted;
    a.muted = globalMuted;
    setMuted(globalMuted);
  }, []);

  return { muted, toggleMute };
}
