// Global audio store - persists across page navigations
// Module-level state survives Next.js client-side route changes

export type AudioState = {
  url: string;
  title: string;
  isPlaying: boolean;
};

let state: AudioState | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

export function playAudio(url: string, title: string) {
  state = { url, title, isPlaying: true };
  notify();
}

export function pauseAudio() {
  if (state) {
    state = { ...state, isPlaying: false };
    notify();
  }
}

export function resumeAudio() {
  if (state) {
    state = { ...state, isPlaying: true };
    notify();
  }
}

export function stopAudio() {
  state = null;
  notify();
}

export function getAudioState(): AudioState | null {
  return state;
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
