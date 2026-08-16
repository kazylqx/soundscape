import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import { env } from '../utils/env';
import { logger } from '../utils/logger';
import { AppError, unauthorized, upstreamError } from '../utils/errors';
import { forceRefresh, getValidAccessToken } from './tokenService';
import { cacheSnapshot, getCachedSnapshot } from './sessionService';
import { computeMetrics, estimateFeaturesForTracks } from '../utils/musicAnalyzer';
import type {
  ArtistLite,
  AudioFeaturesLite,
  MusicSnapshot,
  PlayHistoryLite,
  PlaylistLite,
  Session,
  SessionUser,
  SnapshotMeta,
  SpotifyArtist,
  SpotifyAudioFeatures,
  SpotifyCurrentlyPlaying,
  SpotifyCursorPaging,
  SpotifyPaging,
  SpotifyPlayHistoryItem,
  SpotifyPlaylist,
  SpotifyPlaylistTrackItem,
  SpotifySavedTrack,
  SpotifyTimeRange,
  SpotifyTrack,
  SpotifyUser,
  TimeRangeMap,
  TrackLite,
} from '../types';

/**
 * Camada de acesso a Spotify Web API.
 *
 * Responsabilidades:
 *  - fila com concorrencia limitada (nao martelar a API)
 *  - retry com backoff exponencial em 429 / 5xx / erro de rede
 *  - refresh transparente do access token quando a API responde 401
 *  - normalizacao dos payloads do Spotify em modelos "lite" enxutos
 */

/* ============================================================
 * Limites
 * ============================================================ */

const TIME_RANGES: SpotifyTimeRange[] = ['short_term', 'medium_term', 'long_term'];

const LIMITS = {
  /** Requisicoes simultaneas contra a Spotify API. */
  concurrency: 5,
  maxRetries: 4,
  topItems: 50,
  recentlyPlayed: 50,
  savedTracks: 200,
  followedArtists: 200,
  /** Playlists que terao as tracks coletadas (as demais ficam so com metadados). */
  playlistsWithTracks: 40,
  tracksPerPlaylist: 100,
  /** Teto de tracks enviadas para /audio-features. */
  audioFeatureTracks: 900,
  /** Teto de artistas detalhados. */
  artistDetails: 350,
  /**
   * Teto quando o endpoint em lote esta bloqueado e cada artista custa uma
   * requisicao. Mais baixo de proposito, para nao estourar o rate limit.
   */
  artistDetailsIndividual: 160,
} as const;

const BATCH = {
  audioFeatures: 100,
  artists: 50,
} as const;

/* ============================================================
 * Fila com concorrencia limitada
 * ============================================================ */

let activeRequests = 0;
const slotQueue: Array<() => void> = [];

function acquireSlot(): Promise<void> {
  if (activeRequests < LIMITS.concurrency) {
    activeRequests += 1;
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => {
    slotQueue.push(() => {
      activeRequests += 1;
      resolve();
    });
  });
}

function releaseSlot(): void {
  activeRequests = Math.max(0, activeRequests - 1);
  const next = slotQueue.shift();
  if (next) next();
}

/** Garante que cada chamada ocupa e libera exatamente um slot. */
async function withSlot<T>(task: () => Promise<T>): Promise<T> {
  await acquireSlot();
  try {
    return await task();
  } finally {
    releaseSlot();
  }
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/* ============================================================
 * Cliente HTTP
 * ============================================================ */

const http: AxiosInstance = axios.create({
  baseURL: env.spotify.apiUrl,
  timeout: 20_000,
  headers: { Accept: 'application/json' },
});

interface RequestOptions extends AxiosRequestConfig {
  /** Marca a chamada como nao critica (apenas muda o nivel de log). */
  optional?: boolean;
}

function retryDelay(attempt: number, retryAfterHeader?: string): number {
  if (retryAfterHeader) {
    const seconds = Number(retryAfterHeader);
    if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1000 + 250, 30_000);
  }
  const base = 2 ** attempt * 500;
  return Math.min(base + Math.random() * 300, 15_000);
}

