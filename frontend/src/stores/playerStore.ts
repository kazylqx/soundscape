import { create } from 'zustand';
import type { TrackLite } from '@/types';

/**
 * Mini-player global de preview (30s).
 *
 * O elemento <audio> vive fora do React, num singleton do modulo, para que o
 * som continue tocando durante as trocas de rota. O estado no Zustand serve
 * apenas para a UI refletir o que o audio esta fazendo.
 *
 * Tracks sem `preview_url` nunca chegam aqui — a UI mostra
 * "Abrir no Spotify" nesses casos.
 */

export interface PlayerTrack {
  id: string;
  name: string;
  artist: string;
  albumImage: string | null;
  previewUrl: string;
  spotifyUrl: string;
}

interface PlayerState {
  track: PlayerTrack | null;
  isPlaying: boolean;
  /** Progresso em segundos. */
  progress: number;
  duration: number;
  volume: number;
  muted: boolean;
  loading: boolean;
  error: string | null;

  play: (track: PlayerTrack) => void;
  toggle: () => void;
  pause: () => void;
  stop: () => void;
  seek: (seconds: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
}

/** Converte uma TrackLite em item do player. Retorna null sem preview. */
export function toPlayerTrack(track: TrackLite): PlayerTrack | null {
  if (!track.previewUrl) return null;
  return {
    id: track.id,
    name: track.name,
    artist: track.artistNames.join(', '),
    albumImage: track.albumImage,
    previewUrl: track.previewUrl,
    spotifyUrl: track.spotifyUrl,
  };
}

const VOLUME_KEY = 'soundscape.volume';

function readStoredVolume(): number {
  try {
    const raw = window.localStorage.getItem(VOLUME_KEY);
    if (!raw) return 0.7;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : 0.7;
  } catch {
    return 0.7;
  }
}

let audio: HTMLAudioElement | null = null;

/** Cria (uma vez) o elemento de audio e liga os listeners no store. */
function ensureAudio(set: (partial: Partial<PlayerState>) => void, get: () => PlayerState): HTMLAudioElement {
  if (audio) return audio;

  audio = new Audio();
  audio.preload = 'none';
  audio.volume = get().volume;

  audio.addEventListener('loadedmetadata', () => {
    set({ duration: Number.isFinite(audio?.duration ?? NaN) ? (audio?.duration ?? 30) : 30 });
  });

  audio.addEventListener('timeupdate', () => {
    set({ progress: audio?.currentTime ?? 0 });
  });

  audio.addEventListener('playing', () => set({ isPlaying: true, loading: false, error: null }));
  audio.addEventListener('pause', () => set({ isPlaying: false }));
  audio.addEventListener('waiting', () => set({ loading: true }));

  audio.addEventListener('ended', () => {
    set({ isPlaying: false, progress: 0 });
  });

  audio.addEventListener('error', () => {
    set({
      isPlaying: false,
      loading: false,
      error: 'Nao foi possivel tocar este preview.',
    });
  });

  return audio;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  track: null,
  isPlaying: false,
  progress: 0,
  duration: 30,
  volume: readStoredVolume(),
  muted: false,
  loading: false,
  error: null,

  play: (track) => {
    const element = ensureAudio(set, get);
    const current = get();

    // Mesma track: alterna play/pause em vez de recarregar.
    if (current.track?.id === track.id) {
      if (current.isPlaying) {
        element.pause();
        return;
      }
      void element.play().catch(() => {
        set({ isPlaying: false, error: 'O navegador bloqueou a reproducao automatica.' });
      });
      return;
    }

    set({ track, progress: 0, loading: true, error: null, isPlaying: false });

    element.src = track.previewUrl;
    element.currentTime = 0;
    element.volume = current.muted ? 0 : current.volume;

    void element.play().catch(() => {
      set({
        isPlaying: false,
        loading: false,
        error: 'O navegador bloqueou a reproducao. Toque de novo para ouvir.',
      });
    });
  },

  toggle: () => {
    const element = audio;
    const { track, isPlaying } = get();
    if (!element || !track) return;

    if (isPlaying) {
      element.pause();
      return;
    }
    void element.play().catch(() => set({ isPlaying: false }));
  },

  pause: () => {
    audio?.pause();
  },

  stop: () => {
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }
    set({ track: null, isPlaying: false, progress: 0, loading: false, error: null });
  },

  seek: (seconds) => {
    if (!audio) return;
    const duration = get().duration || 30;
    const target = Math.min(Math.max(0, seconds), duration);
    audio.currentTime = target;
    set({ progress: target });
  },

  setVolume: (volume) => {
    const clamped = Math.min(1, Math.max(0, volume));
    if (audio) audio.volume = clamped;
    try {
      window.localStorage.setItem(VOLUME_KEY, String(clamped));
    } catch {
      /* noop */
    }
    set({ volume: clamped, muted: clamped === 0 });
  },

  toggleMute: () => {
    const { muted, volume } = get();
    const next = !muted;
    if (audio) audio.volume = next ? 0 : volume;
    set({ muted: next });
  },
}));

/** Seletor util: a track passada esta tocando agora? */
export function useIsTrackPlaying(trackId: string | null | undefined): boolean {
  return usePlayerStore((state) => Boolean(trackId) && state.track?.id === trackId && state.isPlaying);
}
