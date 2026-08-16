import { forwardRef } from 'react';
import { CARD_SIZES, CardFrame, CardOverline, CardPill, CardStat, CardTitle } from './CardFrame';
import type { CardTokens } from './CardFrame';
import { hexToRgba } from '@/utils/colorExtractor';
import {
  FEATURE_LABEL,
  MOOD_LABEL,
  formatCompact,
  formatDecade,
  formatGenre,
  formatHour,
  formatNumber,
  periodOfDay,
} from '@/utils/formatters';
import type {
  AIProfile,
  CardFormat,
  CardTheme,
  MusicMetrics,
  MusicSnapshot,
  ShareCardId,
  VibePalette,
} from '@/types';

/**
 * Os 8 cards de compartilhamento.
 *
 * Regras de construcao (impostas pelo html2canvas):
 *  - estilos inline com cores solidas/rgba, sem classes utilitarias com
 *    color-mix() ou backdrop-filter
 *  - imagens com crossOrigin="anonymous" para nao contaminar o canvas
 *  - nenhum texto dependendo de fonte que possa nao ter carregado
 */

export interface ShareCardData {
  snapshot: MusicSnapshot;
  metrics: MusicMetrics;
  profile: AIProfile | null;
  palette: VibePalette;
}

export interface ShareCardProps extends ShareCardData {
  cardId: ShareCardId;
  theme: CardTheme;
  format: CardFormat;
}

export const SHARE_CARDS: Array<{ id: ShareCardId; title: string; description: string }> = [
  {
    id: 'profile',
    title: 'Perfil musical',
    description: 'Artista #1, generos e persona em um card so.',
  },
  { id: 'top-artists', title: 'Top 5 artistas', description: 'Grid com as fotos de quem manda.' },
  { id: 'top-tracks', title: 'Top 5 musicas', description: 'A lista que define o seu momento.' },
  { id: 'radar', title: 'Radar sonoro', description: 'As cinco metricas da sua assinatura.' },
  { id: 'era', title: 'Minha era musical', description: 'Sua distribuicao por decada.' },
  {
    id: 'secret-listener',
    title: 'Ouvinte secreto',
    description: 'Horario de pico e o humor da madrugada.',
  },
  { id: 'stats', title: 'Stats gerais', description: 'Os numeros que resumem o seu ano.' },
  { id: 'ai-verdict', title: 'A IA me definiu', description: 'Headline e arquetipo, sem filtro.' },
];

/* ============================================================
 * Helpers visuais
 * ============================================================ */

function CoverImg({
  src,
  alt,
  size,
  radius = 10,
  tokens,
}: {
  src: string | null;
  alt: string;
  size: number;
  radius?: number;
  tokens: CardTokens;
}): JSX.Element {
  if (!src) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: tokens.surface,
          border: `1px solid ${tokens.border}`,
        }}
        role="img"
        aria-label={alt}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      crossOrigin="anonymous"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        objectFit: 'cover',
        display: 'block',
      }}
    />
  );
}

/**
 * Radar desenhado a mao em SVG.
 * Nao usamos o Recharts aqui: um SVG estatico garante que a exportacao
 * saia identica ao preview, sem depender do ciclo de animacao.
 */
