import { Card, SectionTitle, StatCard } from '@/components/ui/Card';
import { GenreBadge } from '@/components/ui/Badge';
import { GenreBubbles } from '@/components/charts/GenreBubbles';
import { Container } from '@/components/layout/Layout';
import { Reveal } from '@/components/animations/Reveal';
import { AnimatedCounter } from '@/components/animations/AnimatedCounter';
import { formatGenre } from '@/utils/formatters';
import type { MusicMetrics } from '@/types';

/**
 * Mapa de generos: treemap proporcional + leitura de amplitude.
 */

export interface GenresSectionProps {
  metrics: MusicMetrics;
}

export function GenresSection({ metrics }: GenresSectionProps): JSX.Element {
  const top = metrics.genres.slice(0, 3);
  const dominance = top[0]?.percentage ?? 0;

  return (
    <Container className="py-16 sm:py-24">
      <SectionTitle
        overline="Generos"
        title="O mapa do seu territorio sonoro"
        description="A area de cada bloco e proporcional a presenca do genero entre os seus artistas mais ouvidos."
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Reveal className="lg:col-span-2">
          <Card tone="raised" padded={false} className="h-full p-4 sm:p-5">
            <GenreBubbles genres={metrics.genres} limit={14} height={400} />
          </Card>
        </Reveal>

        <div className="flex flex-col gap-5">
          <Reveal delay={0.1}>
            <StatCard
              label="Generos distintos"
              value={<AnimatedCounter value={metrics.totalDistinctGenres} />}
              hint={
                metrics.totalDistinctGenres >= 25
                  ? 'Amplitude bem acima da media — voce circula muito.'
                  : metrics.totalDistinctGenres >= 12
                    ? 'Variedade saudavel, com territorio definido.'
                    : 'Gosto concentrado: voce sabe exatamente onde mora.'
              }
            />
          </Reveal>

          <Reveal delay={0.16}>
            <Card>
              <p className="mb-4 font-mono text-[0.625rem] uppercase tracking-[0.2em] text-chalk-faint">
                seu podio
              </p>

              <ol className="space-y-4">
                {top.map((genre, index) => (
                  <li key={genre.genre} className="flex items-start gap-3">
                    <span className="mt-0.5 w-5 shrink-0 font-mono text-sm tabular text-vibe-primary">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-chalk">
                        {formatGenre(genre.genre)}
                      </p>
                      <p className="font-mono text-xs tabular text-chalk-muted">
                        {genre.percentage.toFixed(1)}% do seu gosto
                      </p>
                    </div>
                  </li>
                ))}
              </ol>

              <p className="mt-5 border-t border-white/[0.06] pt-4 text-xs leading-relaxed text-chalk-muted">
                {dominance >= 35
                  ? `${formatGenre(top[0]?.genre ?? '')} domina com folga. Voce tem uma casa e volta sempre para ela.`
                  : dominance >= 18
                    ? 'Existe um genero principal, mas ele divide espaco. Voce transita.'
                    : 'Nenhum genero manda sozinho — seu gosto e uma colcha de retalhos bem costurada.'}
              </p>
            </Card>
          </Reveal>

          <Reveal delay={0.22}>
            <Card>
              <p className="mb-3 font-mono text-[0.625rem] uppercase tracking-[0.2em] text-chalk-faint">
                tambem no seu radar
              </p>
              <div className="flex flex-wrap gap-1.5">
                {metrics.genres.slice(3, 15).map((genre) => (
                  <GenreBadge key={genre.genre} genre={genre.genre} />
                ))}
              </div>
            </Card>
          </Reveal>
        </div>
      </div>
    </Container>
  );
}
