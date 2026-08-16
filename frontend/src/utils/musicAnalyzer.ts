import type {
  ArtistLite,
  AudioFeaturesLite,
  AverageFeatures,
  DecadeCount,
  GenreCount,
  MoodName,
  MusicSnapshot,
  PlayHistoryLite,
  PlaylistAnalysis,
  PlaylistLite,
  TrackLite,
  WeekdayHourCell,
} from '@/types';

/**
 * Derivacoes de apresentacao.
 *
 * As metricas "oficiais" do perfil vem calculadas do backend (que tambem as
 * usa no prompt da IA). Aqui ficam apenas os cortes que cada tela precisa:
 * playlist individual, scatter de humor, calendario, agrupamento por decada.
 */

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/* ============================================================
 * Audio features
 * ============================================================ */

export function featuresOf(
  track: TrackLite,
  featuresById: Record<string, AudioFeaturesLite>,
): AudioFeaturesLite | null {
  return featuresById[track.id] ?? null;
}

/** Mesma regra do backend, para o frontend nao divergir. */
export function moodOfFeatures(features: AudioFeaturesLite | AverageFeatures): MoodName {
  const { energy, valence, acousticness } = features;

  if (energy >= 0.75 && valence <= 0.4) return 'agressivo';
  if (energy >= 0.65 && valence >= 0.6) return 'energetico';
  if (valence >= 0.65) return 'feliz';
  if (valence <= 0.35) return 'melancolico';
  if (energy <= 0.4 && valence >= 0.45) return 'chill';
  if (energy <= 0.5 && valence >= 0.4 && acousticness >= 0.3) return 'romantico';
  return 'neutro';
}

export function averageOf(
  tracks: TrackLite[],
  featuresById: Record<string, AudioFeaturesLite>,
): AverageFeatures {
  const found = tracks
    .map((track) => featuresById[track.id])
    .filter((features): features is AudioFeaturesLite => Boolean(features));

  if (found.length === 0) {
    return {
      danceability: 0,
      energy: 0,
      valence: 0,
      acousticness: 0,
      instrumentalness: 0,
      speechiness: 0,
      liveness: 0,
      tempo: 0,
      loudness: 0,
    };
  }

  return {
    danceability: mean(found.map((item) => item.danceability)),
    energy: mean(found.map((item) => item.energy)),
    valence: mean(found.map((item) => item.valence)),
    acousticness: mean(found.map((item) => item.acousticness)),
    instrumentalness: mean(found.map((item) => item.instrumentalness)),
    speechiness: mean(found.map((item) => item.speechiness)),
    liveness: mean(found.map((item) => item.liveness)),
    tempo: mean(found.map((item) => item.tempo)),
    loudness: mean(found.map((item) => item.loudness)),
  };
}

/* ============================================================
 * Playlists
 * ============================================================ */

/** Rotulos "boa para" derivados das features medias. */
function goodForLabels(features: AverageFeatures, tempo: number): string[] {
  const labels: string[] = [];

  // Trabalho: baixa fala, baixa energia agressiva, instrumental ajuda.
  if (features.speechiness < 0.12 && features.energy < 0.65 && features.instrumentalness > 0.15) {
    labels.push('Trabalho');
  }
  // Academia: energia e BPM altos.
  if (features.energy > 0.7 && tempo > 118) {
    labels.push('Academia');
  }
  // Relaxar: energia baixa, acustica alta.
  if (features.energy < 0.45 && features.acousticness > 0.35) {
    labels.push('Relaxar');
  }
  // Festa: dancabilidade e valencia altas.
  if (features.danceability > 0.65 && features.valence > 0.55) {
    labels.push('Festa');
  }
  // Foco: instrumental sem picos de energia.
  if (features.instrumentalness > 0.5 && features.energy < 0.6) {
    labels.push('Foco');
  }
  // Estrada: energia media-alta com positividade.
  if (features.energy > 0.55 && features.energy <= 0.8 && features.valence > 0.45) {
    labels.push('Estrada');
  }
  // Madrugada: energia baixa e valencia baixa.
  if (features.energy < 0.5 && features.valence < 0.4) {
    labels.push('Madrugada');
  }

  return labels.length > 0 ? labels.slice(0, 3) : ['Escuta livre'];
}