/**
 * Executa uma chamada autenticada na Spotify API com retry e backoff.
 * O sleep do backoff acontece FORA do slot de concorrencia, para nao
 * bloquear as outras requisicoes da fila.
 */
async function spotifyRequest<T>(session: Session, path: string, options: RequestOptions = {}): Promise<T> {
  const { optional, ...config } = options;
  let refreshedOnce = false;

  for (let attempt = 0; attempt <= LIMITS.maxRetries; attempt += 1) {
    try {
      return await withSlot(async () => {
        const accessToken = await getValidAccessToken(session);
        const response = await http.request<T>({
          url: path,
          method: 'GET',
          ...config,
          headers: { ...config.headers, Authorization: `Bearer ${accessToken}` },
        });
        return response.data;
      });
    } catch (error) {
      if (error instanceof AppError) throw error;

      const axiosError = error as AxiosError<{ error?: { status?: number; message?: string } }>;
      const status = axiosError.response?.status;
      const spotifyMessage = axiosError.response?.data?.error?.message;

      // 401 -> um refresh forcado e mais uma tentativa.
      if (status === 401) {
        if (refreshedOnce) {
          throw unauthorized('Acesso ao Spotify expirado. Conecte novamente.', 'SPOTIFY_UNAUTHORIZED');
        }
        refreshedOnce = true;
        logger.debug('Spotify respondeu 401 — forcando refresh do token', { path });
        await forceRefresh(session);
        continue;
      }

      if (status === 403) {
        throw new AppError(
          403,
          'SPOTIFY_FORBIDDEN',
          spotifyMessage || 'Acesso negado pelo Spotify para este recurso.',
        );
      }

      if (status === 404) {
        throw new AppError(
          404,
          'SPOTIFY_NOT_FOUND',
          spotifyMessage || 'Recurso nao encontrado no Spotify.',
        );
      }

      const retryable = status === 429 || status === undefined || (status >= 500 && status <= 599);

      if (retryable && attempt < LIMITS.maxRetries) {
        const retryAfter = axiosError.response?.headers?.['retry-after'];
        const wait = retryDelay(attempt, typeof retryAfter === 'string' ? retryAfter : undefined);
        logger.warn('Spotify: rate limit ou erro transitorio, aguardando para tentar de novo', {
          path,
          status: status ?? 'network',
          attempt: attempt + 1,
          waitMs: wait,
          optional: Boolean(optional),
        });
        await sleep(wait);
        continue;
      }

      if (status === 429) {
        throw new AppError(
          429,
          'SPOTIFY_RATE_LIMITED',
          'O Spotify limitou as requisicoes. Tente novamente em instantes.',
        );
      }

      throw upstreamError(spotifyMessage || 'Falha ao consultar a Spotify API.', 'SPOTIFY_REQUEST_FAILED', {
        path,
        status: status ?? null,
      });
    }
  }

  throw upstreamError(
    'Falha ao consultar a Spotify API depois de varias tentativas.',
    'SPOTIFY_EXHAUSTED',
    { path },
  );
}

/** Variante tolerante: registra um aviso e devolve `fallback` em vez de propagar. */
async function optionalRequest<T>(
  session: Session,
  path: string,
  fallback: T,
  warnings: string[],
  label: string,
  config: AxiosRequestConfig = {},
): Promise<T> {
  try {
    return await spotifyRequest<T>(session, path, { ...config, optional: true });
  } catch (error) {
    const message = error instanceof AppError ? error.message : 'erro desconhecido';
    // 401 deve derrubar a coleta inteira — a sessao nao vale mais.
    if (error instanceof AppError && error.status === 401) throw error;
    warnings.push(`${label}: ${message}`);
    logger.warn(`Coleta parcial — ${label}`, { message });
    return fallback;
  }
}

/* ============================================================
 * Mappers
 * ============================================================ */

function pickImage(images: Array<{ url: string }> | null | undefined): string | null {
  if (!images || images.length === 0) return null;
  return images[0]?.url ?? null;
}

