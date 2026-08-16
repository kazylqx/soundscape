import { useEffect, useRef } from 'react';
import { useMusicStore } from '@/stores/musicStore';
import { applyPalette, DEFAULT_PALETTE, extractPalette } from '@/utils/colorExtractor';
import { paletteSourceImages } from '@/utils/musicAnalyzer';
import type { VibePalette } from '@/types';

/**
 * Tema dinamico do usuario.
 *
 * Extrai as cores dominantes das capas/fotos mais ouvidas e injeta em
 * `--vibe-primary/secondary/tertiary`, que alimentam os gradientes, bordas
 * e acentos do perfil (classes `vibe-*` e utilitarios `.text-vibe`).
 */

export interface UseThemeResult {
  palette: VibePalette;
  isDefault: boolean;
}

export function useTheme(): UseThemeResult {
  const snapshot = useMusicStore((state) => state.snapshot);
  const palette = useMusicStore((state) => state.palette);
  const setPalette = useMusicStore((state) => state.setPalette);

  // Garante uma unica extracao por conjunto de imagens.
  const extractedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!snapshot) return;

    const images = paletteSourceImages(snapshot);
    if (images.length === 0) return;

    const signature = images.join('|');
    if (extractedFor.current === signature) return;
    extractedFor.current = signature;

    let cancelled = false;

    void extractPalette(images)
      .then((result) => {
        if (cancelled) return;
        setPalette(result);
      })
      .catch(() => {
        if (cancelled) return;
        setPalette(DEFAULT_PALETTE);
      });

    return () => {
      cancelled = true;
    };
  }, [snapshot, setPalette]);

  // Aplica no :root sempre que a paleta mudar.
  useEffect(() => {
    applyPalette(palette ?? DEFAULT_PALETTE);
  }, [palette]);

  return {
    palette: palette ?? DEFAULT_PALETTE,
    isDefault: !palette,
  };
}

/** Aplica uma paleta especifica dentro de um container (usado nos cards). */
export function useScopedPalette(
  ref: React.RefObject<HTMLElement>,
  palette: VibePalette | null | undefined,
): void {
  useEffect(() => {
    if (!ref.current || !palette) return;
    applyPalette(palette, ref.current);
  }, [ref, palette]);
}
