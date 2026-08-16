/**
 * Tipos compartilhados do backend do Soundscape.
 *
 * Organizados em tres grupos:
 *  1. Spotify Web API (subconjunto dos campos que realmente usamos)
 *  2. Sessao / autenticacao
 *  3. Analise musical + contrato da IA
 */

/* ============================================================
 * 1. Spotify Web API
 * ============================================================ */

export interface SpotifyImage {
  url: string;
  height: number | null;
  width: number | null;
}

export interface SpotifyExternalUrls {
  spotify?: string;
}

export interface SpotifyFollowers {
  href: string | null;
  total: number;
}

export interface SpotifyUser {
  id: string;
  display_name: string | null;
  email?: string;
  country?: string;
  product?: string;
  images: SpotifyImage[];
  followers?: SpotifyFollowers;
  external_urls: SpotifyExternalUrls;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  genres: string[];
  popularity: number;
  images: SpotifyImage[];
  followers?: SpotifyFollowers;
  external_urls: SpotifyExternalUrls;
  uri: string;
}

/** Artista simplificado como vem embutido em tracks/albums. */
export interface SpotifyArtistBrief {
  id: string;
  name: string;
  external_urls: SpotifyExternalUrls;
  uri: string;
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  album_type: string;
  release_date: string;
  release_date_precision: 'year' | 'month' | 'day';
  total_tracks: number;
  images: SpotifyImage[];
  artists: SpotifyArtistBrief[];
  external_urls: SpotifyExternalUrls;
  uri: string;
}

export interface SpotifyTrack {
  id: string | null;
  name: string;
  duration_ms: number;
  explicit: boolean;
  popularity: number;
  preview_url: string | null;
  track_number: number;
  is_local?: boolean;
  album: SpotifyAlbum;
  artists: SpotifyArtistBrief[];
  external_urls: SpotifyExternalUrls;
  uri: string;
}

export interface SpotifyAudioFeatures {
  id: string;
  danceability: number;
  energy: number;
  key: number;
  loudness: number;
  mode: number;
  speechiness: number;
  acousticness: number;
  instrumentalness: number;
  liveness: number;
  valence: number;
  tempo: number;
  duration_ms: number;
  time_signature: number;
}

export interface SpotifyPlaylistOwner {
  id: string;
  display_name: string | null;
  external_urls: SpotifyExternalUrls;
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string | null;
  public: boolean | null;
  collaborative: boolean;
  images: SpotifyImage[] | null;
  owner: SpotifyPlaylistOwner;
  tracks: { href: string; total: number };
  external_urls: SpotifyExternalUrls;
  uri: string;
  snapshot_id: string;
}

export interface SpotifyPlaylistTrackItem {
  added_at: string | null;
  is_local: boolean;
  track: SpotifyTrack | null;
}

export interface SpotifySavedTrack {
  added_at: string;
  track: SpotifyTrack;
}

export interface SpotifyPlayHistoryItem {
  track: SpotifyTrack;
  played_at: string;
  context: { type: string; uri: string } | null;
}

export interface SpotifyCurrentlyPlaying {
  is_playing: boolean;
  progress_ms: number | null;
  currently_playing_type: string;
  item: SpotifyTrack | null;
}

export interface SpotifyPaging<T> {
  href: string;
  items: T[];
  limit: number;
  next: string | null;
  offset: number;
  previous: string | null;
  total: number;
}

export interface SpotifyCursorPaging<T> {
  href: string;
  items: T[];
  limit: number;
  next: string | null;
  cursors: { after?: string; before?: string } | null;
  total?: number;
}

export type SpotifyTimeRange = 'short_term' | 'medium_term' | 'long_term';

export interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
  refresh_token?: string;
}

/* ============================================================
 * 2. Sessao / autenticacao
 * ============================================================ */

export interface SpotifyTokens {
  accessToken: string;
  refreshToken: string;
  /** Epoch em ms de quando o access token expira. */
  expiresAt: number;
  scope: string;
}

export interface Session {
  /** UUID entregue ao browser (X-Session-Token). */
  id: string;
  tokens: SpotifyTokens;
  user: SessionUser;
  createdAt: number;
  lastSeenAt: number;
  expiresAt: number;
  /** Cache do snapshot musical para nao refazer ~30 chamadas na Spotify API. */
  snapshot?: MusicSnapshot;
  snapshotAt?: number;
  /** Cache da analise de IA (ela e caro/lenta). */
  aiProfile?: AIProfile;
  aiProfileAt?: number;
}

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

/** Link publico de comparacao gerado por um usuario. */
export interface CompareLink {
  code: string;
  ownerSessionId: string;
  ownerName: string;
  ownerImage: string | null;
  createdAt: number;
  expiresAt: number;
  /** Preenchido quando um amigo conclui a comparacao. */
  guestSessionId?: string;
}

/* ============================================================
 * 3. Analise musical
 * ============================================================ */

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
  /** Amostra das tracks (limitada para nao estourar payload). */
  tracks: TrackLite[];
}

export type TimeRangeMap<T> = Record<SpotifyTimeRange, T>;

/** Payload completo coletado do Spotify e entregue ao frontend. */
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
  currentlyPlaying: { track: TrackLite; isPlaying: boolean; progressMs: number | null } | null;
  meta: SnapshotMeta;
}

export interface SnapshotMeta {
  collectedAt: string;
  trackCount: number;
  artistCount: number;
  audioFeaturesCount: number;
  /** true quando a Spotify API nao liberou /audio-features para este app. */
  audioFeaturesUnavailable: boolean;
  hasEnoughData: boolean;
  warnings: string[];
  durationMs: number;
}

/* -------- metricas derivadas -------- */

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
 * 4. Contrato da IA
 * ============================================================ */

export interface AIRecommendation {
  name: string;
  reason: string;
  similarTo: string;
  genre?: string;
  mood?: string;
  energy?: 'baixa' | 'media' | 'alta';
  /** Enriquecido pelo backend via Spotify Search. */
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
  /** Metadados adicionados pelo backend. */
  generatedAt: string;
  model: string;
  fallback: boolean;
}

/* ============================================================
 * 5. Compare
 * ============================================================ */

export interface CompareResult {
  compatibility: number;
  breakdown: {
    artists: number;
    genres: number;
    features: number;
    eras: number;
  };
  users: Array<{ name: string; imageUrl: string | null; topArtist: string | null; topGenre: string | null }>;
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

/* ============================================================
 * 6. Utilitarios de resposta
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

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;
