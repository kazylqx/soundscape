import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { CoverImage } from '@/components/ui/CoverImage';
import { MoodBoardBadge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Container } from '@/components/layout/Layout';
import { formatCompact } from '@/utils/formatters';
import { hexToRgba } from '@/utils/colorExtractor';
import type { AIProfile, MusicMetrics, SessionUser, VibePalette } from '@/types';

/**
 * Hero do perfil.
 *
 * O gradiente de fundo vem das cores extraidas das capas mais ouvidas, o que
 * torna a abertura da pagina diferente para cada usuario. Tem parallax leve
 * no scroll (desativado por `prefers-reduced-motion` via CSS global).
 */

export interface ProfileHeroProps {
  user: SessionUser;
  metrics: MusicMetrics;
  profile: AIProfile | null;
  palette: VibePalette;
  aiLoading: boolean;
}

export function ProfileHero({
  user,
  metrics,
  profile,
  palette,
  aiLoading,
}: ProfileHeroProps): JSX.Element {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  });

  const backgroundY = useTransform(scrollYProgress, [0, 1], ['0%', '28%']);
  const contentY = useTransform(scrollYProgress, [0, 1], ['0%', '-12%']);
  const opacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);

  // Evita "pulo" do layout enquanto as fontes carregam.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <section
      ref={ref}
      className="relative flex min-h-[85vh] items-end overflow-hidden pb-12 pt-28 sm:min-h-[90vh] sm:pb-20"
      aria-label="Resumo do perfil"
    >
      {/* Camadas de fundo geradas da paleta do usuario */}
      <motion.div className="absolute inset-0 z-0" style={{ y: backgroundY }} aria-hidden="true">
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse 70% 55% at 20% 10%, ${hexToRgba(
              palette.primary,
              0.32,
            )}, transparent 60%),
            radial-gradient(ellipse 60% 50% at 85% 25%, ${hexToRgba(palette.secondary, 0.26)}, transparent 62%),
            radial-gradient(ellipse 80% 60% at 50% 95%, ${hexToRgba(palette.tertiary, 0.2)}, transparent 65%)`,
          }}
        />
        <div className="absolute inset-0 bg-noise opacity-[0.35] mix-blend-overlay" />
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-ink-950 to-transparent" />
      </motion.div>

      <motion.div className="relative z-10 w-full" style={{ y: contentY, opacity }}>
        <Container>
          <div className="flex flex-col gap-8 sm:gap-10">
            {/* Identificacao */}
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="relative shrink-0">
                <span
                  className="absolute inset-0 animate-pulse-ring rounded-full"
                  style={{ boxShadow: `0 0 0 2px ${hexToRgba(palette.primary, 0.5)}` }}
                  aria-hidden="true"
                />
                <CoverImage
                  src={user.imageUrl}
                  alt={user.displayName}
                  className="h-16 w-16 border-2 border-white/10 sm:h-20 sm:w-20"
                  rounded="full"
                  priority
                />
              </div>

              <div className="min-w-0">
                <p className="font-mono text-[0.6875rem] uppercase tracking-[0.24em] text-chalk-muted">
                  Perfil musical de
                </p>
                <h1 className="truncate font-display text-2xl font-extrabold text-chalk sm:text-3xl">
                  {user.displayName}
                </h1>
                <p className="mt-1 font-mono text-xs text-chalk-faint">
                  {formatCompact(metrics.uniqueTracks)} musicas ·{' '}
                  {formatCompact(metrics.uniqueArtists)} artistas ·{' '}
                  {metrics.totalDistinctGenres} generos
                </p>
              </div>
            </div>

            {/* Headline da IA */}
            <div className="max-w-4xl">
              {aiLoading && !profile ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full sm:h-14" rounded="sm" />
                  <Skeleton className="h-10 w-4/5 sm:h-14" rounded="sm" />
                </div>
              ) : (
                <motion.h2
                  className="text-display-lg font-extrabold"
                  initial={{ opacity: 0, y: 20 }}
                  animate={mounted ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                >
                  <span className="text-vibe">
                    {profile?.headline ?? metrics.persona.name}
                  </span>
                </motion.h2>
              )}
            </div>

            {/* Persona + moodboard */}
            <div className="flex flex-col gap-5">
              <div className="inline-flex w-fit items-center gap-2.5 rounded-full border border-white/12 bg-ink-900/60 py-2 pl-3 pr-4 backdrop-blur-xl">
                <Sparkles className="h-4 w-4 text-vibe-primary" aria-hidden="true" />
                <span className="text-sm font-semibold text-chalk">
                  {profile?.persona ?? metrics.persona.name}
                </span>
              </div>

              {profile?.moodBoard && profile.moodBoard.length > 0 ? (
                <motion.div
                  className="flex flex-wrap gap-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                >
                  {profile.moodBoard.map((word, index) => (
                    <MoodBoardBadge key={`${word}-${index}`} word={word} index={index} />
                  ))}
                </motion.div>
              ) : aiLoading ? (
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Skeleton key={index} className="h-10 w-24" rounded="full" />
                  ))}
                </div>
              ) : null}
            </div>

            {/* Amostra da paleta extraida */}
            <div className="flex items-center gap-3">
              <span className="font-mono text-[0.625rem] uppercase tracking-[0.2em] text-chalk-faint">
                sua paleta
              </span>
              <div className="flex gap-1.5">
                {palette.swatches.slice(0, 5).map((color, index) => (
                  <span
                    key={`${color}-${index}`}
                    className="h-4 w-8 rounded-full border border-white/10"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          </div>
        </Container>
      </motion.div>
    </section>
  );
}
