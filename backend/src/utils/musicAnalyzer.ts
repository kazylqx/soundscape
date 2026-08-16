import type {
  ArtistLite,
  AudioFeaturesLite,
  AverageFeatures,
  DecadeCount,
  GenreCount,
  HourCount,
  MoodName,
  MusicMetrics,
  MusicSnapshot,
  PersonaResult,
  TrackLite,
  WeekdayHourCell,
} from '../types';

/**
 * Motor de analise musical.
 *
 * Duas responsabilidades:
 *  1. `estimateFeaturesForTracks` — plano B quando /audio-features esta
 *     bloqueado para o app do Spotify (restricao da API para apps novos).
 *  2. `computeMetrics` — transforma o snapshot bruto nas metricas que
 *     alimentam os graficos do frontend e o prompt da IA.
 */

/* ============================================================
 * Helpers numericos
 * ============================================================ */

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

const round = (value: number, decimals = 3): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** Hash deterministico de string -> [0, 1). Mesma track sempre gera o mesmo valor. */
function hashUnit(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 100000) / 100000;
}

/* ============================================================
 * 1. Estimativa de audio features
 * ============================================================ */

interface FeatureProfile {
  danceability: number;
  energy: number;
  valence: number;
  acousticness: number;
  instrumentalness: number;
  speechiness: number;
  tempo: number;
}

/** Perfis medios por familia de genero, usados apenas no modo estimativa. */
const GENRE_PROFILES: Array<{ match: RegExp; profile: FeatureProfile }> = [
  {
    match: /(edm|house|techno|trance|dance|electro|drum and bass|dubstep|rave)/i,
    profile: { danceability: 0.75, energy: 0.85, valence: 0.6, acousticness: 0.05, instrumentalness: 0.45, speechiness: 0.07, tempo: 126 },
  },
  {
    match: /(ambient|downtempo|chillwave|lo-?fi|new age|drone|soundtrack|score|classical|orchestra|piano)/i,
    profile: { danceability: 0.35, energy: 0.28, valence: 0.35, acousticness: 0.7, instrumentalness: 0.75, speechiness: 0.05, tempo: 92 },
  },
  {
    match: /(hip hop|rap|trap|drill|grime|funk carioca|funk brasileiro)/i,
    profile: { danceability: 0.78, energy: 0.72, valence: 0.5, acousticness: 0.12, instrumentalness: 0.03, speechiness: 0.25, tempo: 118 },
  },
  {
    match: /(metal|hardcore|punk|thrash|screamo|deathcore)/i,
    profile: { danceability: 0.4, energy: 0.94, valence: 0.35, acousticness: 0.04, instrumentalness: 0.12, speechiness: 0.09, tempo: 148 },
  },
  {
    match: /(rock|grunge|alt|indie rock|garage|shoegaze|post-punk)/i,
    profile: { danceability: 0.5, energy: 0.76, valence: 0.48, acousticness: 0.16, instrumentalness: 0.1, speechiness: 0.06, tempo: 128 },
  },
  {
    match: /(folk|singer-?songwriter|acoustic|americana|sertanejo raiz|mpb|bossa)/i,
    profile: { danceability: 0.45, energy: 0.34, valence: 0.45, acousticness: 0.78, instrumentalness: 0.06, speechiness: 0.05, tempo: 104 },
  },
  {
    match: /(soul|r&b|rnb|neo soul|motown|gospel)/i,
    profile: { danceability: 0.66, energy: 0.55, valence: 0.62, acousticness: 0.25, instrumentalness: 0.04, speechiness: 0.09, tempo: 100 },
  },
  {
    match: /(jazz|blues|swing|bebop)/i,
    profile: { danceability: 0.52, energy: 0.42, valence: 0.5, acousticness: 0.62, instrumentalness: 0.4, speechiness: 0.06, tempo: 112 },
  },
  {
    match: /(pop|k-?pop|teen pop|dance pop|electropop)/i,
    profile: { danceability: 0.7, energy: 0.7, valence: 0.66, acousticness: 0.16, instrumentalness: 0.02, speechiness: 0.08, tempo: 118 },
  },
  {
    match: /(reggaeton|latin|salsa|cumbia|forro|axe|pagode|samba|reggae|dancehall|afrobeat)/i,
    profile: { danceability: 0.8, energy: 0.72, valence: 0.72, acousticness: 0.2, instrumentalness: 0.03, speechiness: 0.11, tempo: 102 },
  },
  {
    match: /(emo|sad|melancholic|slowcore|dark|goth|doom)/i,
    profile: { danceability: 0.42, energy: 0.5, valence: 0.22, acousticness: 0.3, instrumentalness: 0.15, speechiness: 0.06, tempo: 110 },
  },
  {
    match: /(country|bluegrass|sertanejo)/i,
    profile: { danceability: 0.56, energy: 0.6, valence: 0.58, acousticness: 0.45, instrumentalness: 0.03, speechiness: 0.05, tempo: 112 },
  },
];

const NEUTRAL_PROFILE: FeatureProfile = {
  danceability: 0.55,
  energy: 0.58,
  valence: 0.5,
  acousticness: 0.28,
  instrumentalness: 0.08,
  speechiness: 0.08,
  tempo: 116,
};

