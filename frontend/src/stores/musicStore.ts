import { create } from 'zustand';
import { ApiError, apiGet, apiPost } from '@/api/client';
import type {
  AIProfile,
  AIProfilePayload,
  MusicMetrics,
  MusicSnapshot,
  NowPlaying,
  SnapshotPayload,
  VibePalette,
} from '@/types';

/**
 * Cache dos dados musicais no cliente.
 *
 * O backend ja mantem um cache por sessao (15 min), mas guardamos aqui
 * tambem para que navegar entre paginas nao dispare requisicao nova.
 */

export type LoadState = 'idle' | 'loading' | 'ready' | 'error';

interface MusicState {
  snapshot: MusicSnapshot | null;
  metrics: MusicMetrics | null;
  aiProfile: AIProfile | null;
  palette: VibePalette | null;

  snapshotState: LoadState;
  aiState: LoadState;
  snapshotError: string | null;
  aiError: string | null;
  /** true quando o Spotify nao tem historico suficiente para o perfil. */
  notEnoughData: boolean;
  loadedAt: number | null;

  loadSnapshot: (options?: { force?: boolean }) => Promise<void>;
  loadAIProfile: (options?: { force?: boolean }) => Promise<void>;
  refreshNowPlaying: () => Promise<void>;
  setPalette: (palette: VibePalette) => void;
  reset: () => void;
}

/** Evita duas coletas simultaneas quando duas paginas montam juntas. */
let snapshotInFlight: Promise<void> | null = null;
let aiInFlight: Promise<void> | null = null;

export const useMusicStore = create<MusicState>((set, get) => ({
  snapshot: null,
  metrics: null,
  aiProfile: null,
  palette: null,

  snapshotState: 'idle',
  aiState: 'idle',
  snapshotError: null,
  aiError: null,
  notEnoughData: false,
  loadedAt: null,

  loadSnapshot: async (options = {}) => {
    const { force = false } = options;
    const current = get();

    if (!force && current.snapshotState === 'ready' && current.snapshot) return;
    if (snapshotInFlight && !force) return snapshotInFlight;

    set({ snapshotState: 'loading', snapshotError: null });

    snapshotInFlight = (async () => {
      try {
        const data = await apiGet<SnapshotPayload>('/spotify/snapshot', {
          params: force ? { refresh: 'true' } : undefined,
        });

        set({
          snapshot: data.snapshot,
          metrics: data.metrics,
          snapshotState: 'ready',
          snapshotError: null,
          notEnoughData: !data.snapshot.meta.hasEnoughData,
          loadedAt: Date.now(),
        });
      } catch (error) {
        const message =
          error instanceof ApiError
            ? error.message
            : 'Nao foi possivel carregar seus dados do Spotify.';
        set({
          snapshotState: 'error',
          snapshotError: message,
          notEnoughData: error instanceof ApiError && error.isNotEnoughData,
        });
      } finally {
        snapshotInFlight = null;
      }
    })();

    return snapshotInFlight;
  },

  loadAIProfile: async (options = {}) => {
    const { force = false } = options;
    const current = get();

    if (!force && current.aiState === 'ready' && current.aiProfile) return;
    if (aiInFlight && !force) return aiInFlight;

    set({ aiState: 'loading', aiError: null });

    aiInFlight = (async () => {
      try {
        const data = await apiPost<AIProfilePayload>('/ai/profile', { force });

        if (!data.profile) {
          set({ aiState: 'error', aiError: 'A analise nao pode ser gerada agora.' });
          return;
        }

        set({ aiProfile: data.profile, aiState: 'ready', aiError: null });
      } catch (error) {
        const message =
          error instanceof ApiError ? error.message : 'A analise de IA falhou. Tente novamente.';
        set({
          aiState: 'error',
          aiError: message,
          notEnoughData: error instanceof ApiError ? error.isNotEnoughData : get().notEnoughData,
        });
      } finally {
        aiInFlight = null;
      }
    })();

    return aiInFlight;
  },

  refreshNowPlaying: async () => {
    try {
      const data = await apiGet<{ currentlyPlaying: NowPlaying | null }>('/spotify/now-playing');
      const snapshot = get().snapshot;
      if (!snapshot) return;
      set({ snapshot: { ...snapshot, currentlyPlaying: data.currentlyPlaying } });
    } catch {
      // "Tocando agora" e um extra: falhar aqui nao afeta a pagina.
    }
  },

  setPalette: (palette) => set({ palette }),

  reset: () => {
    snapshotInFlight = null;
    aiInFlight = null;
    set({
      snapshot: null,
      metrics: null,
      aiProfile: null,
      palette: null,
      snapshotState: 'idle',
      aiState: 'idle',
      snapshotError: null,
      aiError: null,
      notEnoughData: false,
      loadedAt: null,
    });
  },
}));
