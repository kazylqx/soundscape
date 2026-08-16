import axios, { AxiosError } from 'axios';
import { env } from '../utils/env';
import { logger } from '../utils/logger';
import { AppError, upstreamError } from '../utils/errors';
import { getArtistTopTrack, searchArtist } from './spotifyService';
import type {
  AIProfile,
  AIRecommendation,
  MusicMetrics,
  MusicSnapshot,
  Session,
} from '../types';

/**
 * Geracao do perfil musical por IA.
 *
 * Fluxo: monta um resumo compacto dos dados -> pede JSON estrito ->
 * valida/normaliza o retorno -> enriquece as recomendacoes com dados reais
 * do Spotify (foto, link, preview).
 *
 * Se a IA nao estiver configurada ou falhar, um perfil deterministico
 * derivado das metricas assume o lugar (`fallback: true`), para que a
 * pagina nunca fique vazia.
 */

/* ============================================================
 * Prompt
 * ============================================================ */

const SYSTEM_PROMPT = `Voce e um critico musical brasileiro com olhar afiado para psicologia do gosto.
Recebe dados reais de escuta do Spotify e devolve um retrato honesto, especifico e memoravel do ouvinte.

Regras absolutas:
- Responda SOMENTE com um objeto JSON valido. Sem markdown, sem cercas de codigo, sem texto antes ou depois.
- Escreva em portugues do Brasil.
- Fale em segunda pessoa (voce), tom poetico mas concreto — sem misticismo vago.
- Use os dados reais fornecidos. Cite artistas, generos, numeros e horarios que aparecem nos dados.
- Nunca invente artistas que o usuario "ja ouve". Recomendacoes sao artistas NOVOS, que nao estao nas listas dele.
- Zero clichê de horoscopo. Se uma afirmacao serviria para qualquer pessoa, reescreva.`;

interface PromptPayload {
  perfil: Record<string, unknown>;
  topArtistas: Record<string, string[]>;
  topMusicas: Record<string, string[]>;
  generos: Array<{ genero: string; percentual: number }>;
  audioFeatures: Record<string, number>;
  decadas: Array<{ decada: string; percentual: number }>;
  padraoDeEscuta: Record<string, unknown>;
  scores: Record<string, unknown>;
  evolucao: Record<string, unknown>;
  personaCalculada: Record<string, unknown>;
  observacoes: string[];
}

const HOUR_LABEL = (hour: number | null): string => {
  if (hour === null) return 'sem dados suficientes';
  if (hour >= 0 && hour <= 5) return `${hour}h (madrugada)`;
  if (hour <= 11) return `${hour}h (manha)`;
  if (hour <= 17) return `${hour}h (tarde)`;
  return `${hour}h (noite)`;
};