function profileForGenres(genres: string[]): FeatureProfile {
  const matched: FeatureProfile[] = [];
  for (const genre of genres) {
    const entry = GENRE_PROFILES.find((candidate) => candidate.match.test(genre));
    if (entry) matched.push(entry.profile);
    if (matched.length >= 3) break;
  }
  if (matched.length === 0) return NEUTRAL_PROFILE;

  return {
    danceability: mean(matched.map((profile) => profile.danceability)),
    energy: mean(matched.map((profile) => profile.energy)),
    valence: mean(matched.map((profile) => profile.valence)),
    acousticness: mean(matched.map((profile) => profile.acousticness)),
    instrumentalness: mean(matched.map((profile) => profile.instrumentalness)),
    speechiness: mean(matched.map((profile) => profile.speechiness)),
    tempo: mean(matched.map((profile) => profile.tempo)),
  };
}

/**
 * Gera audio features aproximadas para uma lista de tracks.
 * Usa genero dos artistas + popularidade + duracao, com uma variacao
 * deterministica por track (mesma track = mesmo resultado).
 */
export function estimateFeaturesForTracks(
  tracks: TrackLite[],
  artistDetails: Record<string, ArtistLite>,
  /**
   * Generos dominantes do usuario. Servem de base para as faixas cujos
   * artistas nao estao em `artistDetails` — sem isso elas caem todas no perfil
   * neutro e os graficos ficam achatados, todos no centro da escala.
   */
  fallbackGenres: string[] = [],
): Record<string, AudioFeaturesLite> {
  const result: Record<string, AudioFeaturesLite> = {};

  const fallbackProfile =
    fallbackGenres.length > 0 ? profileForGenres(fallbackGenres) : NEUTRAL_PROFILE;

  for (const track of tracks) {
    if (!track.id || result[track.id]) continue;

    const genres = track.artistIds.flatMap((id) => artistDetails[id]?.genres ?? []);
    const base = genres.length > 0 ? profileForGenres(genres) : fallbackProfile;

    // Variacao pseudo-aleatoria estavel em torno do perfil do genero.
    const wiggle = (salt: string, amplitude: number) => (hashUnit(track.id + salt) - 0.5) * 2 * amplitude;

    // Musicas muito longas tendem a ser menos dancantes e mais instrumentais.
    const lengthMinutes = track.durationMs / 60000;
    const longBias = clamp01((lengthMinutes - 4) / 6);
    // Popularidade alta puxa levemente para dancabilidade/valencia de radio.
    const popBias = (track.popularity / 100 - 0.5) * 0.12;

    result[track.id] = {
      id: track.id,
      danceability: round(clamp01(base.danceability + wiggle('d', 0.14) + popBias - longBias * 0.1)),
      energy: round(clamp01(base.energy + wiggle('e', 0.16) - longBias * 0.08)),
      valence: round(clamp01(base.valence + wiggle('v', 0.2) + popBias)),
      acousticness: round(clamp01(base.acousticness + wiggle('a', 0.14) + longBias * 0.05)),
      instrumentalness: round(clamp01(base.instrumentalness + wiggle('i', 0.12) + longBias * 0.15)),
      speechiness: round(clamp01(base.speechiness + wiggle('s', 0.04))),
      liveness: round(clamp01(0.18 + wiggle('l', 0.12))),
      tempo: round(Math.max(60, Math.min(200, base.tempo + wiggle('t', 12))), 1),
      key: Math.floor(hashUnit(track.id + 'k') * 12),
      mode: hashUnit(track.id + 'm') > 0.35 ? 1 : 0,
      loudness: round(-12 + base.energy * 6 + wiggle('o', 2), 1),
      durationMs: track.durationMs,
    };
  }

  return result;
}

/* ============================================================
 * 2. Metricas
 * ============================================================ */

/** Reune todas as tracks do snapshot, sem duplicatas, com pesos por relevancia. */
function collectTracks(snapshot: MusicSnapshot): { unique: TrackLite[]; weighted: TrackLite[] } {
  const weighted: TrackLite[] = [
    ...snapshot.topTracks.short_term,
    ...snapshot.topTracks.medium_term,
    ...snapshot.topTracks.long_term,
    ...snapshot.recentlyPlayed.map((entry) => entry.track),
    ...snapshot.savedTracks,
  ];

  const seen = new Set<string>();
  const unique: TrackLite[] = [];
  for (const track of [...weighted, ...snapshot.playlists.flatMap((playlist) => playlist.tracks)]) {
    if (!track.id || seen.has(track.id)) continue;
    seen.add(track.id);
    unique.push(track);
  }

  return { unique, weighted };
}

function averageFeatures(
  tracks: TrackLite[],
  featuresById: Record<string, AudioFeaturesLite>,
): AverageFeatures {
  const found: AudioFeaturesLite[] = [];
  for (const track of tracks) {
    const features = featuresById[track.id];
    if (features) found.push(features);
  }

  if (found.length === 0) {
    return {
      danceability: 0.5,
      energy: 0.5,
      valence: 0.5,
      acousticness: 0.3,
      instrumentalness: 0.1,
      speechiness: 0.08,
      liveness: 0.18,
      tempo: 118,
      loudness: -8,
    };
  }

  return {
    danceability: round(mean(found.map((item) => item.danceability))),
    energy: round(mean(found.map((item) => item.energy))),
    valence: round(mean(found.map((item) => item.valence))),
    acousticness: round(mean(found.map((item) => item.acousticness))),
    instrumentalness: round(mean(found.map((item) => item.instrumentalness))),
    speechiness: round(mean(found.map((item) => item.speechiness))),
    liveness: round(mean(found.map((item) => item.liveness))),
    tempo: round(mean(found.map((item) => item.tempo)), 1),
    loudness: round(mean(found.map((item) => item.loudness)), 1),
  };
}

