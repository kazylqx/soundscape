import { Quote, RefreshCw, Sparkles, UserRound } from 'lucide-react';
import { Card, SectionTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { SkeletonText, SkeletonWithMessage } from '@/components/ui/Skeleton';
import { Reveal } from '@/components/animations/Reveal';
import { Container } from '@/components/layout/Layout';
import type { AIProfile, MusicMetrics } from '@/types';

/**
 * Identidade: biografia da IA, persona, citacao compartilhavel e
 * comparacao com um artista famoso.
 */

export interface IdentitySectionProps {
  profile: AIProfile | null;
  metrics: MusicMetrics;
  loading: boolean;
  isFallback: boolean;
  loadingMessage: string;
  onRegenerate: () => void;
}

export function IdentitySection({
  profile,
  metrics,
  loading,
  isFallback,
  loadingMessage,
  onRegenerate,
}: IdentitySectionProps): JSX.Element {
  return (
    <Container className="py-16 sm:py-24">
      <SectionTitle
        overline="Identidade"
        title="Quem voce e quando ninguem esta ouvindo"
        description="Leitura gerada a partir dos seus dados reais de escuta — artistas, generos, horarios e metricas sonoras."
        action={
          profile && !loading ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRegenerate}
              iconLeft={<RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}
            >
              Gerar de novo
            </Button>
          ) : null
        }
      />

      {loading && !profile ? (
        <SkeletonWithMessage message={loadingMessage} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-5">
          {/* Biografia */}
          <Reveal className="lg:col-span-3">
            <Card tone="raised" className="h-full">
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06] text-vibe-primary">
                  <UserRound className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-base font-semibold text-chalk">Sua biografia sonora</h3>
                  {isFallback ? (
                    <p className="text-xs text-chalk-faint">
                      Gerada localmente a partir das metricas
                    </p>
                  ) : null}
                </div>
              </div>

              {profile ? (
                <p className="text-[0.9375rem] leading-relaxed text-chalk-soft sm:text-base sm:leading-loose">
                  {profile.biography}
                </p>
              ) : (
                <SkeletonText lines={5} />
              )}

              {profile?.strengths && profile.strengths.length > 0 ? (
                <div className="mt-6">
                  <p className="mb-3 font-mono text-[0.625rem] uppercase tracking-[0.2em] text-chalk-faint">
                    pontos fortes
                  </p>
                  <ul className="space-y-2.5">
                    {profile.strengths.map((strength, index) => (
                      <li key={index} className="flex gap-3 text-sm text-chalk-soft">
                        <span
                          className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-vibe-primary"
                          aria-hidden="true"
                        />
                        {strength}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </Card>
          </Reveal>

          {/* Coluna lateral */}
          <div className="flex flex-col gap-5 lg:col-span-2">
            <Reveal delay={0.1}>
              <Card tone="vibe">
                <div className="mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-vibe-primary" aria-hidden="true" />
                  <p className="font-mono text-[0.625rem] uppercase tracking-[0.2em] text-chalk-muted">
                    seu arquetipo
                  </p>
                </div>

                <p className="font-display text-2xl font-extrabold leading-tight text-chalk">
                  {profile?.persona ?? metrics.persona.name}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-chalk-muted">
                  {profile?.personaDescription ?? metrics.persona.description}
                </p>

                {metrics.persona.evidence.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {metrics.persona.evidence.map((item, index) => (
                      <Badge key={index} variant="neutral" className="font-mono">
                        {item}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </Card>
            </Reveal>

            <Reveal delay={0.16}>
              <Card>
                <Quote className="mb-3 h-5 w-5 text-vibe-tertiary" aria-hidden="true" />
                <blockquote className="font-display text-lg font-bold leading-snug text-chalk sm:text-xl">
                  “{profile?.shareableQuote ?? metrics.persona.name}”
                </blockquote>
                <p className="mt-3 font-mono text-[0.625rem] uppercase tracking-[0.2em] text-chalk-faint">
                  pronto para compartilhar
                </p>
              </Card>
            </Reveal>

            <Reveal delay={0.22}>
              <Card>
                <p className="mb-2 font-mono text-[0.625rem] uppercase tracking-[0.2em] text-chalk-faint">
                  afinidade
                </p>
                <p className="text-sm leading-relaxed text-chalk-soft">
                  {profile?.musicianComparison ??
                    `Voce se daria bem numa conversa sobre discos com ${
                      metrics.genres[0]?.genre ?? 'gente do seu genero favorito'
                    }.`}
                </p>
              </Card>
            </Reveal>
          </div>
        </div>
      )}
    </Container>
  );
}