/** Resume snapshot + metricas em um payload pequeno o suficiente para o contexto do modelo. */
function buildPromptPayload(snapshot: MusicSnapshot, metrics: MusicMetrics): PromptPayload {
  const artistNames = (limit: number, range: keyof MusicSnapshot['topArtists']) =>
    snapshot.topArtists[range].slice(0, limit).map((artist) => artist.name);

  const trackNames = (limit: number, range: keyof MusicSnapshot['topTracks']) =>
    snapshot.topTracks[range]
      .slice(0, limit)
      .map((track) => `${track.name} — ${track.artistNames.join(', ')}${track.releaseYear ? ` (${track.releaseYear})` : ''}`);

  const observacoes: string[] = [];
  if (snapshot.meta.audioFeaturesUnavailable) {
    observacoes.push(
      'As metricas de audio (energia, valencia, dancabilidade) sao estimativas derivadas de genero e popularidade, nao medicoes diretas. Trate-as como aproximacao.',
    );
  }
  if (snapshot.recentlyPlayed.length < 10) {
    observacoes.push('O historico recente tem poucos itens — evite conclusoes fortes sobre horario de escuta.');
  }

  return {
    perfil: {
      nome: snapshot.user.displayName,
      pais: snapshot.user.country ?? 'nao informado',
      playlistsProprias: snapshot.playlists.filter((playlist) => playlist.isOwner).length,
      playlistsTotal: snapshot.playlists.length,
      artistasSeguidos: snapshot.followedArtists.length,
      musicasSalvas: snapshot.savedTracks.length,
      tocandoAgora: snapshot.currentlyPlaying
        ? `${snapshot.currentlyPlaying.track.name} — ${snapshot.currentlyPlaying.track.artistNames.join(', ')}`
        : null,
    },
    topArtistas: {
      ultimas4Semanas: artistNames(15, 'short_term'),
      ultimos6Meses: artistNames(15, 'medium_term'),
      todosOsTempos: artistNames(15, 'long_term'),
    },
    topMusicas: {
      ultimas4Semanas: trackNames(10, 'short_term'),
      ultimos6Meses: trackNames(10, 'medium_term'),
      todosOsTempos: trackNames(10, 'long_term'),
    },
    generos: metrics.genres.slice(0, 12).map((entry) => ({
      genero: entry.genre,
      percentual: entry.percentage,
    })),
    audioFeatures: {
      dancabilidade: metrics.averageFeatures.danceability,
      energia: metrics.averageFeatures.energy,
      valencia: metrics.averageFeatures.valence,
      acustica: metrics.averageFeatures.acousticness,
      instrumentalidade: metrics.averageFeatures.instrumentalness,
      bpmMedio: metrics.averageFeatures.tempo,
    },
    decadas: metrics.decades.map((entry) => ({ decada: entry.decade, percentual: entry.percentage })),
    padraoDeEscuta: {
      horarioDePico: HOUR_LABEL(metrics.peakHour),
      humorDominante: metrics.dominantMood,
      distribuicaoDeHumor: metrics.moodBreakdown,
      taxaDeRepeticao: metrics.repeatRate,
      anoMedioDeLancamento: metrics.averageReleaseYear,
    },
    scores: {
      mainstream: metrics.mainstreamScore,
      diversidade: metrics.diversityScore,
      generosDistintos: metrics.totalDistinctGenres,
      artistasUnicos: metrics.uniqueArtists,
      musicasUnicas: metrics.uniqueTracks,
      concentracaoNoArtistaTop: metrics.topArtistShare,
    },
    evolucao: {
      artistasNovosRecentes: metrics.evolution.newArtistsShortTerm,
      artistasConstantes: metrics.evolution.consistentArtists,
      artistasQueSairam: metrics.evolution.droppedArtists,
      variacaoDeEnergia: metrics.evolution.energyDelta,
      variacaoDeValencia: metrics.evolution.valenceDelta,
      variacaoDePopularidade: metrics.evolution.popularityDelta,
    },
    personaCalculada: {
      nome: metrics.persona.name,
      motivos: metrics.persona.evidence,
      alternativas: metrics.personaRunnerUps.map((item) => item.name),
    },
    observacoes,
  };
}

function buildUserPrompt(payload: PromptPayload): string {
  return `Dados de escuta do usuario (JSON):

${JSON.stringify(payload, null, 2)}

Gere um objeto JSON com EXATAMENTE estas chaves:

{
  "headline": "frase curta e de impacto que define essa pessoa musicalmente (max 12 palavras)",
  "biography": "um paragrafo de 4 a 6 frases, segunda pessoa, tom poetico e concreto, sobre a personalidade musical",
  "persona": "nome do arquetipo, no formato 'O Explorador Noturno' — pode usar a persona calculada ou propor um nome melhor que caiba nos dados",
  "personaDescription": "1 a 2 frases explicando o arquetipo",
  "strengths": ["3 caracteristicas positivas da personalidade musical"],
  "quirks": ["2 a 3 curiosidades derivadas dos dados reais, citando numeros, artistas ou horarios"],
  "musicianComparison": "com qual artista famoso essa pessoa teria afinidade como ouvinte, e por que (1 frase)",
  "filmSoundtrack": "se a vida dessa pessoa fosse um filme, qual seria a vibe da trilha (1 a 2 frases)",
  "colorMood": "descricao da vibe em cores (1 frase)",
  "moodBoard": ["5 palavras que capturam a essencia musical"],
  "shareableQuote": "frase impactante para compartilhar, no maximo 15 palavras",
  "hiddenTrait": "uma descoberta surpreendente com base nos dados (1 a 2 frases)",
  "evolutionNote": "como o gosto mudou comparando as ultimas 4 semanas com todos os tempos (1 a 2 frases)",
  "recommendations": [
    {
      "name": "nome do artista",
      "reason": "por que essa pessoa vai gostar, ligando a algo especifico dos dados",
      "similarTo": "artista das listas do usuario com quem esse se parece",
      "genre": "genero principal",
      "mood": "um de: energetico, melancolico, feliz, chill, agressivo, romantico",
      "energy": "um de: baixa, media, alta"
    }
  ]
}

Sao necessarias EXATAMENTE 10 recomendacoes, todas de artistas que NAO aparecem nas listas do usuario.
Responda apenas com o JSON.`;
}