function buildGenreMap(snapshot: MusicSnapshot): { genres: GenreCount[]; distinct: number } {
  const counts = new Map<string, number>();

  const addGenres = (genres: string[], weight: number) => {
    for (const genre of genres) {
      const key = genre.trim().toLowerCase();
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + weight);
    }
  };

  // Top artists pesam mais que artistas que apenas aparecem em tracks.
  snapshot.topArtists.short_term.forEach((artist, index) => addGenres(artist.genres, 3 + (50 - index) / 50));
  snapshot.topArtists.medium_term.forEach((artist, index) => addGenres(artist.genres, 3 + (50 - index) / 50));
  snapshot.topArtists.long_term.forEach((artist, index) => addGenres(artist.genres, 2 + (50 - index) / 50));
  snapshot.followedArtists.forEach((artist) => addGenres(artist.genres, 1));

  for (const entry of snapshot.recentlyPlayed) {
    for (const artistId of entry.track.artistIds) {
      addGenres(snapshot.artistDetails[artistId]?.genres ?? [], 1);
    }
  }

  const total = [...counts.values()].reduce((sum, value) => sum + value, 0);

  const genres: GenreCount[] = [...counts.entries()]
    .map(([genre, count]) => ({
      genre,
      count: round(count, 1),
      percentage: total > 0 ? round((count / total) * 100, 1) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  return { genres, distinct: counts.size };
}

function buildDecades(tracks: TrackLite[]): {
  decades: DecadeCount[];
  averageYear: number | null;
} {
  const years = tracks
    .map((track) => track.releaseYear)
    .filter((year): year is number => year !== null);

  if (years.length === 0) return { decades: [], averageYear: null };

  const counts = new Map<number, number>();
  for (const year of years) {
    const startYear = Math.floor(year / 10) * 10;
    counts.set(startYear, (counts.get(startYear) ?? 0) + 1);
  }

  const decades: DecadeCount[] = [...counts.entries()]
    .map(([startYear, count]) => ({
      decade: `${String(startYear).slice(-2)}s`,
      startYear,
      count,
      percentage: round((count / years.length) * 100, 1),
    }))
    .sort((a, b) => a.startYear - b.startYear);

  return { decades, averageYear: Math.round(mean(years)) };
}

function buildListeningPatterns(snapshot: MusicSnapshot): {
  byHour: HourCount[];
  peakHour: number | null;
  heatmap: WeekdayHourCell[];
} {
  const byHour: HourCount[] = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }));
  const cells = new Map<string, WeekdayHourCell>();

  for (const entry of snapshot.recentlyPlayed) {
    const date = new Date(entry.playedAt);
    if (Number.isNaN(date.getTime())) continue;

    const hour = date.getHours();
    const weekday = date.getDay();

    const bucket = byHour[hour];
    if (bucket) bucket.count += 1;

    const key = `${weekday}-${hour}`;
    const cell = cells.get(key);
    if (cell) cell.count += 1;
    else cells.set(key, { weekday, hour, count: 1 });
  }

  const busiest = byHour.reduce<HourCount | null>((best, current) => {
    if (current.count === 0) return best;
    if (!best || current.count > best.count) return current;
    return best;
  }, null);

  return { byHour, peakHour: busiest ? busiest.hour : null, heatmap: [...cells.values()] };
}

function moodFromFeatures(energy: number, valence: number, acousticness: number): MoodName {
  if (energy >= 0.75 && valence <= 0.4) return 'agressivo';
  if (energy >= 0.65 && valence >= 0.6) return 'energetico';
  if (valence >= 0.65) return 'feliz';
  if (valence <= 0.35 && acousticness >= 0.4) return 'melancolico';
  if (valence <= 0.35) return 'melancolico';
  if (energy <= 0.4 && valence >= 0.45) return 'chill';
  if (energy <= 0.5 && valence >= 0.4 && acousticness >= 0.3) return 'romantico';
  return 'neutro';
}

function buildMoodBreakdown(
  tracks: TrackLite[],
  featuresById: Record<string, AudioFeaturesLite>,
): { dominant: MoodName; breakdown: Record<MoodName, number> } {
  const breakdown: Record<MoodName, number> = {
    energetico: 0,
    melancolico: 0,
    feliz: 0,
    chill: 0,
    agressivo: 0,
    romantico: 0,
    neutro: 0,
  };

  let total = 0;
  for (const track of tracks) {
    const features = featuresById[track.id];
    if (!features) continue;
    breakdown[moodFromFeatures(features.energy, features.valence, features.acousticness)] += 1;
    total += 1;
  }

  if (total === 0) return { dominant: 'neutro', breakdown };

  for (const key of Object.keys(breakdown) as MoodName[]) {
    breakdown[key] = round((breakdown[key] / total) * 100, 1);
  }

  const dominant = (Object.entries(breakdown) as Array<[MoodName, number]>)
    .filter(([name]) => name !== 'neutro')
    .sort((a, b) => b[1] - a[1])[0];

  return { dominant: dominant && dominant[1] > 0 ? dominant[0] : 'neutro', breakdown };
}