export function analyzePlaylist(
  playlist: PlaylistLite,
  featuresById: Record<string, AudioFeaturesLite>,
  artistDetails: Record<string, ArtistLite>,
): PlaylistAnalysis {
  const tracks = playlist.tracks;
  const features = averageOf(tracks, featuresById);

  const analyzedTracks = tracks.filter((track) => featuresById[track.id]).length;

  /* artistas mais presentes */
  const artistCounts = new Map<string, number>();
  for (const track of tracks) {
    for (const name of track.artistNames) {
      artistCounts.set(name, (artistCounts.get(name) ?? 0) + 1);
    }
  }
  const topArtists = [...artistCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  /* generos */
  const genreCounts = new Map<string, number>();
  for (const track of tracks) {
    for (const artistId of track.artistIds) {
      for (const genre of artistDetails[artistId]?.genres ?? []) {
        genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1);
      }
    }
  }
  const topGenres = [...genreCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([genre]) => genre);

  const years = tracks
    .map((track) => track.releaseYear)
    .filter((year): year is number => year !== null);

  return {
    playlist,
    features,
    mood: moodOfFeatures(features),
    averageTempo: features.tempo,
    averagePopularity: mean(tracks.map((track) => track.popularity)),
    distinctGenres: genreCounts.size,
    // 15 generos numa playlist ja e bastante variedade.
    diversityScore: Math.round(Math.min(100, (genreCounts.size / 15) * 100)),
    topArtists,
    topGenres,
    goodFor: goodForLabels(features, features.tempo),
    averageYear: years.length > 0 ? Math.round(mean(years)) : null,
    analyzedTracks,
  };
}

/* ============================================================
 * Humor
 * ============================================================ */

export interface MoodPoint {
  id: string;
  name: string;
  artist: string;
  albumImage: string | null;
  previewUrl: string | null;
  spotifyUrl: string;
  energy: number;
  valence: number;
  mood: MoodName;
}

/** Pontos para o scatter energy x valence. */
export function buildMoodScatter(
  tracks: TrackLite[],
  featuresById: Record<string, AudioFeaturesLite>,
  limit = 220,
): MoodPoint[] {
  const points: MoodPoint[] = [];
  const seen = new Set<string>();

  for (const track of tracks) {
    if (seen.has(track.id)) continue;
    const features = featuresById[track.id];
    if (!features) continue;

    seen.add(track.id);
    points.push({
      id: track.id,
      name: track.name,
      artist: track.artistNames.join(', '),
      albumImage: track.albumImage,
      previewUrl: track.previewUrl,
      spotifyUrl: track.spotifyUrl,
      energy: features.energy,
      valence: features.valence,
      mood: moodOfFeatures(features),
    });

    if (points.length >= limit) break;
  }

  return points;
}

export interface DayMood {
  /** ISO curto (YYYY-MM-DD). */
  date: string;
  day: number;
  weekday: number;
  valence: number | null;
  energy: number | null;
  count: number;
}

/** Calendario dos ultimos N dias colorido pela valencia media do dia. */
export function buildMoodCalendar(
  history: PlayHistoryLite[],
  featuresById: Record<string, AudioFeaturesLite>,
  days = 30,
): DayMood[] {
  const buckets = new Map<string, { valences: number[]; energies: number[] }>();

  for (const entry of history) {
    const features = featuresById[entry.track.id];
    const date = new Date(entry.playedAt);
    if (Number.isNaN(date.getTime())) continue;

    const key = date.toISOString().slice(0, 10);
    const bucket = buckets.get(key) ?? { valences: [], energies: [] };
    if (features) {
      bucket.valences.push(features.valence);
      bucket.energies.push(features.energy);
    } else {
      // Sem features ainda contabilizamos a escuta.
      bucket.valences.push(Number.NaN);
    }
    buckets.set(key, bucket);
  }

  const result: DayMood[] = [];
  const today = new Date();

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    const key = date.toISOString().slice(0, 10);

    const bucket = buckets.get(key);
    const valences = (bucket?.valences ?? []).filter((value) => Number.isFinite(value));
    const energies = (bucket?.energies ?? []).filter((value) => Number.isFinite(value));

    result.push({
      date: key,
      day: date.getDate(),
      weekday: date.getDay(),
      valence: valences.length > 0 ? mean(valences) : null,
      energy: energies.length > 0 ? mean(energies) : null,
      count: bucket?.valences.length ?? 0,
    });
  }

  return result;
}

