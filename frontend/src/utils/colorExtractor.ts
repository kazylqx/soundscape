import type { VibePalette } from '@/types';

/**
 * Extracao da paleta do usuario a partir das capas dos albuns.
 *
 * As imagens do CDN do Spotify (i.scdn.co) respondem com
 * `Access-Control-Allow-Origin: *`, o que permite ler os pixels via canvas
 * com `crossOrigin = 'anonymous'`. Se por qualquer motivo o canvas ficar
 * "contaminado", devolvemos a paleta padrao em vez de quebrar a pagina.
 */

/** Paleta usada antes da extracao e como fallback. */
export const DEFAULT_PALETTE: VibePalette = {
  primary: '#1ed760',
  secondary: '#8b5cf6',
  tertiary: '#ec4899',
  swatches: ['#1ed760', '#8b5cf6', '#ec4899', '#fb923c', '#22d3ee'],
};

/* ============================================================
 * Conversoes de cor
 * ============================================================ */

interface Rgb {
  r: number;
  g: number;
  b: number;
}

interface Hsl {
  h: number;
  s: number;
  l: number;
}

function toHex({ r, g, b }: Rgb): string {
  const part = (value: number) => Math.round(Math.min(255, Math.max(0, value))).toString(16).padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`;
}

function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;

  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;

  let hue = 0;
  if (delta !== 0) {
    if (max === red) hue = ((green - blue) / delta) % 6;
    else if (max === green) hue = (blue - red) / delta + 2;
    else hue = (red - green) / delta + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }

  const lightness = (max + min) / 2;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));

  return { h: hue, s: saturation, l: lightness };
}

function hslToRgb({ h, s, l }: Hsl): Rgb {
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const hPrime = h / 60;
  const x = chroma * (1 - Math.abs((hPrime % 2) - 1));

  let rgb: [number, number, number];
  if (hPrime < 1) rgb = [chroma, x, 0];
  else if (hPrime < 2) rgb = [x, chroma, 0];
  else if (hPrime < 3) rgb = [0, chroma, x];
  else if (hPrime < 4) rgb = [0, x, chroma];
  else if (hPrime < 5) rgb = [x, 0, chroma];
  else rgb = [chroma, 0, x];

  const m = l - chroma / 2;
  return { r: (rgb[0] + m) * 255, g: (rgb[1] + m) * 255, b: (rgb[2] + m) * 255 };
}

/**
 * Ajusta uma cor para funcionar sobre fundo escuro:
 * garante saturacao viva e luminosidade legivel.
 */
function makeVivid(rgb: Rgb): string {
  const hsl = rgbToHsl(rgb);
  const tuned: Hsl = {
    h: hsl.h,
    s: Math.min(0.92, Math.max(0.55, hsl.s * 1.35)),
    l: Math.min(0.68, Math.max(0.46, hsl.l * 1.15)),
  };
  return toHex(hslToRgb(tuned));
}

/* ============================================================
 * Leitura dos pixels
 * ============================================================ */

const SAMPLE_SIZE = 28;
/** Agrupa cores proximas para nao contar cada pixel como cor unica. */
const QUANT_STEP = 24;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Falha ao carregar imagem: ${url}`));
    image.src = url;
  });
}

interface Bucket {
  rgb: Rgb;
  count: number;
  saturation: number;
}

async function extractFromImage(url: string): Promise<Bucket[]> {
  const image = await loadImage(url);

  const canvas = document.createElement('canvas');
  canvas.width = SAMPLE_SIZE;
  canvas.height = SAMPLE_SIZE;

  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return [];

  context.drawImage(image, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);

  let pixels: Uint8ClampedArray;
  try {
    pixels = context.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data;
  } catch {
    // Canvas contaminado (CORS): desiste desta imagem.
    return [];
  }

  const buckets = new Map<string, Bucket>();

  for (let index = 0; index < pixels.length; index += 4) {
    const r = pixels[index] ?? 0;
    const g = pixels[index + 1] ?? 0;
    const b = pixels[index + 2] ?? 0;
    const alpha = pixels[index + 3] ?? 0;

    if (alpha < 200) continue;

    const hsl = rgbToHsl({ r, g, b });

    // Descarta quase-preto, quase-branco e cinzas sem personalidade.
    if (hsl.l < 0.12 || hsl.l > 0.92) continue;
    if (hsl.s < 0.14) continue;

    const key = [
      Math.round(r / QUANT_STEP),
      Math.round(g / QUANT_STEP),
      Math.round(b / QUANT_STEP),
    ].join(':');

    const existing = buckets.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      buckets.set(key, { rgb: { r, g, b }, count: 1, saturation: hsl.s });
    }
  }

  return [...buckets.values()];
}

