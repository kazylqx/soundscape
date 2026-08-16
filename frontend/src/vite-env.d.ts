/// <reference types="vite/client" />

/**
 * Variaveis de ambiente expostas ao bundle.
 * Somente chaves com prefixo VITE_ chegam ao browser — nunca coloque
 * segredos aqui (client secret do Spotify, chave da IA, etc.).
 */
interface ImportMetaEnv {
  /** URL base da API do Soundscape. */
  readonly VITE_API_URL: string;
  /** URL de callback registrada no Spotify Developer Dashboard. */
  readonly VITE_SPOTIFY_REDIRECT_URI: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