function parseReleaseYear(releaseDate: string | undefined): number | null {
  if (!releaseDate) return null;
  const year = Number(releaseDate.slice(0, 4));
  const maxYear = new Date().getFullYear() + 1;
  return Number.isFinite(year) && year > 1900 && year <= maxYear ? year : null;
}

export function toSessionUser(user: SpotifyUser): SessionUser {
  return {
    id: user.id,
    displayName: user.display_name || 'Ouvinte anonimo',
    email: user.email,
    country: user.country,
    product: user.product,
    imageUrl: pickImage(user.images),
    followers: user.followers?.total ?? 0,
    spotifyUrl: user.external_urls?.spotify || `https://open.spotify.com/user/${user.id}`,
  };
}

function toTrackLite(track: SpotifyTrack | null | undefined): TrackLite | null {
  if (!track || !track.id) return null;
  return {
    id: track.id,
    name: track.name,
    artistNames: (track.artists || []).map((artist) => artist.name),
    artistIds: (track.artists || []).map((artist) => artist.id).filter(Boolean),
    albumName: track.album?.name || '',
    albumId: track.album?.id || '',
    albumImage: pickImage(track.album?.images),
    releaseDate: track.album?.release_date || '',
    releaseYear: parseReleaseYear(track.album?.release_date),
    durationMs: track.duration_ms ?? 0,
    popularity: track.popularity ?? 0,
    previewUrl: track.preview_url ?? null,
    spotifyUrl: track.external_urls?.spotify || `https://open.spotify.com/track/${track.id}`,
    uri: track.uri,
    explicit: Boolean(track.explicit),
  };
}

function toArtistLite(artist: SpotifyArtist): ArtistLite {
  return {
    id: artist.id,
    name: artist.name,
    genres: artist.genres || [],
    popularity: artist.popularity ?? 0,
    imageUrl: pickImage(artist.images),
    followers: artist.followers?.total ?? 0,
    spotifyUrl: artist.external_urls?.spotify || `https://open.spotify.com/artist/${artist.id}`,
    uri: artist.uri,
  };
}

function toAudioFeaturesLite(features: SpotifyAudioFeatures): AudioFeaturesLite {
  return {
    id: features.id,
    danceability: features.danceability,
    energy: features.energy,
    valence: features.valence,
    acousticness: features.acousticness,
    instrumentalness: features.instrumentalness,
    speechiness: features.speechiness,
    liveness: features.liveness,
    tempo: features.tempo,
    key: features.key,
    mode: features.mode,
    loudness: features.loudness,
    durationMs: features.duration_ms,
  };
}

/* ============================================================
 * Endpoints individuais
 * ============================================================ */

export function getMe(session: Session): Promise<SpotifyUser> {
  return spotifyRequest<SpotifyUser>(session, '/me');
}

async function getTopArtists(
  session: Session,
  timeRange: SpotifyTimeRange,
  warnings: string[],
): Promise<ArtistLite[]> {
  const page = await optionalRequest<SpotifyPaging<SpotifyArtist>>(
    session,
    '/me/top/artists',
    { items: [] } as unknown as SpotifyPaging<SpotifyArtist>,
    warnings,
    `top artists (${timeRange})`,
    { params: { time_range: timeRange, limit: LIMITS.topItems } },
  );
  return (page.items || []).map(toArtistLite);
}

async function getTopTracks(
  session: Session,
  timeRange: SpotifyTimeRange,
  warnings: string[],
): Promise<TrackLite[]> {
  const page = await optionalRequest<SpotifyPaging<SpotifyTrack>>(
    session,
    '/me/top/tracks',
    { items: [] } as unknown as SpotifyPaging<SpotifyTrack>,
    warnings,
    `top tracks (${timeRange})`,
    { params: { time_range: timeRange, limit: LIMITS.topItems } },
  );
  return (page.items || []).map(toTrackLite).filter((track): track is TrackLite => track !== null);
}

