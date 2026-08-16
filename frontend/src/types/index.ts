/**
 * Tipos do Soundscape no frontend.
 *
 * Espelham exatamente os modelos que o backend devolve
 * (`backend/src/types/index.ts`). Ao mudar um lado, mude o outro.
 */

/* ============================================================
 * Modelos base
 * ============================================================ */

export type SpotifyTimeRange = 'short_term' | 'medium_term' | 'long_term';

export type TimeRangeMap<T> = Record<SpotifyTimeRange, T>;

export interface SessionUser {
  id: string;
  displayName: string;
  email?: string;
  country?: string;
  product?: string;
  imageUrl: string | null;
  followers: number;
  spotifyUrl: string;
}

export interface TrackLite {
  id: string;
  name: string;
  artistNames: string[];
  artistIds: string[];
  albumName: string;
  albumId: string;
  albumImage: string | null;
  releaseDate: string;
  releaseYear: number | null;
  durationMs: number;
  popularity: number;
  previewUrl: string | null;
  spotifyUrl: string;
  uri: string;
  explicit: boolean;
}

export interface ArtistLite {
  id: string;
  name: string;
  genres: string[];
  popularity: number;
  imageUrl: string | null;
  followers: number;
  spotifyUrl: string;
  uri: string;
}

export interface PlayHistoryLite {
  track: TrackLite;
  playedAt: string;
}

export interface AudioFeaturesLite {
  id: string;
  danceability: number;
  energy: number;
  valence: number;
  acousticness: number;
  instrumentalness: number;
  speechiness: number;
  liveness: number;
  tempo: number;
  key: number;
  mode: number;
  loudness: number;
  durationMs: number;
}

export interface PlaylistLite {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  ownerName: string;
  isOwner: boolean;
  collaborative: boolean;
  public: boolean | null;
  totalTracks: number;
  spotifyUrl: string;
  tracks: TrackLite[];
}

export interface NowPlaying {
  track: TrackLite;
  isPlaying: boolean;
  progressMs: number | null;
}

export interface SnapshotMeta {
  collectedAt: string;
  trackCount: number;
  artistCount: number;
  audioFeaturesCount: number;
  /** true quando o Spotify nao libera /audio-features: as features sao estimadas. */
  audioFeaturesUnavailable: boolean;
  hasEnoughData: boolean;
  warnings: string[];
  durationMs: number;
}

export interface MusicSnapshot {
  user: SessionUser;
  topArtists: TimeRangeMap<ArtistLite[]>;
  topTracks: TimeRangeMap<TrackLite[]>;
  recentlyPlayed: PlayHistoryLite[];
  savedTracks: TrackLite[];
  playlists: PlaylistLite[];
  followedArtists: ArtistLite[];
  audioFeatures: Record<string, AudioFeaturesLite>;
  artistDetails: Record<string, ArtistLite>;
  currentlyPlaying: NowPlaying | null;
  meta: SnapshotMeta;
}

/* ============================================================
 * Metricas
 * ============================================================ */

export interface AverageFeatures {
  danceability: number;
  energy: number;
  valence: number;
  acousticness: number;
  instrumentalness: number;
  speechiness: number;
  liveness: number;
  tempo: number;
  loudness: number;
}

export interface GenreCount {
  genre: string;
  count: number;
  percentage: number;
}

export interface DecadeCount {
  decade: string;
  startYear: number;
  count: number;
  percentage: number;
}

export interface HourCount {
  hour: number;
  count: number;
}

export interface WeekdayHourCell {
  weekday: number;
  hour: number;
  count: number;
}

export type MoodName =
  | 'energetico'
  | 'melancolico'
  | 'feliz'
  | 'chill'
  | 'agressivo'
  | 'romantico'
  | 'neutro';

export interface PersonaResult {
  key: string;
  name: string;
  description: string;
  score: number;
  evidence: string[];
}

