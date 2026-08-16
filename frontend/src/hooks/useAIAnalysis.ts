import { useCallback, useEffect, useState } from 'react';
import { useMusicStore } from '@/stores/musicStore';
import type { AIProfile } from '@/types';

/**
 * Perfil gerado pela IA.
 *
 * A geracao e lenta (dezenas de segundos), por isso o hook tambem entrega
 * uma mensagem rotativa para o skeleton nao parecer travado.
 */

const LOADING_MESSAGES = [
  'Ouvindo tudo o que voce ouviu...',
  'Cruzando 50 artistas com 3 periodos de tempo...',
  'Medindo energia, valencia e uma pitada de saudade...',
  'Procurando o padrao que voce nao sabia que tinha...',
  'Separando os hits das confissoes...',
  'Traduzindo BPM em personalidade...',
  'Calculando quantas vezes voce repetiu aquela musica...',
  'Escrevendo sua biografia sonora...',
  'Escolhendo as cores da sua vibe...',
  'Quase pronto — revisando as ultimas frases...',
];

export interface UseAIAnalysisResult {
  profile: AIProfile | null;
  isLoading: boolean;
  isReady: boolean;
  error: string | null;
  /** Mensagem rotativa para exibir durante o loading. */
  loadingMessage: string;
  /** true = perfil deterministico porque a IA nao estava disponivel. */
  isFallback: boolean;
  generate: () => Promise<void>;
  regenerate: () => Promise<void>;
}

export function useAIAnalysis(options: { autoLoad?: boolean } = {}): UseAIAnalysisResult {
  const { autoLoad = true } = options;

  const profile = useMusicStore((state) => state.aiProfile);
  const aiState = useMusicStore((state) => state.aiState);
  const aiError = useMusicStore((state) => state.aiError);
  const loadAIProfile = useMusicStore((state) => state.loadAIProfile);

  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (!autoLoad) return;
    if (aiState === 'idle') void loadAIProfile();
  }, [autoLoad, aiState, loadAIProfile]);

  // Troca a mensagem a cada 2s enquanto a IA trabalha.
  useEffect(() => {
    if (aiState !== 'loading') return;

    const timer = window.setInterval(() => {
      setMessageIndex((current) => (current + 1) % LOADING_MESSAGES.length);
    }, 2000);

    return () => window.clearInterval(timer);
  }, [aiState]);

  const generate = useCallback(async () => {
    await loadAIProfile();
  }, [loadAIProfile]);

  const regenerate = useCallback(async () => {
    await loadAIProfile({ force: true });
  }, [loadAIProfile]);

  return {
    profile,
    isLoading: aiState === 'loading' || aiState === 'idle',
    isReady: aiState === 'ready' && Boolean(profile),
    error: aiError,
    loadingMessage: LOADING_MESSAGES[messageIndex] ?? LOADING_MESSAGES[0] ?? '',
    isFallback: profile?.fallback ?? false,
    generate,
    regenerate,
  };
}

export { LOADING_MESSAGES };
