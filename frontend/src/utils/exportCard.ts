import html2canvas from 'html2canvas';

/**
 * Exportacao dos cards de compartilhamento como PNG.
 *
 * Cuidados que o html2canvas exige:
 *  - `backdrop-filter` nao e suportado: os cards usam cores solidas
 *    (classe `.export-safe`) durante a captura
 *  - imagens externas precisam de CORS liberado (`useCORS`)
 *  - fontes precisam estar carregadas antes da captura
 */

export interface ExportOptions {
  /** Nome do arquivo, sem extensao. */
  fileName?: string;
  /** Multiplicador de resolucao (2 = retina). */
  scale?: number;
  /** Cor de fundo aplicada atras do card. */
  background?: string;
}

/** Espera as fontes do documento para o texto nao sair com fallback. */
async function waitForFonts(): Promise<void> {
  try {
    await document.fonts?.ready;
  } catch {
    /* navegadores sem a API seguem adiante */
  }
}

/** Garante que as imagens dentro do node terminaram de carregar. */
async function waitForImages(node: HTMLElement): Promise<void> {
  const images = Array.from(node.querySelectorAll('img'));

  await Promise.all(
    images.map(
      (image) =>
        new Promise<void>((resolve) => {
          if (image.complete && image.naturalWidth > 0) {
            resolve();
            return;
          }
          const done = () => resolve();
          image.addEventListener('load', done, { once: true });
          image.addEventListener('error', done, { once: true });
          // Rede lenta nao pode travar a exportacao para sempre.
          window.setTimeout(done, 4000);
        }),
    ),
  );
}

async function renderToCanvas(node: HTMLElement, options: ExportOptions): Promise<HTMLCanvasElement> {
  await waitForFonts();
  await waitForImages(node);

  return html2canvas(node, {
    scale: options.scale ?? 2,
    backgroundColor: options.background ?? '#050506',
    useCORS: true,
    allowTaint: false,
    logging: false,
    // O card e capturado no proprio tamanho, sem herdar o scroll da pagina.
    scrollX: 0,
    scrollY: 0,
    windowWidth: node.scrollWidth,
    windowHeight: node.scrollHeight,
    onclone: (document_) => {
      // Remove efeitos que o html2canvas nao entende.
      document_.querySelectorAll<HTMLElement>('[data-export-hide]').forEach((element) => {
        element.style.display = 'none';
      });
      document_.querySelectorAll<HTMLElement>('*').forEach((element) => {
        const style = element.style;
        if (style.backdropFilter) style.backdropFilter = 'none';
        style.setProperty('-webkit-backdrop-filter', 'none');
      });
    },
  });
}

function triggerDownload(dataUrl: string, fileName: string): void {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = fileName.endsWith('.png') ? fileName : `${fileName}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/** Captura o node e dispara o download do PNG. */
export async function downloadCardAsPng(
  node: HTMLElement | null,
  options: ExportOptions = {},
): Promise<void> {
  if (!node) throw new Error('Card nao encontrado para exportar.');

  const canvas = await renderToCanvas(node, options);
  const dataUrl = canvas.toDataURL('image/png', 1);
  triggerDownload(dataUrl, options.fileName ?? 'soundscape');
}

/** Versao que devolve o Blob — usada pelo compartilhamento nativo. */
export async function cardToBlob(
  node: HTMLElement | null,
  options: ExportOptions = {},
): Promise<Blob> {
  if (!node) throw new Error('Card nao encontrado para exportar.');

  const canvas = await renderToCanvas(node, options);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Nao foi possivel gerar a imagem.'));
      },
      'image/png',
      1,
    );
  });
}

/** O navegador suporta compartilhar arquivos (Web Share API nivel 2)? */
export function canShareFiles(): boolean {
  if (typeof navigator === 'undefined' || !navigator.canShare) return false;
  try {
    const probe = new File([new Blob()], 'probe.png', { type: 'image/png' });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

/**
 * Compartilha o card no menu nativo do sistema (ideal no mobile).
 * Devolve false quando nao ha suporte, para a UI cair no download.
 */
export async function shareCard(
  node: HTMLElement | null,
  options: ExportOptions & { title?: string; text?: string } = {},
): Promise<boolean> {
  if (!canShareFiles()) return false;

  const blob = await cardToBlob(node, options);
  const fileName = (options.fileName ?? 'soundscape').replace(/\.png$/, '');
  const file = new File([blob], `${fileName}.png`, { type: 'image/png' });

  try {
    await navigator.share({
      files: [file],
      title: options.title ?? 'Meu perfil musical no Soundscape',
      text: options.text,
    });
    return true;
  } catch (error) {
    // O usuario cancelar o menu nao e erro.
    if (error instanceof DOMException && error.name === 'AbortError') return true;
    return false;
  }
}