export interface PeriodMood {
  period: 'madrugada' | 'manha' | 'tarde' | 'noite';
  label: string;
  valence: number | null;
  energy: number | null;
  count: number;
}

/** Humor medio por periodo do dia. */
export function buildPeriodMood(
  history: PlayHistoryLite[],
  featuresById: Record<string, AudioFeaturesLite>,
): PeriodMood[] {
  const periods: Array<{ period: PeriodMood['period']; label: string; from: number; to: number }> = [
    { period: 'madrugada', label: 'Madrugada', from: 0, to: 5 },
    { period: 'manha', label: 'Manha', from: 6, to: 11 },
    { period: 'tarde', label: 'Tarde', from: 12, to: 17 },
    { period: 'noite', label: 'Noite', from: 18, to: 23 },
  ];

  return periods.map(({ period, label, from, to }) => {
    const valences: number[] = [];
    const energies: number[] = [];
    let count = 0;

    for (const entry of history) {
      const hour = new Date(entry.playedAt).getHours();
      if (Number.isNaN(hour) || hour < from || hour > to) continue;
      count += 1;

      const features = featuresById[entry.track.id];
      if (!features) continue;
      valences.push(features.valence);
      energies.push(features.energy);
    }

    return {
      period,
      label,
      valence: valences.length > 0 ? mean(valences) : null,
      energy: energies.length > 0 ? mean(energies) : null,
      count,
    };
  });
}

export interface RankedTrack {
  track: TrackLite;
  score: number;
}

/** Top faixas "levanta o astral" (valencia + energia). */
export function topUplifting(
  tracks: TrackLite[],
  featuresById: Record<string, AudioFeaturesLite>,
  limit = 5,
): RankedTrack[] {
  return rankTracks(tracks, featuresById, (features) => features.valence * 0.75 + features.energy * 0.25, limit);
}

/** Top faixas "para chorar" (baixa valencia + acustica). */
export function topMelancholic(
  tracks: TrackLite[],
  featuresById: Record<string, AudioFeaturesLite>,
  limit = 5,
): RankedTrack[] {
  return rankTracks(
    tracks,
    featuresById,
    (features) => (1 - features.valence) * 0.6 + features.acousticness * 0.25 + (1 - features.energy) * 0.15,
    limit,
  );
}

function rankTracks(
  tracks: TrackLite[],
  featuresById: Record<string, AudioFeaturesLite>,
  score: (features: AudioFeaturesLite) => number,
  limit: number,
): RankedTrack[] {
  const seen = new Set<string>();
  const ranked: RankedTrack[] = [];

  for (const track of tracks) {
    if (seen.has(track.id)) continue;
    const features = featuresById[track.id];
    if (!features) continue;
    seen.add(track.id);
    ranked.push({ track, score: clamp01(score(features)) });
  }

  return ranked.sort((a, b) => b.score - a.score).slice(0, limit);
}

/* ============================================================
 * Decadas
 * ============================================================ */

export interface DecadeGroup {
  decade: string;
  startYear: number;
  count: number;
  percentage: number;
  tracks: TrackLite[];
  artists: string[];
}

/** Agrupa as faixas por decada, com representantes de cada era. */
export function buildDecadeGroups(tracks: TrackLite[]): DecadeGroup[] {
  const groups = new Map<number, TrackLite[]>();
  let total = 0;

  const seen = new Set<string>();
  for (const track of tracks) {
    if (seen.has(track.id) || track.releaseYear === null) continue;
    seen.add(track.id);

    const startYear = Math.floor(track.releaseYear / 10) * 10;
    const bucket = groups.get(startYear) ?? [];
    bucket.push(track);
    groups.set(startYear, bucket);
    total += 1;
  }

  return [...groups.entries()]
    .map(([startYear, bucket]) => {
      const artistCounts = new Map<string, number>();
      for (const track of bucket) {
        for (const name of track.artistNames) {
          artistCounts.set(name, (artistCounts.get(name) ?? 0) + 1);
        }
      }

      return {
        decade: `${String(startYear).slice(-2)}s`,
        startYear,
        count: bucket.length,
        percentage: total > 0 ? Math.round((bucket.length / total) * 1000) / 10 : 0,
        tracks: [...bucket].sort((a, b) => b.popularity - a.popularity).slice(0, 8),
        artists: [...artistCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([name]) => name),
      };
    })
    .sort((a, b) => a.startYear - b.startYear);
}