/** Distancia angular entre matizes (0–180). */
function hueDistance(a: string, b: string): number {
  const parse = (hex: string): number => {
    const value = hex.replace('#', '');
    const rgb: Rgb = {
      r: parseInt(value.slice(0, 2), 16),
      g: parseInt(value.slice(2, 4), 16),
      b: parseInt(value.slice(4, 6), 16),
    };
    return rgbToHsl(rgb).h;
  };

  const diff = Math.abs(parse(a) - parse(b));
  return diff > 180 ? 360 - diff : diff;
}

/**
 * Monta a paleta a partir de varias capas.
 * Pondera frequencia x saturacao e evita devolver tres tons iguais.
 */
export async function extractPalette(imageUrls: Array<string | null | undefined>): Promise<VibePalette> {
  const urls = imageUrls.filter((url): url is string => Boolean(url)).slice(0, 8);
  if (urls.length === 0) return DEFAULT_PALETTE;

  const results = await Promise.allSettled(urls.map((url) => extractFromImage(url)));

  const merged = new Map<string, Bucket>();
  for (const result of results) {
    if (result.status !== 'fulfilled') continue;
    for (const bucket of result.value) {
      const key = toHex(bucket.rgb);
      const existing = merged.get(key);
      if (existing) existing.count += bucket.count;
      else merged.set(key, { ...bucket });
    }
  }

  if (merged.size === 0) return DEFAULT_PALETTE;

  // Cores muito frequentes E saturadas ganham prioridade.
  const ranked = [...merged.values()]
    .sort((a, b) => b.count * (0.5 + b.saturation) - a.count * (0.5 + a.saturation))
    .map((bucket) => makeVivid(bucket.rgb));

  const chosen: string[] = [];
  for (const color of ranked) {
    // Exige um minimo de contraste de matiz entre as cores escolhidas.
    const tooClose = chosen.some((existing) => hueDistance(existing, color) < 28);
    if (tooClose) continue;
    chosen.push(color);
    if (chosen.length >= 5) break;
  }

  // Se o disco e monocromatico, completa com a paleta padrao.
  while (chosen.length < 3) {
    const filler = DEFAULT_PALETTE.swatches[chosen.length] ?? DEFAULT_PALETTE.primary;
    chosen.push(filler);
  }

  return {
    primary: chosen[0] ?? DEFAULT_PALETTE.primary,
    secondary: chosen[1] ?? DEFAULT_PALETTE.secondary,
    tertiary: chosen[2] ?? DEFAULT_PALETTE.tertiary,
    swatches: chosen,
  };
}

/** Aplica a paleta nas custom properties consumidas pelo Tailwind. */
export function applyPalette(palette: VibePalette, target: HTMLElement = document.documentElement): void {
  target.style.setProperty('--vibe-primary', palette.primary);
  target.style.setProperty('--vibe-secondary', palette.secondary);
  target.style.setProperty('--vibe-tertiary', palette.tertiary);
}

/** Converte hex para `rgb(r g b / alpha)` — util em gradientes inline. */
export function hexToRgba(hex: string, alpha: number): string {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  if ([r, g, b].some((channel) => Number.isNaN(channel))) return `rgb(255 255 255 / ${alpha})`;
  return `rgb(${r} ${g} ${b} / ${alpha})`;
}

/** Preto ou branco, conforme o contraste com a cor de fundo. */
export function readableTextColor(hex: string): string {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;

  const channel = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);

  return luminance > 0.45 ? '#0a0a0c' : '#f4f4f5';
}