async function getRecentlyPlayed(session: Session, warnings: string[]): Promise<PlayHistoryLite[]> {
  const page = await optionalRequest<SpotifyCursorPaging<SpotifyPlayHistoryItem>>(
    session,
    '/me/player/recently-played',
    { items: [] } as unknown as SpotifyCursorPaging<SpotifyPlayHistoryItem>,
    warnings,
    'recently played',
    { params: { limit: LIMITS.recentlyPlayed } },
  );

  const history: PlayHistoryLite[] = [];
  for (const item of page.items || []) {
    const track = toTrackLite(item.track);
    if (track) history.push({ track, playedAt: item.played_at });
  }
  return history;
}

async function getSavedTracks(session: Session, warnings: string[]): Promise<TrackLite[]> {
  const collected: TrackLite[] = [];
  const pageSize = 50;

  for (let offset = 0; offset < LIMITS.savedTracks; offset += pageSize) {
    const page = await optionalRequest<SpotifyPaging<SpotifySavedTrack>>(
      session,
      '/me/tracks',
      { items: [], next: null } as unknown as SpotifyPaging<SpotifySavedTrack>,
      warnings,
      'saved tracks',
      { params: { limit: pageSize, offset } },
    );

    const items = page.items || [];
    for (const item of items) {
      const track = toTrackLite(item.track);
      if (track) collected.push(track);
    }

    if (!page.next || items.length < pageSize) break;
  }

  return collected;
}

async function getFollowedArtists(session: Session, warnings: string[]): Promise<ArtistLite[]> {
  const collected: ArtistLite[] = [];
  let after: string | undefined;

  while (collected.length < LIMITS.followedArtists) {
    const params: Record<string, string | number> = { type: 'artist', limit: 50 };
    if (after) params.after = after;

    const payload = await optionalRequest<{ artists: SpotifyCursorPaging<SpotifyArtist> }>(
      session,
      '/me/following',
      { artists: { items: [], next: null, cursors: null } } as unknown as {
        artists: SpotifyCursorPaging<SpotifyArtist>;
      },
      warnings,
      'followed artists',
      { params },
    );

    const items = payload.artists?.items || [];
    collected.push(...items.map(toArtistLite));

    after = payload.artists?.cursors?.after;
    if (!after || items.length === 0) break;
  }

  return collected;
}

async function getPlaylists(
  session: Session,
  userId: string,
  warnings: string[],
): Promise<PlaylistLite[]> {
  const raw: SpotifyPlaylist[] = [];
  const pageSize = 50;

  for (let offset = 0; offset < 200; offset += pageSize) {
    const page = await optionalRequest<SpotifyPaging<SpotifyPlaylist>>(
      session,
      '/me/playlists',
      { items: [], next: null } as unknown as SpotifyPaging<SpotifyPlaylist>,
      warnings,
      'playlists',
      { params: { limit: pageSize, offset } },
    );

    const items = (page.items || []).filter(Boolean);
    raw.push(...items);
    if (!page.next || items.length < pageSize) break;
  }

  const playlists: PlaylistLite[] = raw.map((playlist) => ({
    id: playlist.id,
    name: playlist.name,
    description: playlist.description,
    imageUrl: pickImage(playlist.images),
    ownerName: playlist.owner?.display_name || 'Desconhecido',
    isOwner: playlist.owner?.id === userId,
    collaborative: Boolean(playlist.collaborative),
    public: playlist.public,
    totalTracks: playlist.tracks?.total ?? 0,
    spotifyUrl: playlist.external_urls?.spotify || `https://open.spotify.com/playlist/${playlist.id}`,
    tracks: [],
  }));

  // Prioriza playlists proprias e com mais musicas para buscar as tracks.
  const ranked = playlists
    .filter((playlist) => playlist.totalTracks > 0)
    .sort((a, b) => {
      if (a.isOwner !== b.isOwner) return a.isOwner ? -1 : 1;
      return b.totalTracks - a.totalTracks;
    })
    .slice(0, LIMITS.playlistsWithTracks);

  await Promise.all(
    ranked.map(async (playlist) => {
      const page = await optionalRequest<SpotifyPaging<SpotifyPlaylistTrackItem>>(
        session,
        `/playlists/${playlist.id}/tracks`,
        { items: [] } as unknown as SpotifyPaging<SpotifyPlaylistTrackItem>,
        warnings,
        `tracks da playlist "${playlist.name}"`,
        {
          params: {
            limit: LIMITS.tracksPerPlaylist,
            offset: 0,
            fields:
              'items(is_local,track(id,name,duration_ms,explicit,popularity,preview_url,uri,external_urls,artists(id,name,uri,external_urls),album(id,name,images,release_date,release_date_precision)))',
          },
        },
      );

      const tracks: TrackLite[] = [];
      for (const item of page.items || []) {
        if (item.is_local) continue;
        const track = toTrackLite(item.track);
        if (track) tracks.push(track);
      }
      playlist.tracks = tracks;
    }),
  );

  return playlists;
}