export interface MusicMetrics {
  averageFeatures: AverageFeatures;
  genres: GenreCount[];
  totalDistinctGenres: number;
  decades: DecadeCount[];
  averageReleaseYear: number | null;
  soulYear: number | null;
  listeningByHour: HourCount[];
  peakHour: number | null;
  heatmap: WeekdayHourCell[];
  mainstreamScore: number;
  diversityScore: number;
  dominantMood: MoodName;
  moodBreakdown: Record<MoodName, number>;
  persona: PersonaResult;
  personaRunnerUps: PersonaResult[];
  repeatRate: number;
  topArtistShare: number;
  estimatedHours: number;
  uniqueArtists: number;
  uniqueTracks: number;
  evolution: {
    newArtistsShortTerm: string[];
    consistentArtists: string[];
    droppedArtists: string[];
    energyDelta: number;
    valenceDelta: number;
    popularityDelta: number;
  };
}

/* ============================================================
 * IA
 * ============================================================ */

export interface AIRecommendation {
  name: string;
  reason: string;
  similarTo: string;
  genre?: string;
  mood?: string;
  energy?: 'baixa' | 'media' | 'alta';
  spotify?: {
    id: string;
    imageUrl: string | null;
    spotifyUrl: string;
    genres: string[];
    popularity: number;
    previewUrl: string | null;
    topTrackName: string | null;
  } | null;
}

export interface AIProfile {
  headline: string;
  biography: string;
  persona: string;
  personaDescription: string;
  strengths: string[];
  quirks: string[];
  musicianComparison: string;
  filmSoundtrack: string;
  colorMood: string;
  moodBoard: string[];
  shareableQuote: string;
  hiddenTrait: string;
  evolutionNote: string;
  recommendations: AIRecommendation[];
  generatedAt: string;
  model: string;
  /** true = perfil deterministico (IA indisponivel ou falhou). */
  fallback: boolean;
}

/* ============================================================
 * Comparacao
 * ============================================================ */

export interface CompareResult {
  compatibility: number;
  breakdown: {
    artists: number;
    genres: number;
    features: number;
    eras: number;
  };
  users: Array<{
    name: string;
    imageUrl: string | null;
    topArtist: string | null;
    topGenre: string | null;
  }>;
  sharedArtists: Array<{ id: string; name: string; imageUrl: string | null }>;
  sharedGenres: string[];
  sharedTracks: Array<{ id: string; name: string; artist: string; albumImage: string | null }>;
  differences: string[];
  suggestedPlaylist: Array<{
    id: string;
    name: string;
    artist: string;
    albumImage: string | null;
    previewUrl: string | null;
    spotifyUrl: string;
    fromUser: string;
  }>;
  verdict: string;
}

export interface CompareLinkInfo {
  code: string;
  ownerName: string;
  ownerImage: string | null;
  ready: boolean;
  expiresAt: string;
}

/* ============================================================
 * Respostas da API
 * ============================================================ */

export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

export interface ApiFailure {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface LoginPayload {
  url: string;
  state: string;
  redirectUri: string;
  scopes: string[];
}

export interface CallbackPayload {
  sessionToken: string;
  user: SessionUser;
  expiresAt: string;
}

export interface SnapshotPayload {
  snapshot: MusicSnapshot;
  metrics: MusicMetrics;
  cached: boolean;
}

export interface AIProfilePayload {
  profile: AIProfile | null;
  cached: boolean;
  aiEnabled?: boolean;
}

/* ============================================================
 * Tipos de apresentacao
 * ============================================================ */

/** Paleta extraida das capas dos albuns. */
export interface VibePalette {
  primary: string;
  secondary: string;
  tertiary: string;
  /** Cores brutas ordenadas por frequencia. */
  swatches: string[];
}

export type CardTheme = 'dark' | 'light' | 'vibe';
export type CardFormat = 'story' | 'post';

export type ShareCardId =
  | 'profile'
  | 'top-artists'
  | 'top-tracks'
  | 'radar'
  | 'era'
  | 'secret-listener'
  | 'stats'
  | 'ai-verdict';

export interface PlaylistAnalysis {
  playlist: PlaylistLite;
  features: AverageFeatures;
  mood: MoodName;
  averageTempo: number;
  averagePopularity: number;
  distinctGenres: number;
  diversityScore: number;
  topArtists: Array<{ name: string; count: number }>;
  topGenres: string[];
  goodFor: string[];
  averageYear: number | null;
  analyzedTracks: number;
}