/* ============================================================
 * Chamada ao provider
 * ============================================================ */

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { total_tokens?: number };
}

async function callProvider(userPrompt: string): Promise<string> {
  const url = `${env.ai.baseUrl}/chat/completions`;

  try {
    const { data } = await axios.post<ChatCompletionResponse>(
      url,
      {
        model: env.ai.model,
        temperature: 0.85,
        max_tokens: 2600,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
      },
      {
        timeout: env.ai.timeoutMs,
        headers: {
          Authorization: `Bearer ${env.ai.apiKey}`,
          'Content-Type': 'application/json',
        },
      },
    );

    const content = data.choices?.[0]?.message?.content;
    if (!content) throw upstreamError('A IA respondeu sem conteudo.', 'AI_EMPTY_RESPONSE');

    logger.debug('IA respondeu', { model: env.ai.model, tokens: data.usage?.total_tokens ?? null });
    return content;
  } catch (error) {
    if (error instanceof AppError) throw error;

    const axiosError = error as AxiosError<{ error?: { message?: string; code?: string } }>;
    const status = axiosError.response?.status;
    const message = axiosError.response?.data?.error?.message;

    logger.error('Falha na chamada da IA', { status, message, model: env.ai.model });

    if (status === 401) {
      throw upstreamError('Chave da API de IA invalida.', 'AI_UNAUTHORIZED');
    }
    if (status === 429) {
      throw new AppError(429, 'AI_RATE_LIMITED', 'Limite da API de IA atingido. Tente em alguns minutos.');
    }
    if (axiosError.code === 'ECONNABORTED') {
      throw new AppError(504, 'AI_TIMEOUT', 'A IA demorou demais para responder.');
    }
    throw upstreamError(message || 'Nao foi possivel gerar a analise de IA.', 'AI_REQUEST_FAILED');
  }
}

/* ============================================================
 * Parsing e normalizacao
 * ============================================================ */

/** Extrai o objeto JSON mesmo se o modelo teimar em embrulhar em markdown. */
function extractJson(raw: string): unknown {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        /* cai no throw abaixo */
      }
    }
    throw upstreamError('A IA nao devolveu JSON valido.', 'AI_INVALID_JSON');
  }
}