async function getCurrentlyPlaying(
  session: Session,
  warnings: string[],
): Promise<MusicSnapshot['currentlyPlaying']> {
  try {
    const data = await spotifyRequest<SpotifyCurrentlyPlaying | ''>(
      session,
      '/me/player/currently-playing',
      {
        optional: true,
        // 204 = nada tocando; axios devolve string vazia nesse caso.
        validateStatus: (status) => status === 200 || status === 204,
      },
    );

    if (!data || typeof data !== 'object' || !data.item) return null;

    const track = toTrackLite(data.item);
    if (!track) return null;

    return { track, isPlaying: Boolean(data.is_playing), progressMs: data.progress_ms ?? null };
  } catch (error) {
    if (error instanceof AppError && error.status === 401) throw error;
    const message = error instanceof AppError ? error.message : 'erro desconhecido';
    warnings.push(`currently playing: ${message}`);
    return null;
  }
}

/** Audio features em lotes de 100 IDs (limite da Spotify API). */
async function getAudioFeatures(
  session: Session,
  trackIds: string[],
  warnings: string[],
): Promise<{ features: Record<string, AudioFeaturesLite>; unavailable: boolean }> {
  const features: Record<string, AudioFeaturesLite> = {};
  const ids = trackIds.slice(0, LIMITS.audioFeatureTracks);
  let unavailable = false;

  for (let index = 0; index < ids.length; index += BATCH.audioFeatures) {
    const chunk = ids.slice(index, index + BATCH.audioFeatures);
    if (chunk.length === 0) continue;

    try {
      const data = await spotifyRequest<{ audio_features: Array<SpotifyAudioFeatures | null> }>(
        session,
        '/audio-features',
        { params: { ids: chunk.join(',') }, optional: true },
      );

      for (const item of data.audio_features || []) {
        if (item && item.id) features[item.id] = toAudioFeaturesLite(item);
      }
    } catch (error) {
      if (error instanceof AppError && error.status === 401) throw error;

      // Apps do Spotify criados a partir de 27/11/2024 recebem 403 em /audio-features.
      if (error instanceof AppError && error.status === 403) {
        unavailable = true;
        warnings.push(
          'audio features: o endpoint /audio-features nao esta liberado para este app do Spotify. As metricas sonoras serao estimadas a partir de genero, popularidade e duracao.',
        );
        break;
      }

      const message = error instanceof AppError ? error.message : 'falha parcial';
      warnings.push(`audio features: ${message}`);
    }
  }

  return { features, unavailable };
}

/** Um artista por requisicao — plano B quando o endpoint em lote esta bloqueado. */
async function getArtistById(session: Session, artistId: string): Promise<ArtistLite | null> {
  try {
    const artist = await spotifyRequest<SpotifyArtist>(session, `/artists/${artistId}`, {
      optional: true,
    });
    return artist && artist.id ? toArtistLite(artist) : null;
  } catch {
    return null;
  }
}

/**
 * Detalhes de artistas (genero, imagem, popularidade).
 *
 * O endpoint em lote `GET /artists` foi removido para apps em Development Mode
 * (mudanca de fevereiro de 2026) e responde 403. Quando isso acontece caimos
 * para `GET /artists/{id}`, uma requisicao por artista, com teto proprio para
 * nao estourar o rate limit.
 *
 * `known` traz os artistas que ja vieram completos de /me/top/artists e
 * /me/following — esses nao precisam de nenhuma requisicao extra.
 */
