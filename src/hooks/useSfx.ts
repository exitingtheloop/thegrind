// ─── Sound Effects (fire-and-forget) ───────────────────────────
import sfxLbModal from '../assets/lb-modal.mp3';
import sfxLeaderAlert from '../assets/leader-alert.mp3';
import sfxUpgrade from '../assets/upgrade.mp3';
import sfxPowerup from '../assets/powerup.mp3';
import sfxBtnClick from '../assets/btn-click.mp3';
import sfxTap from '../assets/tap-sound.mp3';

const cache: Record<string, HTMLAudioElement> = {};

function play(src: string, volume = 0.5) {
  // Re-use cached element if it exists, clone for overlapping plays
  if (!cache[src]) {
    cache[src] = new Audio(src);
  }
  const a = cache[src].cloneNode() as HTMLAudioElement;
  a.volume = volume;
  a.play().catch(() => {});
}

// Single-instance tap sound — restarts instead of cloning to avoid overlap
let tapAudio: HTMLAudioElement | null = null;
function playTap() {
  if (!tapAudio) {
    tapAudio = new Audio(sfxTap);
    tapAudio.volume = 0.2;
  }
  tapAudio.currentTime = 0;
  tapAudio.play().catch(() => {});
}

export const sfx = {
  lbModal:      () => play(sfxLbModal, 0.4),
  leaderAlert:  () => play(sfxLeaderAlert, 0.5),
  upgrade:      () => play(sfxUpgrade, 0.45),
  powerup:      () => play(sfxPowerup, 0.45),
  btnClick:     () => play(sfxBtnClick, 0.35),
  tap:          playTap,
};
