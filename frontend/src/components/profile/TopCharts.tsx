import { useState } from 'react';
import { Card, SectionTitle } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { Container } from '@/components/layout/Layout';
import { Reveal } from '@/components/animations/Reveal';
import { TIME_RANGE_LABEL } from '@/utils/formatters';
import { ArtistRow } from './ArtistRow';
import { TrackRow } from './TrackRow';
import type { MusicSnapshot, SpotifyTimeRange } from '@/types';

/**
 * Top 10 artistas e musicas, com abas para os tres periodos que o Spotify
 * expoe: 4 semanas, 6 meses e "todos os tempos".
 */

const RANGES: SpotifyTimeRange[] = ['short_term', 'medium_term', 'long_term'];

export interface TopChartsProps {
  snapshot: MusicSnapshot;
}

export function TopCharts({ snapshot }: TopChartsProps): JSX.Element {
  const [range, setRange] = useState<SpotifyTimeRange>('medium_term');

  const artists = snapshot.topArtists[range].slice(0, 10);
  const tracks = snapshot.topTracks[range].slice(0, 10);

  return (
    <Container className="py-16 sm:py-24">
      <SectionTitle
        overline="Top charts"
        title="O que sustenta o seu topo"
        description="Os numeros vem direto do Spotify. Cada periodo conta uma historia diferente sobre a mesma pessoa."
        action={
          <Tabs
            items={RANGES.map((value) => ({ value, label: TIME_RANGE_LABEL[value] }))}
            value={range}
            onChange={setRange}
            layoutId="top-charts-tabs"
            size="sm"
          />
        }
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Reveal>
          <Card tone="raised" className="h-full">
            <div className="mb-4 flex items-baseline justify-between">
              <h3 className="text-base font-semibold text-chalk">Artistas</h3>
              <span className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-chalk-faint">
                {TIME_RANGE_LABEL[range]}
              </span>
            </div>

            {artists.length > 0 ? (
              <div className="-mx-2 divide-y divide-white/[0.04]">
                {artists.map((artist, index) => (
                  <ArtistRow key={artist.id} artist={artist} rank={index + 1} />
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-chalk-muted">
                O Spotify ainda nao tem dados suficientes neste periodo.
              </p>
            )}
          </Card>
        </Reveal>

        <Reveal delay={0.1}>
          <Card tone="raised" className="h-full">
            <div className="mb-4 flex items-baseline justify-between">
              <h3 className="text-base font-semibold text-chalk">Musicas</h3>
              <span className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-chalk-faint">
                preview de 30s
              </span>
            </div>

            {tracks.length > 0 ? (
              <div className="-mx-2 divide-y divide-white/[0.04]">
                {tracks.map((track, index) => (
                  <TrackRow key={track.id} track={track} rank={index + 1} />
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-chalk-muted">
                O Spotify ainda nao tem dados suficientes neste periodo.
              </p>
            )}
          </Card>
        </Reveal>
      </div>
    </Container>
  );
}