function SvgRadar({
  values,
  size,
  tokens,
}: {
  values: Array<{ label: string; value: number }>;
  size: number;
  tokens: CardTokens;
}): JSX.Element {
  const center = size / 2;
  const radius = size / 2 - 26;
  const count = values.length;

  const pointAt = (index: number, ratio: number) => {
    const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
    return {
      x: center + Math.cos(angle) * radius * ratio,
      y: center + Math.sin(angle) * radius * ratio,
    };
  };

  const polygon = values
    .map((entry, index) => {
      const point = pointAt(index, Math.max(0.04, entry.value));
      return `${point.x.toFixed(1)},${point.y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg width={size} height={size} aria-hidden="true">
      {/* aneis de referencia */}
      {[0.25, 0.5, 0.75, 1].map((ratio) => (
        <polygon
          key={ratio}
          points={values
            .map((_, index) => {
              const point = pointAt(index, ratio);
              return `${point.x.toFixed(1)},${point.y.toFixed(1)}`;
            })
            .join(' ')}
          fill="none"
          stroke={tokens.border}
          strokeWidth={1}
        />
      ))}

      {/* eixos */}
      {values.map((_, index) => {
        const point = pointAt(index, 1);
        return (
          <line
            key={index}
            x1={center}
            y1={center}
            x2={point.x}
            y2={point.y}
            stroke={tokens.border}
            strokeWidth={1}
          />
        );
      })}

      <polygon
        points={polygon}
        fill={hexToRgba(tokens.accent, 0.3)}
        stroke={tokens.accent}
        strokeWidth={2}
      />

      {values.map((entry, index) => {
        const point = pointAt(index, Math.max(0.04, entry.value));
        return <circle key={entry.label} cx={point.x} cy={point.y} r={3} fill={tokens.accent} />;
      })}

      {/* rotulos */}
      {values.map((entry, index) => {
        const point = pointAt(index, 1.2);
        return (
          <text
            key={`label-${entry.label}`}
            x={point.x}
            y={point.y}
            fill={tokens.textMuted}
            fontSize={8}
            fontFamily="JetBrains Mono, monospace"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {entry.label.slice(0, 9)}
          </text>
        );
      })}
    </svg>
  );
}

const monoLabel = (tokens: CardTokens, size = 9) => ({
  fontFamily: 'JetBrains Mono, monospace' as const,
  fontSize: size,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.16em',
  color: tokens.textMuted,
});

const displayText = (tokens: CardTokens, size: number) => ({
  fontFamily: 'Syne, sans-serif' as const,
  fontWeight: 800 as const,
  fontSize: size,
  lineHeight: 1.05,
  color: tokens.text,
});

/* ============================================================
 * 1. Perfil musical completo
 * ============================================================ */

function ProfileCard({ data, tokens, format }: CardBodyProps): JSX.Element {
  const { snapshot, metrics, profile } = data;
  const topArtist = snapshot.topArtists.medium_term[0] ?? snapshot.topArtists.long_term[0];
  const isStory = format === 'story';

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: isStory ? 18 : 12 }}>
        <CoverImg
          src={snapshot.user.imageUrl}
          alt={snapshot.user.displayName}
          size={34}
          radius={999}
          tokens={tokens}
        />
        <div style={{ minWidth: 0 }}>
          <p style={monoLabel(tokens, 8)}>perfil musical de</p>
          <p style={{ ...displayText(tokens, 15), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {snapshot.user.displayName}
          </p>
        </div>
      </div>

      {topArtist ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <CoverImg src={topArtist.imageUrl} alt={topArtist.name} size={isStory ? 84 : 66} radius={16} tokens={tokens} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <CardOverline tokens={tokens}>artista #1</CardOverline>
            <p style={{ ...displayText(tokens, isStory ? 24 : 20), letterSpacing: '-0.02em' }}>
              {topArtist.name}
            </p>
            {topArtist.genres[0] ? (
              <p style={{ fontSize: 10, color: tokens.textMuted, marginTop: 4 }}>
                {formatGenre(topArtist.genres[0])}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      <div
        style={{
          backgroundColor: tokens.surface,
          border: `1px solid ${tokens.border}`,
          borderRadius: 16,
          padding: 12,
          marginBottom: 12,
        }}
      >
        <CardOverline tokens={tokens}>arquetipo</CardOverline>
        <p style={displayText(tokens, isStory ? 19 : 17)}>
          {profile?.persona ?? metrics.persona.name}
        </p>
        {isStory && profile?.shareableQuote ? (
          <p style={{ fontSize: 11, lineHeight: 1.5, color: tokens.textMuted, marginTop: 8 }}>
            “{profile.shareableQuote}”
          </p>
        ) : null}
      </div>

      <div style={{ marginBottom: 12 }}>
        <p style={{ ...monoLabel(tokens, 8), marginBottom: 6 }}>generos dominantes</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {metrics.genres.slice(0, isStory ? 5 : 3).map((genre, index) => (
            <CardPill
              key={genre.genre}
              tokens={tokens}
              accent={[tokens.accent, tokens.accentSecondary, tokens.accentTertiary][index % 3]}
            >
              {formatGenre(genre.genre)}
            </CardPill>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <CardStat label="artistas" value={formatCompact(metrics.uniqueArtists)} tokens={tokens} />
        <CardStat label="generos" value={metrics.totalDistinctGenres} tokens={tokens} />
      </div>
    </>
  );
}

/* ============================================================
 * 2. Top 5 artistas
 * ============================================================ */

function TopArtistsCard({ data, tokens, format }: CardBodyProps): JSX.Element {
  const { snapshot } = data;
  const artists = (
    snapshot.topArtists.medium_term.length > 0
      ? snapshot.topArtists.medium_term
      : snapshot.topArtists.long_term
  ).slice(0, 5);

  const isStory = format === 'story';
  const heroSize = isStory ? 150 : 118;

  const [first, ...rest] = artists;

  return (
    <>
      <CardOverline tokens={tokens}>meu top 5</CardOverline>
      <CardTitle tokens={tokens} size={isStory ? 26 : 22}>
        Artistas que mandam
      </CardTitle>
      <p style={{ ...monoLabel(tokens, 8), marginTop: 6, marginBottom: 14 }}>ultimos 6 meses</p>

      {first ? (
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <CoverImg src={first.imageUrl} alt={first.name} size={heroSize} radius={18} tokens={tokens} />
          <div
            style={{
              position: 'absolute',
              left: heroSize + 12,
              top: 6,
              width: CARD_SIZES[format].width - heroSize - 60,
            }}
          >
            <span
              style={{
                display: 'inline-block',
                padding: '2px 8px',
                borderRadius: 999,
                backgroundColor: tokens.accent,
                color: tokens.onAccent,
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 9,
                fontWeight: 700,
                marginBottom: 6,
              }}
            >
              01
            </span>
            <p style={displayText(tokens, isStory ? 22 : 18)}>{first.name}</p>
            {first.genres[0] ? (
              <p style={{ fontSize: 10, color: tokens.textMuted, marginTop: 4 }}>
                {formatGenre(first.genres[0])}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rest.map((artist, index) => (
          <div key={artist.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 11,
                color: tokens.textMuted,
                width: 16,
              }}
            >
              {String(index + 2).padStart(2, '0')}
            </span>
            <CoverImg src={artist.imageUrl} alt={artist.name} size={isStory ? 40 : 32} radius={999} tokens={tokens} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <p
                style={{
                  fontSize: isStory ? 13 : 12,
                  fontWeight: 600,
                  color: tokens.text,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {artist.name}
              </p>
              <p style={{ fontSize: 9, color: tokens.textMuted }}>
                {formatCompact(artist.followers)} seguidores
              </p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ============================================================
 * 3. Top 5 musicas
 * ============================================================ */

function TopTracksCard({ data, tokens, format }: CardBodyProps): JSX.Element {
  const { snapshot } = data;
  const tracks = (
    snapshot.topTracks.medium_term.length > 0
      ? snapshot.topTracks.medium_term
      : snapshot.topTracks.long_term
  ).slice(0, 5);

  const isStory = format === 'story';

  return (
    <>
      <CardOverline tokens={tokens}>na repeticao</CardOverline>
      <CardTitle tokens={tokens} size={isStory ? 26 : 22}>
        Minhas 5 musicas
      </CardTitle>
      <p style={{ ...monoLabel(tokens, 8), marginTop: 6, marginBottom: 16 }}>ultimos 6 meses</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: isStory ? 12 : 8 }}>
        {tracks.map((track, index) => (
          <div
            key={track.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: isStory ? '8px 10px' : '6px 8px',
              borderRadius: 14,
              backgroundColor: index === 0 ? hexToRgba(tokens.accent, 0.14) : tokens.surface,
              border: `1px solid ${index === 0 ? hexToRgba(tokens.accent, 0.32) : tokens.border}`,
            }}
          >
            <span
              style={{
                fontFamily: 'Syne, sans-serif',
                fontWeight: 800,
                fontSize: isStory ? 18 : 15,
                color: index === 0 ? tokens.accent : tokens.textMuted,
                width: 18,
              }}
            >
              {index + 1}
            </span>
            <CoverImg
              src={track.albumImage}
              alt={track.albumName}
              size={isStory ? 44 : 34}
              radius={8}
              tokens={tokens}
            />
            <div style={{ minWidth: 0, flex: 1 }}>
              <p
                style={{
                  fontSize: isStory ? 13 : 11,
                  fontWeight: 600,
                  color: tokens.text,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {track.name}
              </p>
              <p
                style={{
                  fontSize: isStory ? 10 : 9,
                  color: tokens.textMuted,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {track.artistNames.join(', ')}
              </p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ============================================================
 * 4. Radar de audio features
 * ============================================================ */

function RadarCard({ data, tokens, format }: CardBodyProps): JSX.Element {
  const { metrics, snapshot } = data;
  const isStory = format === 'story';

  const values = (
    ['danceability', 'energy', 'valence', 'acousticness', 'instrumentalness'] as const
  ).map((key) => ({
    label: FEATURE_LABEL[key] ?? key,
    value: metrics.averageFeatures[key],
  }));

  return (
    <>
      <CardOverline tokens={tokens}>assinatura sonora</CardOverline>
      <CardTitle tokens={tokens} size={isStory ? 26 : 21}>
        Meu radar de audio
      </CardTitle>

      <div style={{ display: 'flex', justifyContent: 'center', margin: isStory ? '18px 0' : '8px 0' }}>
        <SvgRadar values={values} size={isStory ? 240 : 190} tokens={tokens} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {values.slice(0, isStory ? 5 : 4).map((entry) => (
          <div
            key={entry.label}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              padding: '5px 9px',
              borderRadius: 10,
              backgroundColor: tokens.surface,
            }}
          >
            <span style={{ fontSize: 9, color: tokens.textMuted }}>{entry.label}</span>
            <span
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 11,
                fontWeight: 700,
                color: tokens.text,
              }}
            >
              {Math.round(entry.value * 100)}
            </span>
          </div>
        ))}
      </div>

      {snapshot.meta.audioFeaturesUnavailable ? (
        <p style={{ fontSize: 8, color: tokens.textMuted, marginTop: 8 }}>
          * valores estimados a partir de genero e popularidade
        </p>
      ) : null}
    </>
  );
}

/* ============================================================
 * 5. Minha era musical
 * ============================================================ */

function EraCard({ data, tokens, format }: CardBodyProps): JSX.Element {
  const { metrics } = data;
  const isStory = format === 'story';

  const decades = [...metrics.decades].sort((a, b) => b.percentage - a.percentage).slice(0, 5);
  const max = decades[0]?.percentage ?? 1;
  const accents = [tokens.accent, tokens.accentSecondary, tokens.accentTertiary];

  return (
    <>
      <CardOverline tokens={tokens}>minha era musical</CardOverline>
      <CardTitle tokens={tokens} size={isStory ? 26 : 21}>
        {metrics.soulYear ? `Alma de ${metrics.soulYear}` : 'Sem era definida'}
      </CardTitle>
      <p style={{ fontSize: 10, color: tokens.textMuted, marginTop: 6, marginBottom: isStory ? 20 : 12 }}>
        Media dos anos de lancamento do que eu escuto
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: isStory ? 12 : 8 }}>
        {decades.map((decade, index) => (
          <div key={decade.startYear}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 4,
              }}
            >
              <span
                style={{
                  fontFamily: 'Syne, sans-serif',
                  fontWeight: 700,
                  fontSize: isStory ? 14 : 12,
                  color: tokens.text,
                }}
              >
                {formatDecade(decade.decade)}
              </span>
              <span
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 10,
                  color: tokens.textMuted,
                }}
              >
                {decade.percentage.toFixed(1)}%
              </span>
            </div>
            <div
              style={{
                height: isStory ? 8 : 6,
                borderRadius: 999,
                backgroundColor: tokens.surface,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${max > 0 ? (decade.percentage / max) * 100 : 0}%`,
                  borderRadius: 999,
                  backgroundColor: accents[index % accents.length],
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {isStory ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 18 }}>
          <CardStat
            label="era dominante"
            value={decades[0] ? decades[0].decade : '—'}
            tokens={tokens}
          />
          <CardStat
            label="antes de 2000"
            value={`${Math.round(
              metrics.decades
                .filter((decade) => decade.startYear < 2000)
                .reduce((sum, decade) => sum + decade.percentage, 0),
            )}%`}
            tokens={tokens}
          />
        </div>
      ) : null}
    </>
  );
}