async function getArtistDetails(
  session: Session,
  artistIds: string[],
  known: Record<string, ArtistLite>,
  warnings: string[],
): Promise<Record<string, ArtistLite>> {
  const details: Record<string, ArtistLite> = {};
  const missing = artistIds.filter((id) => id && !known[id]).slice(0, LIMITS.artistDetails);

  let batchBlocked = false;

  for (let index = 0; index < missing.length; index += BATCH.artists) {
    const chunk = missing.slice(index, index + BATCH.artists);
    if (chunk.length === 0) continue;

    try {
      const data = await spotifyRequest<{ artists: Array<SpotifyArtist | null> }>(
        session,
        '/artists',
        { params: { ids: chunk.join(',') }, optional: true },
      );

      for (const artist of data.artists || []) {
        if (artist && artist.id) details[artist.id] = toArtistLite(artist);
      }
    } catch (error) {
      if (error instanceof AppError && error.status === 401) throw error;

      if (error instanceof AppError && error.status === 403) {
        batchBlocked = true;
        break;
      }

      const message = error instanceof AppError ? error.message : 'falha parcial';
      warnings.push(`detalhes de artistas: ${message}`);
    }
  }

  if (batchBlocked) {
    const pending = missing
      .filter((id) => !details[id])
      .slice(0, LIMITS.artistDetailsIndividual);

    logger.warn('Endpoint em lote /artists bloqueado — buscando artistas individualmente', {
      pendentes: pending.length,
      teto: LIMITS.artistDetailsIndividual,
    });

    const fetched = await Promise.all(pending.map((id) => getArtistById(session, id)));

    let recovered = 0;
    for (const artist of fetched) {
      if (!artist) continue;
      details[artist.id] = artist;
      recovered += 1;
    }

    if (recovered < pending.length) {
      warnings.push(
        `detalhes de artistas: ${recovered} de ${pending.length} artistas recuperados individualmente (o endpoint em lote /artists nao esta liberado para este app).`,
      );
    }
  }

  return details;
}

/** Busca um artista por nome — usada para enriquecer as recomendacoes da IA. */
export async function searchArtist(session: Session, name: string): Promise<ArtistLite | null> {
  try {
    const data = await spotifyRequest<{ artists: SpotifyPaging<SpotifyArtist> }>(session, '/search', {
      params: { q: name, type: 'artist', limit: 3 },
      optional: true,
    });

    const items = data.artists?.items || [];
    if (items.length === 0) return null;

    const normalized = name.trim().toLowerCase();
    const exact = items.find((artist) => artist.name.trim().toLowerCase() === normalized);
    const chosen = exact || items[0];
    return chosen ? toArtistLite(chosen) : null;
  } catch {
    return null;
  }
}

/** Top track de um artista — alimenta o preview de 30s nas recomendacoes. */
export async function getArtistTopTrack(session: Session, artistId: string): Promise<TrackLite | null> {
  try {
    const data = await spotifyRequest<{ tracks: SpotifyTrack[] }>(
      session,
      `/artists/${artistId}/top-tracks`,
      { params: { market: 'from_token' }, optional: true },
    );

    const tracks = (data.tracks || [])
      .map(toTrackLite)
      .filter((track): track is TrackLite => track !== null);

    if (tracks.length === 0) return null;
    return tracks.find((track) => track.previewUrl) || tracks[0] || null;
  } catch {
    return null;
  }
}

/* ============================================================
 * Snapshot completo
 * ============================================================ */

function toRangeMap<T>(values: T[]): TimeRangeMap<T> {
  return {
    short_term: values[0] as T,
    medium_term: values[1] as T,
    long_term: values[2] as T,
  };
}

/** Minimo de dados para o perfil valer a pena. */
const MIN_TRACKS_FOR_PROFILE = 10;

