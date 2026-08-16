/**
 * Formatadores de exibicao.
 * Tudo em pt-BR, com fallbacks seguros para dados ausentes.
 */

const LOCALE = 'pt-BR';

/* ============================================================
 * Numeros
 * ============================================================ */

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat(LOCALE).format(Math.round(value));
}

/** 1.2 mil, 3.4 mi — para contagens grandes (seguidores). */
export function formatCompact(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat(LOCALE, { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

/** Recebe 0–1 e devolve "72%". */
export function formatPercent(value: number | null | undefined, decimals = 0): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return `${(value * 100).toFixed(decimals)}%`;
}

/** Recebe 0–100 e devolve "72%". */
export function formatScore(value: number | null | undefined, decimals = 0): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return `${value.toFixed(decimals)}%`;
}

export function formatDecimal(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return value.toFixed(decimals).replace('.', ',');
}

/* ============================================================
 * Tempo
 * ============================================================ */

/** 214000 -> "3:34" */
export function formatDuration(ms: number | null | undefined): string {
  if (!ms || !Number.isFinite(ms) || ms < 0) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/** Segundos -> "0:27" (usado no player de preview). */
export function formatSeconds(seconds: number | null | undefined): string {
  if (!seconds || !Number.isFinite(seconds) || seconds < 0) return '0:00';
  return formatDuration(seconds * 1000);
}

/** 128.4 -> "128 h" ; 1520 -> "1.520 h" */
export function formatHours(hours: number | null | undefined): string {
  if (hours === null || hours === undefined || !Number.isFinite(hours)) return '—';
  if (hours < 10) return `${formatDecimal(hours, 1)} h`;
  return `${formatNumber(hours)} h`;
}

export function formatHour(hour: number | null | undefined): string {
  if (hour === null || hour === undefined || !Number.isFinite(hour)) return '—';
  return `${String(hour).padStart(2, '0')}h`;
}

/** Faixa do dia a partir da hora. */
export function periodOfDay(hour: number | null | undefined): string {
  if (hour === null || hour === undefined) return 'indefinido';
  if (hour <= 5) return 'madrugada';
  if (hour <= 11) return 'manha';
  if (hour <= 17) return 'tarde';
  return 'noite';
}

export const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'] as const;
export const WEEKDAYS_LONG = [
  'domingo',
  'segunda',
  'terca',
  'quarta',
  'quinta',
  'sexta',
  'sabado',
] as const;

export function weekdayShort(weekday: number): string {
  return WEEKDAYS_SHORT[weekday] ?? '—';
}

export function weekdayLong(weekday: number): string {
  return WEEKDAYS_LONG[weekday] ?? '—';
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(LOCALE, { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(LOCALE, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/** "agora", "12 min", "3 h", "ontem", "12 mai". */
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);

  if (minutes < 1) return 'agora';
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;

  const days = Math.floor(hours / 24);
  if (days === 1) return 'ontem';
  if (days < 7) return `${days} dias`;

  return new Intl.DateTimeFormat(LOCALE, { day: '2-digit', month: 'short' }).format(date);
}

/* ============================================================
 * Texto
 * ============================================================ */

export function capitalize(value: string | null | undefined): string {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Generos do Spotify vem em minusculas: "indie rock" -> "Indie Rock". */
export function formatGenre(genre: string | null | undefined): string {
  if (!genre) return '';
  return genre
    .split(/[\s-]+/)
    .map((word) => {
      const upper = word.toUpperCase();
      // Siglas que devem permanecer maiusculas.
      if (['r&b', 'edm', 'mpb', 'uk', 'us', 'lo-fi', 'idm', 'dnb'].includes(word.toLowerCase())) {
        return upper;
      }
      return capitalize(word);
    })
    .join(' ');
}

export function truncate(value: string | null | undefined, max: number): string {
  if (!value) return '';
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;
}

export function pluralize(count: number, singular: string, plural?: string): string {
  const word = count === 1 ? singular : (plural ?? `${singular}s`);
  return `${formatNumber(count)} ${word}`;
}

/** Junta nomes: "A", "A e B", "A, B e C". */
export function joinNames(names: string[], max = 3): string {
  const list = names.filter(Boolean).slice(0, max);
  if (list.length === 0) return '—';
  if (list.length === 1) return list[0] as string;
  return `${list.slice(0, -1).join(', ')} e ${list[list.length - 1]}`;
}

/* ============================================================
 * Dominio musical
 * ============================================================ */

export const TIME_RANGE_LABEL = {
  short_term: 'Ultimas 4 semanas',
  medium_term: 'Ultimos 6 meses',
  long_term: 'Todos os tempos',
} as const;

export const TIME_RANGE_SHORT = {
  short_term: '4 semanas',
  medium_term: '6 meses',
  long_term: 'sempre',
} as const;

export const MOOD_LABEL: Record<string, string> = {
  energetico: 'Energetico',
  melancolico: 'Melancolico',
  feliz: 'Feliz',
  chill: 'Chill',
  agressivo: 'Intenso',
  romantico: 'Romantico',
  neutro: 'Equilibrado',
};

export const MOOD_COLOR: Record<string, string> = {
  energetico: '#fb923c',
  melancolico: '#60a5fa',
  feliz: '#fbbf24',
  chill: '#34d399',
  agressivo: '#ef4444',
  romantico: '#f472b6',
  neutro: '#a78bfa',
};

export const FEATURE_LABEL: Record<string, string> = {
  danceability: 'Dancabilidade',
  energy: 'Energia',
  valence: 'Positividade',
  acousticness: 'Acustica',
  instrumentalness: 'Instrumental',
  speechiness: 'Fala',
  liveness: 'Ao vivo',
};

/** Nota musical a partir do campo `key` do Spotify (0–11, -1 = desconhecido). */
export function formatKey(key: number | null | undefined, mode?: number): string {
  if (key === null || key === undefined || key < 0 || key > 11) return '—';
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const note = notes[key] ?? '—';
  if (mode === undefined) return note;
  return `${note} ${mode === 1 ? 'maior' : 'menor'}`;
}

export function formatTempo(tempo: number | null | undefined): string {
  if (!tempo || !Number.isFinite(tempo)) return '—';
  return `${Math.round(tempo)} BPM`;
}

/** Decada -> label completo: "80s" -> "Anos 80". */
export function formatDecade(decade: string): string {
  return `Anos ${decade.replace('s', '')}`;
}
