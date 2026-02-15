// ─── Game Loop ─────────────────────────────────────────────────
// Drives the game tick via requestAnimationFrame.

import { useEffect, useRef } from 'react';
import { useGameStore } from './state';

/**
 * Custom hook: starts a rAF loop that calls store.tick(now)
 * while runStatus === 'running'. Automatically cleans up.
 */
export function useGameLoop(): void {
  const rafId = useRef<number>(0);

  useEffect(() => {
    function frame() {
      const { runStatus, tick } = useGameStore.getState();
      if (runStatus === 'running') {
        tick(Date.now());
      }
      rafId.current = requestAnimationFrame(frame);
    }

    rafId.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId.current);
  }, []);
}