/**
 * Coleta tudo o que o Soundscape precisa em uma unica passada.
 *
 * Estrategia: primeiro os endpoints independentes em paralelo, depois os
 * derivados (audio features e detalhes de artistas) em lotes, ja que
 * dependem dos IDs coletados na primeira fase.
 */
export async function buildSnapshot(session: Session): Promise<MusicSnapshot> {
  const startedAt = Date.now();
  const warnings: string[] = [];

  logger.info('Coletando snapshot do Spotify', { sessionId: session.id });

  const [me, topArtistsByRange, topTracksByRange, recentlyPlayed, savedTracks, followedArtists] =
    await Promise.all([
      getMe(session),
      Promise.all(TIME_RANGES.map((range) => getTopArtists(session, range, warnings))),
      Promise.all(TIME_RANGES.map((range) => getTopTracks(session, range, warnings))),
      getRecentlyPlayed(session, warnings),
      getSavedTracks(session, warnings),
      getFollowedArtists(session, warnings),
    ]);

  const user = toSessionUser(me);

  // Playlists e "tocando agora" dependem do usuario / sao mais lentas.
  const [playlists, currentlyPlaying] = await Promise.all([
    getPlaylists(session, user.id, warnings),
    getCurrentlyPlaying(session, warnings),
  ]);

  const topArtists = toRangeMap(topArtistsByRange);
  const topTracks = toRangeMap(topTracksByRange);

  /* ---------- consolidacao de IDs ---------- */

  // Ordem importa: as tracks mais relevantes entram primeiro no teto de audio features.
  const allTracks: TrackLite[] = [
    ...topTracks.short_term,
    ...topTracks.medium_term,
    ...topTracks.long_term,
    ...recentlyPlayed.map((entry) => entry.track),
    ...savedTracks,
    ...playlists.flatMap((playlist) => playlist.tracks),
  ];
  if (currentlyPlaying) allTracks.push(currentlyPlaying.track);

  const trackIds: string[] = [];
  const seenTracks = new Set<string>();
  for (const track of allTracks) {
    if (seenTracks.has(track.id)) continue;
    seenTracks.add(track.id);
    trackIds.push(track.id);
  }

  const artistIds: string[] = [];
  const seenArtists = new Set<string>();
  const pushArtist = (id: string) => {
    if (!id || seenArtists.has(id)) return;
    seenArtists.add(id);
    artistIds.push(id);
  };
  for (const artist of [...topArtists.short_term, ...topArtists.medium_term, ...topArtists.long_term]) {
    pushArtist(artist.id);
  }
  for (const artist of followedArtists) pushArtist(artist.id);
  for (const track of allTracks) {
    for (const id of track.artistIds) pushArtist(id);
  }

  /* ---------- fase derivada ---------- */

  /**
   * /me/top/artists e /me/following ja devolvem o artista completo (com
   * generos). Montamos esse mapa primeiro para nao gastar requisicao com quem
   * ja conhecemos — importante porque, sem o endpoint em lote, cada artista
   * restante custa uma chamada.
   */
  const knownArtists: Record<string, ArtistLite> = {};
  for (const artist of [
    ...topArtists.short_term,
    ...topArtists.medium_term,
    ...topArtists.long_term,
    ...followedArtists,
  ]) {
    if (!knownArtists[artist.id]) knownArtists[artist.id] = artist;
  }

  const [{ features, unavailable }, fetchedArtists] = await Promise.all([
    getAudioFeatures(session, trackIds, warnings),
    getArtistDetails(session, artistIds, knownArtists, warnings),
  ]);

  const artistDetails: Record<string, ArtistLite> = { ...knownArtists, ...fetchedArtists };

  /**
   * Quando /audio-features nao esta liberado para o app, estimamos os valores
   * a partir de genero, popularidade e duracao. O frontend recebe a flag
   * `audioFeaturesUnavailable` e rotula os graficos como estimativa.
   */
  let audioFeatures = features;
  if (unavailable || Object.keys(features).length === 0) {
    const uniqueTracks: TrackLite[] = [];
    const seenForEstimate = new Set<string>();
    for (const track of allTracks) {
      if (seenForEstimate.has(track.id)) continue;
      seenForEstimate.add(track.id);
      uniqueTracks.push(track);
    }

    // Generos mais frequentes entre os top artists: base para as faixas
    // cujos artistas nao conseguimos detalhar.
    const genreTally = new Map<string, number>();
    for (const artist of [
      ...topArtists.short_term,
      ...topArtists.medium_term,
      ...topArtists.long_term,
    ]) {
      for (const genre of artist.genres) {
        genreTally.set(genre, (genreTally.get(genre) ?? 0) + 1);
      }
    }
    const dominantGenres = [...genreTally.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([genre]) => genre);

    audioFeatures = estimateFeaturesForTracks(uniqueTracks, artistDetails, dominantGenres);
  }

  const meta: SnapshotMeta = {
    collectedAt: new Date().toISOString(),
    trackCount: trackIds.length,
    artistCount: artistIds.length,
    audioFeaturesCount: Object.keys(audioFeatures).length,
    audioFeaturesUnavailable: unavailable,
    hasEnoughData:
      trackIds.length >= MIN_TRACKS_FOR_PROFILE &&
      (topTracks.medium_term.length > 0 ||
        topTracks.long_term.length > 0 ||
        recentlyPlayed.length > 0 ||
        savedTracks.length > 0),
    warnings,
    durationMs: Date.now() - startedAt,
  };

  logger.info('Snapshot coletado', {
    sessionId: session.id,
    tracks: meta.trackCount,
    artists: meta.artistCount,
    features: meta.audioFeaturesCount,
    playlists: playlists.length,
    durationMs: meta.durationMs,
    warnings: warnings.length,
  });

  return {
    user,
    topArtists,
    topTracks,
    recentlyPlayed,
    savedTracks,
    playlists,
    followedArtists,
    audioFeatures,
    artistDetails,
    currentlyPlaying,
    meta,
  };
}

