import { Eye, Film, Palette, Sparkles, TrendingUp } from 'lucide-react';
import type { ReactNode } from 'react';
import { Card, SectionTitle } from '@/components/ui/Card';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { Container } from '@/components/layout/Layout';
import { Stagger, StaggerItem } from '@/components/animations/Reveal';
import type { AIProfile } from '@/types';

/**
 * Curiosidades da IA: traco oculto, peculiaridades, trilha sonora da vida,
 * paleta em palavras e nota de evolucao do gosto.
 */

export interface AICuriositiesProps {
  profile: AIProfile | null;
  loading: boolean;
}

interface Curiosity {
  icon: ReactNode;
  label: string;
  text: string;
  accent: string;
}

export function AICuriosities({ profile, loading }: AICuriositiesProps): JSX.Element {
  const curiosities: Curiosity[] = profile
    ? [
        {
          icon: <Eye className="h-4 w-4" aria-hidden="true" />,
          label: 'Traco oculto',
          text: profile.hiddenTrait,
          accent: 'text-accent-violet',
        },
        {
          icon: <Film className="h-4 w-4" aria-hidden="true" />,
          label: 'Trilha da sua vida',
          text: profile.filmSoundtrack,
          accent: 'text-accent-cyan',
        },
        {
          icon: <Palette className="h-4 w-4" aria-hidden="true" />,
          label: 'Sua vibe em cores',
          text: profile.colorMood,
          accent: 'text-accent-pink',
        },
        {
          icon: <TrendingUp className="h-4 w-4" aria-hidden="true" />,
          label: 'Como seu gosto mudou',
          text: profile.evolutionNote,
          accent: 'text-accent-amber',
        },
        ...profile.quirks.map((quirk, index) => ({
          icon: <Sparkles className="h-4 w-4" aria-hidden="true" />,
          label: `Peculiaridade ${index + 1}`,
          text: quirk,
          accent: 'text-spotify-bright',
        })),
      ]
    : [];

  return (
    <Container className="py-16 sm:py-24">
      <SectionTitle
        overline="Curiosidades"
        title="O que os dados revelaram sem voce pedir"
        description="Observacoes derivadas dos numeros da sua conta — algumas obvias, outras nem tanto."
      />

      {loading && !profile ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      ) : (
        <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {curiosities.map((curiosity, index) => (
            <StaggerItem key={`${curiosity.label}-${index}`}>
              <Card interactive className="h-full">
                <div className="mb-3 flex items-center gap-2.5">
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.06] ${curiosity.accent}`}
                  >
                    {curiosity.icon}
                  </span>
                  <p className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-chalk-faint">
                    {curiosity.label}
                  </p>
                </div>
                <p className="text-sm leading-relaxed text-chalk-soft">{curiosity.text}</p>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </Container>
  );
}