export function averageReleaseYear(tracks: TrackLite[]): number | null {
  const years = tracks
    .map((track) => track.releaseYear)
    .filter((year): year is number => year !== null);
  return years.length > 0 ? Math.round(mean(years)) : null;
}

/* ============================================================
 * Dados para graficos
 * ============================================================ */

export interface RadarPoint {
  feature: string;
  label: string;
  value: number;
  average: number;
}

/**
 * Dados do radar. A coluna "ouvinte medio" usa referencias publicas
 * aproximadas dos valores medios do catalogo do Spotify.
 */
const AVERAGE_LISTENER: Record<string, number> = {
  danceability: 0.6,
  energy: 0.64,
  valence: 0.45,
  acousticness: 0.25,
  instrumentalness: 0.08,
};

export function buildRadarData(features: AverageFeatures, labels: Record<string, string>): RadarPoint[] {
  const keys: Array<keyof AverageFeatures> = [
    'danceability',
    'energy',
    'valence',
    'acousticness',
    'instrumentalness',
  ];

  return keys.map((key) => ({
    feature: key,
    label: labels[key] ?? key,
    value: Math.round(features[key] * 100),
    average: Math.round((AVERAGE_LISTENER[key] ?? 0.5) * 100),
  }));
}

export interface GenreBubble {
  genre: string;
  value: number;
  percentage: number;
  /** Indice usado para escolher a cor. */
  index: number;
}

export function buildGenreBubbles(genres: GenreCount[], limit = 14): GenreBubble[] {
  return genres.slice(0, limit).map((entry, index) => ({
    genre: entry.genre,
    value: entry.count,
    percentage: entry.percentage,
    index,
  }));
}

/** Matriz 7x24 (dia da semana x hora) para o heatmap. */
export function buildHeatmapMatrix(cells: WeekdayHourCell[]): {
  matrix: number[][];
  max: number;
} {
  const matrix: number[][] = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
  let max = 0;

  for (const cell of cells) {
    const row = matrix[cell.weekday];
    if (!row) continue;
    row[cell.hour] = (row[cell.hour] ?? 0) + cell.count;
    max = Math.max(max, row[cell.hour] ?? 0);
  }

  return { matrix, max };
}

/* ============================================================
 * Coletores do snapshot
 * ============================================================ */

/** Todas as faixas do snapshot, sem repeticao, ordenadas por relevancia. */
export function allTracks(snapshot: MusicSnapshot): TrackLite[] {
  const seen = new Set<string>();
  const tracks: TrackLite[] = [];

  const push = (list: TrackLite[]) => {
    for (const track of list) {
      if (seen.has(track.id)) continue;
      seen.add(track.id);
      tracks.push(track);
    }
  };

  push(snapshot.topTracks.short_term);
  push(snapshot.topTracks.medium_term);
  push(snapshot.topTracks.long_term);
  push(snapshot.recentlyPlayed.map((entry) => entry.track));
  push(snapshot.savedTracks);
  push(snapshot.playlists.flatMap((playlist) => playlist.tracks));

  return tracks;
}

/** Capas usadas para extrair a paleta do usuario. */
export function paletteSourceImages(snapshot: MusicSnapshot, limit = 8): string[] {
  const images: string[] = [];
  const seen = new Set<string>();

  const push = (url: string | null) => {
    if (!url || seen.has(url) || images.length >= limit) return;
    seen.add(url);
    images.push(url);
  };

  // Artistas do topo primeiro: e a identidade visual mais forte do perfil.
  for (const artist of snapshot.topArtists.medium_term.slice(0, 4)) push(artist.imageUrl);
  for (const track of snapshot.topTracks.medium_term.slice(0, 6)) push(track.albumImage);
  for (const track of snapshot.topTracks.long_term.slice(0, 4)) push(track.albumImage);

  return images;
}

/** Decadas em formato de grafico, a partir das faixas. */
export function decadeCounts(tracks: TrackLite[]): DecadeCount[] {
  return buildDecadeGroups(tracks).map((group) => ({
    decade: group.decade,
    startYear: group.startYear,
    count: group.count,
    percentage: group.percentage,
  }));
}

/** Faixas com preview disponivel — o mini-player so aceita essas. */
export function playableTracks(tracks: TrackLite[]): TrackLite[] {
  return tracks.filter((track) => Boolean(track.previewUrl));
}