/* ============================================================
 * 3. Personas
 * ============================================================ */

interface PersonaContext {
  features: AverageFeatures;
  genres: GenreCount[];
  distinctGenres: number;
  topGenreShare: number;
  distinctGenresInTop: number;
  nightShare: number;
  mainstreamScore: number;
  diversityScore: number;
  repeatRate: number;
  topArtistShare: number;
  vintageShare: number;
  uniqueArtists: number;
}

/** Percentual acumulado dos generos que casam com o padrao. */
function genreShare(genres: GenreCount[], pattern: RegExp): number {
  return genres
    .filter((entry) => pattern.test(entry.genre))
    .reduce((sum, entry) => sum + entry.percentage, 0);
}

/** Normaliza um valor em relacao a um alvo: 0 longe, 1 no alvo ou acima. */
const above = (value: number, floor: number, ceiling: number): number =>
  clamp01((value - floor) / Math.max(0.0001, ceiling - floor));

const below = (value: number, ceiling: number, floor: number): number =>
  clamp01((ceiling - value) / Math.max(0.0001, ceiling - floor));

interface PersonaDefinition {
  key: string;
  name: string;
  description: string;
  score: (context: PersonaContext) => { score: number; evidence: string[] };
}

const PERSONAS: PersonaDefinition[] = [
  {
    key: 'explorador_noturno',
    name: 'O Explorador Noturno',
    description:
      'Voce procura musica quando o mundo silencia. Alta energia com melancolia — a combinacao de quem usa som para pensar, nao para escapar.',
    score: (context) => {
      const energy = above(context.features.energy, 0.5, 0.85);
      const valence = below(context.features.valence, 0.5, 0.2);
      const night = above(context.nightShare, 0.12, 0.45);
      const evidence: string[] = [];
      if (energy > 0.4) evidence.push(`energia media ${Math.round(context.features.energy * 100)}%`);
      if (valence > 0.4) evidence.push(`valencia baixa ${Math.round(context.features.valence * 100)}%`);
      if (night > 0.3) evidence.push(`${Math.round(context.nightShare * 100)}% das escutas na madrugada`);
      return { score: energy * 0.3 + valence * 0.3 + night * 0.4, evidence };
    },
  },
  {
    key: 'hedonista',
    name: 'O Hedonista',
    description:
      'Musica e prazer imediato: cadencia, refrao e corpo em movimento. Voce escolhe faixas que funcionam melhor com outras pessoas por perto.',
    score: (context) => {
      const dance = above(context.features.danceability, 0.55, 0.85);
      const valence = above(context.features.valence, 0.5, 0.8);
      const pop = above(genreShare(context.genres, /(pop|dance|house|reggaeton|funk|latin|edm)/i), 12, 45);
      const evidence: string[] = [];
      if (dance > 0.4) evidence.push(`dancabilidade ${Math.round(context.features.danceability * 100)}%`);
      if (valence > 0.4) evidence.push(`valencia ${Math.round(context.features.valence * 100)}%`);
      if (pop > 0.3) evidence.push('forte presenca de pop e dance');
      return { score: dance * 0.4 + valence * 0.35 + pop * 0.25, evidence };
    },
  },
  {
    key: 'introvertido_melodico',
    name: 'O Introvertido Melodico',
    description:
      'Violao, voz e espaco entre as notas. Voce prefere musica que sussurra a musica que grita — intimidade acima de impacto.',
    score: (context) => {
      const acoustic = above(context.features.acousticness, 0.3, 0.7);
      const lowEnergy = below(context.features.energy, 0.55, 0.25);
      const genres = above(genreShare(context.genres, /(indie|folk|singer-?songwriter|acoustic|mpb|bossa|slowcore)/i), 8, 40);
      const evidence: string[] = [];
      if (acoustic > 0.4) evidence.push(`acustica ${Math.round(context.features.acousticness * 100)}%`);
      if (lowEnergy > 0.4) evidence.push(`energia baixa ${Math.round(context.features.energy * 100)}%`);
      if (genres > 0.3) evidence.push('indie e folk no centro do gosto');
      return { score: acoustic * 0.4 + lowEnergy * 0.3 + genres * 0.3, evidence };
    },
  },
  {
    key: 'guerreiro',
    name: 'O Guerreiro',
    description:
      'Sua playlist e combustivel. BPM alto, peso e atitude — musica como treino, nao como paisagem.',
    score: (context) => {
      const energy = above(context.features.energy, 0.65, 0.92);
      const tempo = above(context.features.tempo, 115, 150);
      const genres = above(genreShare(context.genres, /(hip hop|rap|trap|rock|metal|punk|hardcore|drill)/i), 15, 55);
      const evidence: string[] = [];
      if (energy > 0.4) evidence.push(`energia ${Math.round(context.features.energy * 100)}%`);
      if (tempo > 0.4) evidence.push(`${Math.round(context.features.tempo)} BPM em media`);
      if (genres > 0.3) evidence.push('hip-hop e rock dominando');
      return { score: energy * 0.4 + tempo * 0.2 + genres * 0.4, evidence };
    },
  },
  {
    key: 'sonhador',
    name: 'O Sonhador',
    description:
      'Voce escuta texturas, nao letras. Musica como ambiente — algo para habitar enquanto a mente vai a outro lugar.',
    score: (context) => {
      const instrumental = above(context.features.instrumentalness, 0.15, 0.6);
      const genres = above(genreShare(context.genres, /(ambient|electronic|chillwave|lo-?fi|downtempo|new age|classical|soundtrack|post-rock)/i), 10, 45);
      const evidence: string[] = [];
      if (instrumental > 0.3) evidence.push(`instrumentalidade ${Math.round(context.features.instrumentalness * 100)}%`);
      if (genres > 0.3) evidence.push('ambient e eletronica presentes');
      return { score: instrumental * 0.55 + genres * 0.45, evidence };
    },
  },
  {
    key: 'nostalgico',
    name: 'O Nostalgico',
    description:
      'Seu gosto tem arquivo. A maior parte do que voce ouve foi gravada antes do streaming existir — e isso nao e acidente.',
    score: (context) => {
      const vintage = above(context.vintageShare, 0.25, 0.7);
      const evidence: string[] = [];
      if (vintage > 0.3) evidence.push(`${Math.round(context.vintageShare * 100)}% das musicas sao de antes dos anos 2000`);
      return { score: vintage, evidence };
    },
  },
  {
    key: 'descobridor',
    name: 'O Descobridor',
    description:
      'Voce chega antes. Baixa popularidade media e muitos generos distintos: o algoritmo corre atras de voce, nao o contrario.',
    score: (context) => {
      const underground = below(context.mainstreamScore, 60, 25);
      const diversity = above(context.diversityScore, 40, 85);
      const evidence: string[] = [];
      if (underground > 0.3) evidence.push(`popularidade media ${Math.round(context.mainstreamScore)}/100`);
      if (diversity > 0.3) evidence.push(`${context.distinctGenres} generos distintos`);
      return { score: underground * 0.55 + diversity * 0.45, evidence };
    },
  },
  {
    key: 'fiel',
    name: 'O Fiel',
    description:
      'Poucos artistas, muita repeticao. Voce nao consome musica, voce mora nela — e volta sempre para os mesmos comodos.',
    score: (context) => {
      const concentration = above(context.topArtistShare, 0.15, 0.45);
      const repeat = above(context.repeatRate, 0.15, 0.5);
      const focus = below(context.distinctGenres, 40, 8);
      const evidence: string[] = [];
      if (concentration > 0.3) evidence.push(`${Math.round(context.topArtistShare * 100)}% das faixas sao do mesmo artista`);
      if (repeat > 0.3) evidence.push(`${Math.round(context.repeatRate * 100)}% de repeticao no historico recente`);
      return { score: concentration * 0.45 + repeat * 0.3 + focus * 0.25, evidence };
    },
  },
  {
    key: 'ecletico',
    name: 'O Ecletico',
    description:
      'Nao existe um genero seu — existem varios. Voce transita entre mundos sonoros sem pedir licenca.',
    score: (context) => {
      const spread = above(context.distinctGenresInTop, 5, 12);
      const noDominance = below(context.topGenreShare, 40, 12);
      const evidence: string[] = [];
      if (spread > 0.3) evidence.push(`${context.distinctGenresInTop} generos no seu top`);
      if (noDominance > 0.3) evidence.push('nenhum genero passa de um terco do total');
      return { score: spread * 0.6 + noDominance * 0.4, evidence };
    },
  },
  {
    key: 'romantico',
    name: 'O Romantico',
    description:
      'Voce escuta com o peito. Soul, R&B e jazz costurando uma trilha para sentimentos que voce nao diria em voz alta.',
    score: (context) => {
      const valence = above(context.features.valence, 0.5, 0.8);
      const genres = above(genreShare(context.genres, /(soul|r&b|rnb|neo soul|jazz|motown|gospel|bolero|samba)/i), 8, 40);
      const evidence: string[] = [];
      if (valence > 0.4) evidence.push(`valencia ${Math.round(context.features.valence * 100)}%`);
      if (genres > 0.3) evidence.push('soul, R&B e jazz em destaque');
      return { score: valence * 0.35 + genres * 0.65, evidence };
    },
  },
];

