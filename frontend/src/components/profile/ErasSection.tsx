import { Card, SectionTitle } from '@/components/ui/Card';
import { DecadeTimeline } from '@/components/charts/DecadeTimeline';
import { Container } from '@/components/layout/Layout';
import { Reveal } from '@/components/animations/Reveal';
import { AnimatedCounter } from '@/components/animations/AnimatedCounter';
import { ButtonLink } from '@/components/ui/Button';
import { formatDecade } from '@/utils/formatters';
import type { MusicMetrics } from '@/types';

/**
 * Eras musicais: distribuicao por decada e o "ano da sua alma".
 */

export interface ErasSectionProps {
  metrics: MusicMetrics;
}

export function ErasSection({ metrics }: ErasSectionProps): JSX.Element {
  const dominant = [...metrics.decades].sort((a, b) => b.percentage - a.percentage)[0];
  const currentDecade = Math.floor(new Date().getFullYear() / 10) * 10;
  const vintageShare = metrics.decades
    .filter((decade) => decade.startYear < 2000)
    .reduce((sum, decade) => sum + decade.percentage, 0);

  return (
    <Container className="py-16 sm:py-24">
      <SectionTitle
        overline="Eras musicais"
        title="De que epoca e o seu ouvido"
        description="Distribuicao das suas faixas pelo ano de lancamento do album."
        action={
          <ButtonLink to="/decades" variant="secondary" size="sm">
            Explorar decadas
          </ButtonLink>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Reveal className="lg:col-span-2">
          <Card tone="raised" className="h-full">
            <DecadeTimeline decades={metrics.decades} />
          </Card>
        </Reveal>

        <div className="flex flex-col gap-5">
          <Reveal delay={0.1}>
            <Card tone="vibe" className="text-center">
              <p className="font-mono text-[0.625rem] uppercase tracking-[0.2em] text-chalk-muted">
                voce tem alma de
              </p>
              <p className="mt-2 font-display text-5xl font-extrabold text-vibe">
                {metrics.soulYear ? <AnimatedCounter value={metrics.soulYear} /> : '—'}
              </p>
              <p className="mt-3 text-xs leading-relaxed text-chalk-muted">
                Media dos anos de lancamento das musicas que voce escuta.
                {metrics.soulYear && metrics.soulYear < currentDecade
                  ? ' Seu ouvido mora um pouco no passado.'
                  : ' Voce escuta o que esta sendo lancado agora.'}
              </p>
            </Card>
          </Reveal>

          <Reveal delay={0.16}>
            <Card>
              <p className="mb-3 font-mono text-[0.625rem] uppercase tracking-[0.2em] text-chalk-faint">
                era dominante
              </p>

              {dominant ? (
                <>
                  <p className="font-display text-2xl font-extrabold text-chalk">
                    {formatDecade(dominant.decade)}
                  </p>
                  <p className="mt-1 font-mono text-sm tabular text-chalk-muted">
                    {dominant.percentage.toFixed(1)}% das suas faixas
                  </p>
                </>
              ) : (
                <p className="text-sm text-chalk-muted">Sem dados de lancamento suficientes.</p>
              )}

              <p className="mt-4 border-t border-white/[0.06] pt-4 text-xs leading-relaxed text-chalk-muted">
                {vintageShare >= 50
                  ? `${Math.round(vintageShare)}% do que voce ouve foi gravado antes dos anos 2000. Seu gosto tem arquivo.`
                  : vintageShare >= 20
                    ? `${Math.round(vintageShare)}% vem de antes dos anos 2000 — voce sabe cavar no catalogo antigo.`
                    : 'Quase tudo que voce escuta foi lancado neste seculo. Voce vive no presente.'}
              </p>
            </Card>
          </Reveal>
        </div>
      </div>
    </Container>
  );
}
