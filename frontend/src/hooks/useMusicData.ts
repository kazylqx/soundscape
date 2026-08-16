import { useCallback, useEffect, useMemo } from 'react';
import { useMusicStore } from '@/stores/musicStore';
import { allTracks } from '@/utils/musicAnalyzer';
import type { MusicMetrics, MusicSnapshot, TrackLite } from '@/types';

/**
 * Carrega (uma vez) o snapshot musical e expoe o que as paginas precisam.
 *
 * O store cuida de nao disparar duas coletas simultaneas, entao chamar este
 * hook em varias telas ao mesmo tempo e seguro.
 */

export interface UseMusicDataResult {
  snapshot: MusicSnapshot | null;
  metrics: MusicMetrics | null;
  /** Todas as faixas conhecidas, sem repeticao. */
  tracks: TrackLite[];
  isLoading: boolean;
  isReady: boolean;
  error: string | null;
  /** Conta sem historico suficiente para montar o perfil. */
  notEnoughData: boolean;
  /** As features sonoras vieram estimadas (Spotify nao liberou /audio-features). */
  featuresAreEstimated: boolean;
  refresh: () => Promise<void>;
}

export function useMusicData(options: { autoLoad?: boolean } = {}): UseMusicDataResult {
  const { autoLoad = true } = options;

  const snapshot = useMusicStore((state) => state.snapshot);
  const metrics = useMusicStore((state) => state.metrics);
  const snapshotState = useMusicStore((state) => state.snapshotState);
  const snapshotError = useMusicStore((state) => state.snapshotError);
  const notEnoughData = useMusicStore((state) => state.notEnoughData);
  const loadSnapshot = useMusicStore((state) => state.loadSnapshot);

  useEffect(() => {
    if (!autoLoad) return;
    if (snapshotState === 'idle') void loadSnapshot();
  }, [autoLoad, snapshotState, loadSnapshot]);

  const refresh = useCallback(async () => {
    await loadSnapshot({ force: true });
  }, [loadSnapshot]);

  const tracks = useMemo(() => (snapshot ? allTracks(snapshot) : []), [snapshot]);

  return {
    snapshot,
    metrics,
    tracks,
    isLoading: snapshotState === 'loading' || snapshotState === 'idle',
    isReady: snapshotState === 'ready' && Boolean(snapshot),
    error: snapshotError,
    notEnoughData,
    featuresAreEstimated: snapshot?.meta.audioFeaturesUnavailable ?? false,
    refresh,
  };
}