function classifyPersona(context: PersonaContext): { persona: PersonaResult; runnerUps: PersonaResult[] } {
  const scored: PersonaResult[] = PERSONAS.map((definition) => {
    const { score, evidence } = definition.score(context);
    return {
      key: definition.key,
      name: definition.name,
      description: definition.description,
      score: round(score, 3),
      evidence,
    };
  }).sort((a, b) => b.score - a.score);

  const [first, ...rest] = scored;

  const fallback: PersonaResult = {
    key: 'ecletico',
    name: 'O Ecletico',
    description:
      'Nao existe um genero seu — existem varios. Voce transita entre mundos sonoros sem pedir licenca.',
    score: 0,
    evidence: [],
  };

  return { persona: first ?? fallback, runnerUps: rest.slice(0, 3) };
}

/* ============================================================
 * 4. Metricas completas
 * ============================================================ */

export function computeMetrics(snapshot: MusicSnapshot): MusicMetrics {
  const { unique, weighted } = collectTracks(snapshot);
  const features = averageFeatures(weighted.length > 0 ? weighted : unique, snapshot.audioFeatures);

  const { genres, distinct } = buildGenreMap(snapshot);
  const { decades, averageYear } = buildDecades(unique);
  const { byHour, peakHour, heatmap } = buildListeningPatterns(snapshot);
  const { dominant, breakdown } = buildMoodBreakdown(weighted.length > 0 ? weighted : unique, snapshot.audioFeatures);

  /* ---------- mainstream / diversidade ---------- */

  const popularityPool =
    snapshot.topTracks.medium_term.length > 0
      ? snapshot.topTracks.medium_term
      : snapshot.topTracks.long_term.length > 0
        ? snapshot.topTracks.long_term
        : unique;

  const mainstreamScore = round(mean(popularityPool.map((track) => track.popularity)), 1);

  // 25 generos distintos ja e um gosto bem amplo -> normaliza para 100.
  const diversityScore = round(Math.min(100, (distinct / 25) * 100), 1);

  /* ---------- repeticao e concentracao ---------- */

  const recentIds = snapshot.recentlyPlayed.map((entry) => entry.track.id);
  const repeatRate =
    recentIds.length > 0 ? round(1 - new Set(recentIds).size / recentIds.length, 3) : 0;

  const artistOccurrences = new Map<string, number>();
  for (const track of weighted) {
    for (const artistId of track.artistIds) {
      artistOccurrences.set(artistId, (artistOccurrences.get(artistId) ?? 0) + 1);
    }
  }
  const totalOccurrences = [...artistOccurrences.values()].reduce((sum, value) => sum + value, 0);
  const topOccurrence = Math.max(0, ...artistOccurrences.values());
  const topArtistShare = totalOccurrences > 0 ? round(topOccurrence / totalOccurrences, 3) : 0;

  /* ---------- madrugada e vintage ---------- */

  const nightPlays = snapshot.recentlyPlayed.filter((entry) => {
    const hour = new Date(entry.playedAt).getHours();
    return hour >= 0 && hour <= 5;
  }).length;
  const nightShare =
    snapshot.recentlyPlayed.length > 0 ? round(nightPlays / snapshot.recentlyPlayed.length, 3) : 0;

  const vintageShare =
    decades.length > 0
      ? round(
          decades
            .filter((decade) => decade.startYear < 2000)
            .reduce((sum, decade) => sum + decade.percentage, 0) / 100,
          3,
        )
      : 0;

  /* ---------- generos no top ---------- */

  const topGenresInTopArtists = new Set<string>();
  for (const artist of snapshot.topArtists.medium_term.slice(0, 20)) {
    for (const genre of artist.genres) topGenresInTopArtists.add(genre.toLowerCase());
  }

  /* ---------- persona ---------- */

  const { persona, runnerUps } = classifyPersona({
    features,
    genres,
    distinctGenres: distinct,
    topGenreShare: genres[0]?.percentage ?? 0,
    distinctGenresInTop: topGenresInTopArtists.size,
    nightShare,
    mainstreamScore,
    diversityScore,
    repeatRate,
    topArtistShare,
    vintageShare,
    uniqueArtists: Object.keys(snapshot.artistDetails).length,
  });

  /* ---------- evolucao short vs long term ---------- */

  const shortNames = snapshot.topArtists.short_term.slice(0, 25).map((artist) => artist.name);
  const longNames = snapshot.topArtists.long_term.slice(0, 25).map((artist) => artist.name);
  const longSet = new Set(longNames);
  const shortSet = new Set(shortNames);

  const shortFeatures = averageFeatures(snapshot.topTracks.short_term, snapshot.audioFeatures);
  const longFeatures = averageFeatures(snapshot.topTracks.long_term, snapshot.audioFeatures);

  const shortPopularity = mean(snapshot.topTracks.short_term.map((track) => track.popularity));
  const longPopularity = mean(snapshot.topTracks.long_term.map((track) => track.popularity));

  const estimatedHours = round(
    unique.reduce((sum, track) => sum + track.durationMs, 0) / 3_600_000,
    1,
  );

  return {
    averageFeatures: features,
    genres: genres.slice(0, 40),
    totalDistinctGenres: distinct,
    decades,
    averageReleaseYear: averageYear,
    soulYear: averageYear,
    listeningByHour: byHour,
    peakHour,
    heatmap,
    mainstreamScore,
    diversityScore,
    dominantMood: dominant,
    moodBreakdown: breakdown,
    persona,
    personaRunnerUps: runnerUps,
    repeatRate,
    topArtistShare,
    estimatedHours,
    uniqueArtists: Object.keys(snapshot.artistDetails).length,
    uniqueTracks: unique.length,
    evolution: {
      newArtistsShortTerm: shortNames.filter((name) => !longSet.has(name)).slice(0, 10),
      consistentArtists: shortNames.filter((name) => longSet.has(name)).slice(0, 10),
      droppedArtists: longNames.filter((name) => !shortSet.has(name)).slice(0, 10),
      energyDelta: round(shortFeatures.energy - longFeatures.energy, 3),
      valenceDelta: round(shortFeatures.valence - longFeatures.valence, 3),
      popularityDelta: round(shortPopularity - longPopularity, 1),
    },
  };
}