const asString = (value: unknown, fallback: string, maxLength = 1200): string => {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (trimmed.length === 0) return fallback;
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength).trimEnd()}…` : trimmed;
};

const asStringArray = (value: unknown, fallback: string[], min: number, max: number): string[] => {
  const list = Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim())
    : [];
  const merged = [...list];
  for (const item of fallback) {
    if (merged.length >= min) break;
    if (!merged.includes(item)) merged.push(item);
  }
  return merged.slice(0, max);
};

const ENERGY_VALUES = ['baixa', 'media', 'alta'] as const;

function normalizeRecommendations(value: unknown): AIRecommendation[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const recommendations: AIRecommendation[] = [];

  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;

    const name = asString(record.name, '', 120);
    if (!name) continue;

    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const rawEnergy = asString(record.energy, 'media', 20).toLowerCase();
    const energy = (ENERGY_VALUES as readonly string[]).includes(rawEnergy)
      ? (rawEnergy as AIRecommendation['energy'])
      : 'media';

    recommendations.push({
      name,
      reason: asString(record.reason, 'Combina com o que voce mais escuta.', 400),
      similarTo: asString(record.similarTo, '', 120),
      genre: asString(record.genre, '', 80) || undefined,
      mood: asString(record.mood, '', 40) || undefined,
      energy,
      spotify: null,
    });

    if (recommendations.length >= 10) break;
  }

  return recommendations;
}

function normalizeProfile(parsed: unknown, metrics: MusicMetrics, fallback: AIProfile): AIProfile {
  if (!parsed || typeof parsed !== 'object') return fallback;
  const record = parsed as Record<string, unknown>;

  const recommendations = normalizeRecommendations(record.recommendations);

  return {
    headline: asString(record.headline, fallback.headline, 160),
    biography: asString(record.biography, fallback.biography, 1400),
    persona: asString(record.persona, metrics.persona.name, 80),
    personaDescription: asString(record.personaDescription, metrics.persona.description, 400),
    strengths: asStringArray(record.strengths, fallback.strengths, 3, 3),
    quirks: asStringArray(record.quirks, fallback.quirks, 2, 3),
    musicianComparison: asString(record.musicianComparison, fallback.musicianComparison, 300),
    filmSoundtrack: asString(record.filmSoundtrack, fallback.filmSoundtrack, 300),
    colorMood: asString(record.colorMood, fallback.colorMood, 240),
    moodBoard: asStringArray(record.moodBoard, fallback.moodBoard, 5, 5),
    shareableQuote: asString(record.shareableQuote, fallback.shareableQuote, 160),
    hiddenTrait: asString(record.hiddenTrait, fallback.hiddenTrait, 400),
    evolutionNote: asString(record.evolutionNote, fallback.evolutionNote, 400),
    recommendations: recommendations.length > 0 ? recommendations : fallback.recommendations,
    generatedAt: new Date().toISOString(),
    model: env.ai.model,
    fallback: false,
  };
}

/* ============================================================
 * Perfil fallback (deterministico, sem IA)
 * ============================================================ */

const MOOD_COPY: Record<string, { adjective: string; color: string }> = {
  energetico: { adjective: 'eletrica', color: 'laranja quente com faiscas de amarelo' },
  melancolico: { adjective: 'melancolica', color: 'azul profundo com cinza de fim de tarde' },
  feliz: { adjective: 'solar', color: 'amarelo aberto com rosa claro' },
  chill: { adjective: 'suave', color: 'verde agua com bege' },
  agressivo: { adjective: 'tensa', color: 'vermelho escuro com preto fosco' },
  romantico: { adjective: 'intima', color: 'vinho com dourado baixo' },
  neutro: { adjective: 'equilibrada', color: 'grafite com toques de violeta' },
};

function periodLabel(hour: number | null): string {
  if (hour === null) return 'em horarios espalhados pelo dia';
  if (hour <= 5) return 'na madrugada';
  if (hour <= 11) return 'pela manha';
  if (hour <= 17) return 'a tarde';
  return 'a noite';
}

/**
 * Recomendacoes sem IA: artistas que orbitam o gosto do usuario
 * (seguidos ou presentes nas playlists) mas que nao estao no top.
 */
function fallbackRecommendations(snapshot: MusicSnapshot): AIRecommendation[] {
  const topArtistIds = new Set(
    [
      ...snapshot.topArtists.short_term,
      ...snapshot.topArtists.medium_term,
      ...snapshot.topArtists.long_term,
    ].map((artist) => artist.id),
  );

  const reference =
    snapshot.topArtists.medium_term[0]?.name ||
    snapshot.topArtists.long_term[0]?.name ||
    'seus artistas favoritos';

  const candidates = new Map<string, { name: string; genres: string[]; popularity: number }>();

  for (const artist of snapshot.followedArtists) {
    if (topArtistIds.has(artist.id)) continue;
    candidates.set(artist.id, { name: artist.name, genres: artist.genres, popularity: artist.popularity });
  }

  for (const playlist of snapshot.playlists) {
    for (const track of playlist.tracks) {
      for (const artistId of track.artistIds) {
        if (topArtistIds.has(artistId) || candidates.has(artistId)) continue;
        const detail = snapshot.artistDetails[artistId];
        if (!detail) continue;
        candidates.set(artistId, {
          name: detail.name,
          genres: detail.genres,
          popularity: detail.popularity,
        });
      }
    }
  }

  return [...candidates.values()]
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, 10)
    .map((candidate) => ({
      name: candidate.name,
      reason: `Esta no seu universo (playlists ou artistas seguidos) mas ainda nao entrou no seu top — vale uma escuta dedicada.`,
      similarTo: reference,
      genre: candidate.genres[0],
      energy: 'media' as const,
      spotify: null,
    }));
}

export function buildFallbackProfile(snapshot: MusicSnapshot, metrics: MusicMetrics): AIProfile {
  const topArtist =
    snapshot.topArtists.medium_term[0]?.name || snapshot.topArtists.long_term[0]?.name || 'ninguem em especial';
  const topGenre = metrics.genres[0]?.genre || 'um genero difícil de rotular';
  const secondGenre = metrics.genres[1]?.genre;
  const mood = MOOD_COPY[metrics.dominantMood] ?? MOOD_COPY.neutro;
  const moodInfo = mood ?? { adjective: 'equilibrada', color: 'grafite com toques de violeta' };
  const dominantDecade = [...metrics.decades].sort((a, b) => b.percentage - a.percentage)[0];

  const quirks: string[] = [];
  if (metrics.peakHour !== null) {
    quirks.push(`Seu pico de escuta acontece ${periodLabel(metrics.peakHour)}, por volta das ${metrics.peakHour}h.`);
  }
  if (dominantDecade) {
    quirks.push(`${dominantDecade.percentage}% do que voce ouve foi lancado nos anos ${dominantDecade.decade}.`);
  }
  if (metrics.mainstreamScore > 0) {
    quirks.push(
      metrics.mainstreamScore >= 65
        ? `Popularidade media de ${Math.round(metrics.mainstreamScore)}/100: voce nao tem medo de gostar do que todo mundo gosta.`
        : `Popularidade media de ${Math.round(metrics.mainstreamScore)}/100: boa parte do seu gosto vive fora do topo das paradas.`,
    );
  }

  return {
    headline: `${metrics.persona.name.replace(/^O\s/, '')} com ${topGenre} no centro de tudo`,
    biography: `Voce escuta como quem constroi um lugar. ${topArtist} aparece como ponto fixo, e em volta dele orbitam ${topGenre}${secondGenre ? ` e ${secondGenre}` : ''}. A media da sua escuta e ${moodInfo.adjective}: energia em ${Math.round(metrics.averageFeatures.energy * 100)}% e valencia em ${Math.round(metrics.averageFeatures.valence * 100)}%, o que desenha alguem que usa musica para ajustar o proprio estado, nao apenas para preencher silencio. Seu catalogo passa por ${metrics.totalDistinctGenres} generos distintos${metrics.averageReleaseYear ? ` e tem ano medio de lancamento em ${metrics.averageReleaseYear}` : ''}. Voce volta ${periodLabel(metrics.peakHour)} para as mesmas texturas — e e ai que seu gosto fica mais sincero.`,
    persona: metrics.persona.name,
    personaDescription: metrics.persona.description,
    strengths: [
      `Consistencia: ${metrics.persona.name} sabe o que quer ouvir.`,
      `Amplitude: ${metrics.totalDistinctGenres} generos distintos passam pelos seus fones.`,
      metrics.mainstreamScore < 55
        ? 'Curiosidade: voce garimpa fora do obvio.'
        : 'Abertura: voce nao rejeita uma boa musica so porque ela e popular.',
    ],
    quirks: quirks.length > 0 ? quirks.slice(0, 3) : ['Seu historico ainda esta comecando a contar sua historia.'],
    musicianComparison: `Como ouvinte, voce se daria bem com ${topArtist} numa conversa sobre discos — voces partem do mesmo lugar.`,
    filmSoundtrack: `Um filme ${moodInfo.adjective}, gravado ${periodLabel(metrics.peakHour)}, com ${topGenre} costurando as cenas de transicao.`,
    colorMood: `${moodInfo.color}.`,
    moodBoard: [
      topGenre.split(' ')[0] || 'som',
      moodInfo.adjective,
      periodLabel(metrics.peakHour).replace(/^(na|pela|a) /, ''),
      dominantDecade ? `anos ${dominantDecade.decade}` : 'atemporal',
      metrics.mainstreamScore < 55 ? 'garimpo' : 'refrao',
    ],
    shareableQuote: `${metrics.persona.name}: ${topGenre} ${periodLabel(metrics.peakHour)}.`,
    hiddenTrait:
      metrics.repeatRate > 0.2
        ? `Voce repete ${Math.round(metrics.repeatRate * 100)}% das faixas no historico recente — musica, para voce, e ritual antes de ser descoberta.`
        : `Voce quase nao repete faixas seguidas: cada sessao de escuta e uma tentativa de encontrar algo novo.`,
    evolutionNote:
      metrics.evolution.newArtistsShortTerm.length > 0
        ? `Nas ultimas semanas entraram nomes como ${metrics.evolution.newArtistsShortTerm.slice(0, 3).join(', ')}, enquanto ${metrics.evolution.consistentArtists[0] || 'sua base'} continuou firme.`
        : 'Seu gosto esta em fase estavel: os mesmos nomes seguram o topo em todos os periodos.',
    recommendations: fallbackRecommendations(snapshot),
    generatedAt: new Date().toISOString(),
    model: 'fallback-deterministico',
    fallback: true,
  };
}

/* ============================================================
 * Enriquecimento das recomendacoes com dados reais do Spotify
 * ============================================================ */

export async function enrichRecommendations(
  session: Session,
  recommendations: AIRecommendation[],
): Promise<AIRecommendation[]> {
  return Promise.all(
    recommendations.map(async (recommendation) => {
      const artist = await searchArtist(session, recommendation.name);
      if (!artist) return { ...recommendation, spotify: null };

      const topTrack = await getArtistTopTrack(session, artist.id);

      return {
        ...recommendation,
        // Usa o nome canonico do Spotify (corrige grafia da IA).
        name: artist.name,
        genre: recommendation.genre || artist.genres[0],
        spotify: {
          id: artist.id,
          imageUrl: artist.imageUrl,
          spotifyUrl: artist.spotifyUrl,
          genres: artist.genres,
          popularity: artist.popularity,
          previewUrl: topTrack?.previewUrl ?? null,
          topTrackName: topTrack?.name ?? null,
        },
      };
    }),
  );
}

/* ============================================================
 * Entry point
 * ============================================================ */

/**
 * Gera o perfil de IA a partir do snapshot + metricas.
 * Nunca lanca por falha da IA: cai para o perfil deterministico.
 */
export async function generateProfile(
  session: Session,
  snapshot: MusicSnapshot,
  metrics: MusicMetrics,
): Promise<AIProfile> {
  const fallback = buildFallbackProfile(snapshot, metrics);

  if (!env.ai.enabled) {
    logger.warn('IA desabilitada (sem AI_API_KEY) — usando perfil deterministico.');
    return { ...fallback, recommendations: await enrichRecommendations(session, fallback.recommendations) };
  }

  let profile: AIProfile;

  try {
    const payload = buildPromptPayload(snapshot, metrics);
    const raw = await callProvider(buildUserPrompt(payload));
    profile = normalizeProfile(extractJson(raw), metrics, fallback);
    logger.info('Perfil de IA gerado', {
      sessionId: session.id,
      model: env.ai.model,
      recommendations: profile.recommendations.length,
    });
  } catch (error) {
    const message = error instanceof AppError ? error.message : 'erro desconhecido';
    logger.error('Analise de IA falhou — aplicando fallback', { message });
    profile = fallback;
  }

  const enriched = await enrichRecommendations(session, profile.recommendations);
  return { ...profile, recommendations: enriched };
}