/**
 * Ponto de entrada usado pelas rotas: devolve o snapshot (do cache quando
 * possivel) junto das metricas derivadas.
 */
export async function getSnapshotWithMetrics(
  session: Session,
  options: { force?: boolean } = {},
): Promise<{ snapshot: MusicSnapshot; metrics: ReturnType<typeof computeMetrics>; cached: boolean }> {
  if (!options.force) {
    const cached = getCachedSnapshot(session);
    if (cached) {
      return { snapshot: cached, metrics: computeMetrics(cached), cached: true };
    }
  }

  const snapshot = await buildSnapshot(session);
  cacheSnapshot(session, snapshot);
  return { snapshot, metrics: computeMetrics(snapshot), cached: false };
}

/** Atualiza apenas o "tocando agora" (endpoint leve, chamado com frequencia). */
export async function refreshNowPlaying(session: Session): Promise<MusicSnapshot['currentlyPlaying']> {
  const warnings: string[] = [];
  const current = await getCurrentlyPlaying(session, warnings);

  // Mantem o cache coerente para as proximas leituras da pagina.
  if (session.snapshot) session.snapshot.currentlyPlaying = current;

  return current;
}

/**
 * Busca artistas por genero — base da descoberta quando a IA nao esta
 * disponivel (o endpoint /recommendations do Spotify foi descontinuado).
 *
 * O limite maximo do /search caiu para 10 na revisao de fevereiro de 2026,
 * por isso o valor e travado nesse teto.
 */
export async function searchArtistsByGenre(
  session: Session,
  genre: string,
  limit = 10,
): Promise<ArtistLite[]> {
  const term = genre.trim();
  if (term.length < 2) return [];

  try {
    const data = await spotifyRequest<{ artists: SpotifyPaging<SpotifyArtist> }>(session, '/search', {
      params: {
        q: `genre:"${term}"`,
        type: 'artist',
        limit: Math.min(Math.max(1, limit), 10),
      },
      optional: true,
    });

    return (data.artists?.items || []).filter(Boolean).map(toArtistLite);
  } catch {
    return [];
  }
}