/** Exportado para reuso nas rotas de comparacao. */
export { moodFromFeatures, genreShare };

/* ============================================================
 * 5. Comparacao entre dois perfis
 * ============================================================ */

import type { CompareResult } from '../types';

function allTopArtists(snapshot: MusicSnapshot): ArtistLite[] {
  const seen = new Set<string>();
  const artists: ArtistLite[] = [];
  for (const artist of [
    ...snapshot.topArtists.short_term,
    ...snapshot.topArtists.medium_term,
    ...snapshot.topArtists.long_term,
  ]) {
    if (seen.has(artist.id)) continue;
    seen.add(artist.id);
    artists.push(artist);
  }
  return artists;
}

function allTopTracks(snapshot: MusicSnapshot): TrackLite[] {
  const seen = new Set<string>();
  const tracks: TrackLite[] = [];
  for (const track of [
    ...snapshot.topTracks.short_term,
    ...snapshot.topTracks.medium_term,
    ...snapshot.topTracks.long_term,
    ...snapshot.savedTracks,
  ]) {
    if (seen.has(track.id)) continue;
    seen.add(track.id);
    tracks.push(track);
  }
  return tracks;
}

/** Similaridade de cosseno entre dois vetores de percentual de genero. */
function genreCosine(a: GenreCount[], b: GenreCount[]): number {
  const mapA = new Map(a.map((entry) => [entry.genre, entry.percentage]));
  const mapB = new Map(b.map((entry) => [entry.genre, entry.percentage]));
  const keys = new Set([...mapA.keys(), ...mapB.keys()]);

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (const key of keys) {
    const valueA = mapA.get(key) ?? 0;
    const valueB = mapB.get(key) ?? 0;
    dot += valueA * valueB;
    normA += valueA * valueA;
    normB += valueB * valueB;
  }

  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/** 1 - distancia euclidiana normalizada sobre as 5 features principais. */
function featureSimilarity(a: AverageFeatures, b: AverageFeatures): number {
  const keys: Array<keyof AverageFeatures> = [
    'danceability',
    'energy',
    'valence',
    'acousticness',
    'instrumentalness',
  ];
  const sumSquares = keys.reduce((sum, key) => sum + (a[key] - b[key]) ** 2, 0);
  const distance = Math.sqrt(sumSquares / keys.length);
  return clamp01(1 - distance);
}

/** 1 - distancia de variacao total entre as distribuicoes de decada. */
function eraSimilarity(a: DecadeCount[], b: DecadeCount[]): number {
  if (a.length === 0 || b.length === 0) return 0.5;
  const mapA = new Map(a.map((entry) => [entry.startYear, entry.percentage / 100]));
  const mapB = new Map(b.map((entry) => [entry.startYear, entry.percentage / 100]));
  const keys = new Set([...mapA.keys(), ...mapB.keys()]);

  let total = 0;
  for (const key of keys) {
    total += Math.abs((mapA.get(key) ?? 0) - (mapB.get(key) ?? 0));
  }
  return clamp01(1 - total / 2);
}

function overlapRatio(sizeShared: number, sizeA: number, sizeB: number): number {
  const smaller = Math.min(sizeA, sizeB);
  if (smaller === 0) return 0;
  return clamp01(sizeShared / smaller);
}

const pct = (value: number): number => Math.round(value * 100);

export function compareSnapshots(
  a: { snapshot: MusicSnapshot; metrics: MusicMetrics },
  b: { snapshot: MusicSnapshot; metrics: MusicMetrics },
): CompareResult {
  const artistsA = allTopArtists(a.snapshot);
  const artistsB = allTopArtists(b.snapshot);
  const idsB = new Set(artistsB.map((artist) => artist.id));

  const sharedArtists = artistsA
    .filter((artist) => idsB.has(artist.id))
    .slice(0, 24)
    .map((artist) => ({ id: artist.id, name: artist.name, imageUrl: artist.imageUrl }));

  const genresA = a.metrics.genres.slice(0, 25);
  const genresB = b.metrics.genres.slice(0, 25);
  const genreNamesB = new Set(genresB.map((entry) => entry.genre));
  const sharedGenres = genresA.filter((entry) => genreNamesB.has(entry.genre)).map((entry) => entry.genre);

  const tracksA = allTopTracks(a.snapshot);
  const tracksB = allTopTracks(b.snapshot);
  const trackIdsB = new Set(tracksB.map((track) => track.id));
  const sharedTracksFull = tracksA.filter((track) => trackIdsB.has(track.id));

  const sharedTracks = sharedTracksFull.slice(0, 20).map((track) => ({
    id: track.id,
    name: track.name,
    artist: track.artistNames.join(', '),
    albumImage: track.albumImage,
  }));

  /* ---------- score ---------- */

  const artistScore = overlapRatio(
    artistsA.filter((artist) => idsB.has(artist.id)).length,
    artistsA.length,
    artistsB.length,
  );
  const genreScore = genreCosine(genresA, genresB);
  const featureScore = featureSimilarity(a.metrics.averageFeatures, b.metrics.averageFeatures);
  const eraScore = eraSimilarity(a.metrics.decades, b.metrics.decades);

  // Overlap de artistas raramente passa de 30% entre pessoas reais,
  // por isso ele entra com curva mais generosa que os outros eixos.
  const artistCurved = clamp01(Math.sqrt(artistScore));

  const compatibility = Math.round(
    (artistCurved * 0.35 + genreScore * 0.3 + featureScore * 0.2 + eraScore * 0.15) * 100,
  );

  /* ---------- diferencas ---------- */

  const differences: string[] = [];
  const energyGap = a.metrics.averageFeatures.energy - b.metrics.averageFeatures.energy;
  const valenceGap = a.metrics.averageFeatures.valence - b.metrics.averageFeatures.valence;
  const mainstreamGap = a.metrics.mainstreamScore - b.metrics.mainstreamScore;
  const nameA = a.snapshot.user.displayName;
  const nameB = b.snapshot.user.displayName;

  if (Math.abs(energyGap) > 0.08) {
    const louder = energyGap > 0 ? nameA : nameB;
    differences.push(`${louder} escuta com ${pct(Math.abs(energyGap))}% mais energia.`);
  }
  if (Math.abs(valenceGap) > 0.08) {
    const happier = valenceGap > 0 ? nameA : nameB;
    differences.push(`${happier} puxa para o lado mais luminoso: ${pct(Math.abs(valenceGap))}% mais valencia.`);
  }
  if (Math.abs(mainstreamGap) > 8) {
    const mainstream = mainstreamGap > 0 ? nameA : nameB;
    const underground = mainstreamGap > 0 ? nameB : nameA;
    differences.push(`${mainstream} fica mais perto das paradas; ${underground} garimpa mais fundo.`);
  }
  if (a.metrics.persona.key !== b.metrics.persona.key) {
    differences.push(`Personas diferentes: ${a.metrics.persona.name} e ${b.metrics.persona.name}.`);
  }
  const yearA = a.metrics.averageReleaseYear;
  const yearB = b.metrics.averageReleaseYear;
  if (yearA && yearB && Math.abs(yearA - yearB) >= 3) {
    const older = yearA < yearB ? nameA : nameB;
    differences.push(`${older} vive numa era anterior: ${Math.abs(yearA - yearB)} anos de diferenca na media de lancamento.`);
  }
  if (differences.length === 0) {
    differences.push('Os gostos sao surpreendentemente alinhados — poucas arestas para negociar.');
  }

  /* ---------- playlist sugerida ---------- */

  const suggested: CompareResult['suggestedPlaylist'] = [];
  const usedIds = new Set<string>();

  const pushTrack = (track: TrackLite, fromUser: string) => {
    if (usedIds.has(track.id) || suggested.length >= 20) return;
    usedIds.add(track.id);
    suggested.push({
      id: track.id,
      name: track.name,
      artist: track.artistNames.join(', '),
      albumImage: track.albumImage,
      previewUrl: track.previewUrl,
      spotifyUrl: track.spotifyUrl,
      fromUser,
    });
  };

  // Musicas em comum abrem a playlist.
  for (const track of sharedTracksFull.slice(0, 8)) pushTrack(track, 'ambos');

  // Depois alterna os tops de cada um, priorizando generos compartilhados.
  const sharedGenreSet = new Set(sharedGenres);
  const rank = (snapshot: MusicSnapshot) => (track: TrackLite) => {
    const genres = track.artistIds.flatMap((id) => snapshot.artistDetails[id]?.genres ?? []);
    return genres.some((genre) => sharedGenreSet.has(genre.toLowerCase())) ? 0 : 1;
  };

  const rankedA = [...a.snapshot.topTracks.medium_term].sort(
    (x, y) => rank(a.snapshot)(x) - rank(a.snapshot)(y),
  );
  const rankedB = [...b.snapshot.topTracks.medium_term].sort(
    (x, y) => rank(b.snapshot)(x) - rank(b.snapshot)(y),
  );

  for (let index = 0; index < Math.max(rankedA.length, rankedB.length); index += 1) {
    const trackA = rankedA[index];
    const trackB = rankedB[index];
    if (trackA) pushTrack(trackA, nameA);
    if (trackB) pushTrack(trackB, nameB);
    if (suggested.length >= 20) break;
  }

  /* ---------- veredito ---------- */

  let verdict: string;
  if (compatibility >= 80) {
    verdict = 'Voces praticamente dividem os mesmos fones. Um rodizio de playlist funcionaria sem discussao.';
  } else if (compatibility >= 60) {
    verdict = 'Base comum solida com espaco para descoberta — a combinacao ideal para trocar recomendacoes.';
  } else if (compatibility >= 40) {
    verdict = 'Territorios que se cruzam em alguns pontos. Cada um tem muito a mostrar para o outro.';
  } else if (compatibility >= 20) {
    verdict = 'Gostos bem distintos. A playlist conjunta vai ser uma negociacao — e talvez a mais interessante.';
  } else {
    verdict = 'Universos sonoros quase opostos. Ou da errado, ou vira a melhor descoberta do ano.';
  }

  return {
    compatibility,
    breakdown: {
      artists: pct(artistCurved),
      genres: pct(genreScore),
      features: pct(featureScore),
      eras: pct(eraScore),
    },
    users: [
      {
        name: nameA,
        imageUrl: a.snapshot.user.imageUrl,
        topArtist: artistsA[0]?.name ?? null,
        topGenre: genresA[0]?.genre ?? null,
      },
      {
        name: nameB,
        imageUrl: b.snapshot.user.imageUrl,
        topArtist: artistsB[0]?.name ?? null,
        topGenre: genresB[0]?.genre ?? null,
      },
    ],
    sharedArtists,
    sharedGenres: sharedGenres.slice(0, 20),
    sharedTracks,
    differences,
    suggestedPlaylist: suggested,
    verdict,
  };
}