/* ============================================================
 * 6. Ouvinte secreto
 * ============================================================ */

function SecretListenerCard({ data, tokens, format }: CardBodyProps): JSX.Element {
  const { metrics, snapshot } = data;
  const isStory = format === 'story';

  const nightPlays = snapshot.recentlyPlayed.filter((entry) => {
    const hour = new Date(entry.playedAt).getHours();
    return hour >= 0 && hour <= 5;
  });
  const nightShare =
    snapshot.recentlyPlayed.length > 0
      ? Math.round((nightPlays.length / snapshot.recentlyPlayed.length) * 100)
      : 0;

  return (
    <>
      <CardOverline tokens={tokens}>ouvinte secreto</CardOverline>
      <CardTitle tokens={tokens} size={isStory ? 25 : 20}>
        Quando ninguem esta ouvindo
      </CardTitle>

      <div
        style={{
          marginTop: isStory ? 22 : 12,
          marginBottom: 14,
          padding: isStory ? '20px 16px' : '14px 12px',
          borderRadius: 18,
          backgroundColor: hexToRgba(tokens.accent, 0.14),
          border: `1px solid ${hexToRgba(tokens.accent, 0.3)}`,
          textAlign: 'center',
        }}
      >
        <p style={{ ...monoLabel(tokens, 8), marginBottom: 6 }}>meu horario de pico</p>
        <p style={{ ...displayText(tokens, isStory ? 54 : 40), color: tokens.accent }}>
          {formatHour(metrics.peakHour)}
        </p>
        <p
          style={{
            fontSize: 11,
            color: tokens.textMuted,
            marginTop: 6,
            textTransform: 'capitalize',
          }}
        >
          {periodOfDay(metrics.peakHour)}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        <CardStat label="humor dominante" value={MOOD_LABEL[metrics.dominantMood] ?? '—'} tokens={tokens} />
        <CardStat label="na madrugada" value={`${nightShare}%`} tokens={tokens} />
      </div>

      {isStory ? (
        <div
          style={{
            padding: 12,
            borderRadius: 14,
            backgroundColor: tokens.surface,
            border: `1px solid ${tokens.border}`,
          }}
        >
          <p style={{ ...monoLabel(tokens, 8), marginBottom: 6 }}>a trilha da madrugada</p>
          {nightPlays.slice(0, 3).map((entry) => (
            <p
              key={`${entry.track.id}-${entry.playedAt}`}
              style={{
                fontSize: 11,
                color: tokens.text,
                marginBottom: 3,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {entry.track.name}
              <span style={{ color: tokens.textMuted }}> — {entry.track.artistNames[0]}</span>
            </p>
          ))}
          {nightPlays.length === 0 ? (
            <p style={{ fontSize: 11, color: tokens.textMuted }}>
              Nenhuma escuta de madrugada registrada. Voce dorme.
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

/* ============================================================
 * 7. Stats gerais
 * ============================================================ */

function StatsCard({ data, tokens, format }: CardBodyProps): JSX.Element {
  const { metrics, snapshot } = data;
  const isStory = format === 'story';

  const stats = [
    { label: 'musicas mapeadas', value: formatNumber(metrics.uniqueTracks) },
    { label: 'artistas distintos', value: formatNumber(metrics.uniqueArtists) },
    { label: 'generos', value: formatNumber(metrics.totalDistinctGenres) },
    { label: 'horas de catalogo', value: formatNumber(metrics.estimatedHours) },
    { label: 'score mainstream', value: `${Math.round(metrics.mainstreamScore)}/100` },
    { label: 'diversidade', value: `${Math.round(metrics.diversityScore)}/100` },
  ];

  return (
    <>
      <CardOverline tokens={tokens}>meus numeros</CardOverline>
      <CardTitle tokens={tokens} size={isStory ? 26 : 21}>
        O tamanho do meu gosto
      </CardTitle>
      <p style={{ fontSize: 10, color: tokens.textMuted, marginTop: 6, marginBottom: isStory ? 18 : 12 }}>
        {snapshot.user.displayName} · {snapshot.playlists.length} playlists ·{' '}
        {formatCompact(snapshot.followedArtists.length)} artistas seguidos
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
        }}
      >
        {stats.slice(0, isStory ? 6 : 4).map((stat) => (
          <CardStat key={stat.label} label={stat.label} value={stat.value} tokens={tokens} />
        ))}
      </div>

      {isStory ? (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            borderRadius: 14,
            backgroundColor: hexToRgba(tokens.accent, 0.12),
            border: `1px solid ${hexToRgba(tokens.accent, 0.28)}`,
          }}
        >
          <p style={{ ...monoLabel(tokens, 8), marginBottom: 4 }}>arquetipo</p>
          <p style={displayText(tokens, 17)}>{metrics.persona.name}</p>
        </div>
      ) : null}
    </>
  );
}

/* ============================================================
 * 8. A IA me definiu como...
 * ============================================================ */

function AiVerdictCard({ data, tokens, format }: CardBodyProps): JSX.Element {
  const { metrics, profile } = data;
  const isStory = format === 'story';

  return (
    <>
      <CardOverline tokens={tokens}>a ia me definiu como</CardOverline>

      <div style={{ marginTop: isStory ? 16 : 8, marginBottom: 14 }}>
        <p style={{ ...displayText(tokens, isStory ? 30 : 24), letterSpacing: '-0.03em' }}>
          {profile?.headline ?? metrics.persona.name}
        </p>
      </div>

      <div
        style={{
          padding: isStory ? 14 : 11,
          borderRadius: 16,
          backgroundColor: hexToRgba(tokens.accent, 0.14),
          border: `1px solid ${hexToRgba(tokens.accent, 0.32)}`,
          marginBottom: 12,
        }}
      >
        <p style={{ ...monoLabel(tokens, 8), marginBottom: 5 }}>arquetipo</p>
        <p style={displayText(tokens, isStory ? 20 : 17)}>
          {profile?.persona ?? metrics.persona.name}
        </p>
        <p style={{ fontSize: 10, lineHeight: 1.5, color: tokens.textMuted, marginTop: 7 }}>
          {profile?.personaDescription ?? metrics.persona.description}
        </p>
      </div>

      {profile?.moodBoard && profile.moodBoard.length > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
          {profile.moodBoard.slice(0, isStory ? 5 : 4).map((word, index) => (
            <CardPill
              key={`${word}-${index}`}
              tokens={tokens}
              accent={[tokens.accent, tokens.accentSecondary, tokens.accentTertiary][index % 3]}
            >
              {word}
            </CardPill>
          ))}
        </div>
      ) : null}

      {isStory && profile?.hiddenTrait ? (
        <div
          style={{
            padding: 12,
            borderRadius: 14,
            backgroundColor: tokens.surface,
            border: `1px solid ${tokens.border}`,
          }}
        >
          <p style={{ ...monoLabel(tokens, 8), marginBottom: 5 }}>traco oculto</p>
          <p style={{ fontSize: 11, lineHeight: 1.55, color: tokens.text }}>{profile.hiddenTrait}</p>
        </div>
      ) : null}

      {profile?.shareableQuote ? (
        <p
          style={{
            marginTop: 12,
            fontFamily: 'Syne, sans-serif',
            fontWeight: 700,
            fontSize: isStory ? 13 : 12,
            lineHeight: 1.4,
            color: tokens.accent,
          }}
        >
          “{profile.shareableQuote}”
        </p>
      ) : null}
    </>
  );
}

/* ============================================================
 * Dispatcher
 * ============================================================ */

interface CardBodyProps {
  data: ShareCardData;
  tokens: CardTokens;
  format: CardFormat;
}

const CARD_BODIES: Record<ShareCardId, (props: CardBodyProps) => JSX.Element> = {
  profile: ProfileCard,
  'top-artists': TopArtistsCard,
  'top-tracks': TopTracksCard,
  radar: RadarCard,
  era: EraCard,
  'secret-listener': SecretListenerCard,
  stats: StatsCard,
  'ai-verdict': AiVerdictCard,
};

/**
 * Card pronto para exportacao.
 * A ref e encaminhada para o node que o html2canvas captura.
 */
export const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(function ShareCard(
  { cardId, theme, format, snapshot, metrics, profile, palette },
  ref,
) {
  const Body = CARD_BODIES[cardId];
  const data: ShareCardData = { snapshot, metrics, profile, palette };

  return (
    <CardFrame ref={ref} theme={theme} format={format} palette={palette}>
      {(tokens) => <Body data={data} tokens={tokens} format={format} />}
    </CardFrame>
  );
});
