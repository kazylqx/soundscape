# 🎵 Soundscape

Perfil musical inteligente construído a partir do seu Spotify: persona escrita por IA, análise sonora, mapa de gêneros, eras musicais, padrões de escuta, recomendações e cards prontos para compartilhar.

Monorepo com dois apps independentes (`/backend` e `/frontend`), preparados para deploy automático na [Square Cloud](https://squarecloud.app) via GitHub Actions.

---

## Sumário

- [O que o projeto entrega](#o-que-o-projeto-entrega)
- [Stack](#stack)
- [Estrutura de pastas](#estrutura-de-pastas)
- [Pré-requisitos](#pré-requisitos)
- [Criando o app no Spotify Developer Dashboard](#criando-o-app-no-spotify-developer-dashboard)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Rodando localmente](#rodando-localmente)
- [Como a autenticação funciona](#como-a-autenticação-funciona)
- [API do backend](#api-do-backend)
- [Deploy na Square Cloud](#deploy-na-square-cloud)
- [CI/CD com GitHub Actions](#cicd-com-github-actions)
- [Limitação importante da Spotify API](#limitação-importante-da-spotify-api)
- [Troubleshooting](#troubleshooting)

---

## O que o projeto entrega

| Página | Rota | Conteúdo |
| --- | --- | --- |
| Landing | `/` | Hero com partículas em canvas, mockup animado do perfil, features e CTA |
| Callback | `/callback` | Troca do `code` do OAuth por sessão, com mensagens rotativas |
| Dashboard | `/dashboard` | Saudação, tocando agora, destaques, radar compacto, últimas 20 faixas, stats |
| Perfil | `/profile` | Hero com paleta própria, biografia da IA, top charts, análise sonora, gêneros, eras, padrões e curiosidades |
| Recomendações | `/recommendations` | 10 artistas novos com motivo, referência, preview de 30s e filtros |
| Playlists | `/playlists` | Grid + análise individual (features médias, mood, BPM, "boa para") e comparativo |
| Moods | `/moods` | Calendário de 30 dias, scatter energia × positividade, extremos e humor por período |
| Décadas | `/decades` | Linha do tempo interativa, "alma de [ano]", representantes por era e evolução |
| Compartilhar | `/share` | 8 cards × 3 temas × 2 formatos, exportáveis em PNG |
| Comparar | `/compare` | Link único, compatibilidade, interseções, diferenças e playlist conjunta |

Destaques técnicos:

- **Paleta dinâmica**: as cores de cada perfil são extraídas via canvas das capas mais ouvidas e injetadas em `--vibe-primary/secondary/tertiary`.
- **Persona calculada + persona escrita**: o backend classifica o usuário em 10 arquétipos com evidências numéricas; a IA recebe esse cálculo e escreve o texto.
- **Fallback determinístico**: se a IA não estiver configurada ou falhar, o perfil é gerado localmente a partir das métricas (`fallback: true`), então a página nunca fica vazia.
- **Mini-player global**: preview de 30s que sobrevive à troca de rotas (elemento `<audio>` singleton fora do React).
- **Zero banco de dados**: sessões e caches vivem em memória (`Map`).

---

## Stack

**Backend** — Node.js, Express 4, TypeScript, Axios, Helmet, CORS, express-rate-limit. Sessões em memória, sem banco.

**Frontend** — React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, React Router v6, Zustand, Recharts, html2canvas, Axios, lucide-react (ícones).

---

## Estrutura de pastas

```
soundscape/
├── backend/
│   ├── src/
│   │   ├── routes/          auth, spotify, ai, health
│   │   ├── services/        spotifyService, aiService, tokenService, sessionService
│   │   ├── middleware/      auth, cors, rateLimit, errorHandler
│   │   ├── utils/           musicAnalyzer, logger, env, errors
│   │   ├── types/           contratos do Spotify, métricas e IA
│   │   └── app.ts           bootstrap do Express
│   ├── squarecloud.app
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── api/             client.ts (instância do Axios + ApiError)
│   │   ├── auth/            AuthContext, useAuth, RequireAuth
│   │   ├── components/      ui, layout, charts, profile, cards, player, animations
│   │   ├── pages/           Landing, Callback, Dashboard, Profile, Recommendations,
│   │   │                    Playlists, Moods, Decades, Share, Compare
│   │   ├── stores/          authStore, musicStore, playerStore
│   │   ├── hooks/           useMusicData, useAIAnalysis, useTheme
│   │   ├── utils/           colorExtractor, exportCard, formatters, musicAnalyzer
│   │   ├── types/           espelho dos tipos do backend
│   │   ├── styles/          globals.css
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── squarecloud.app
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── .env.example
│
├── .github/workflows/
│   ├── deploy-backend.yml
│   └── deploy-frontend.yml
├── .gitignore
└── README.md
```

Por que `types/` existe nos dois lados: o frontend não importa código do backend (são apps separados na Square Cloud), então os contratos são espelhados. **Ao mudar um tipo em `backend/src/types/index.ts`, replique em `frontend/src/types/index.ts`.**

---

## Pré-requisitos

- Node.js 20 ou superior (`node --version`)
- npm 10+
- Conta no [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) (a conta do usuário final pode ser Free — **Premium não é necessário**)
- Chave de uma API de IA compatível com o formato OpenAI Chat Completions (OpenAI, OpenRouter, Groq...) — **opcional**, o app funciona sem ela no modo fallback
- Conta na Square Cloud com plano ativo (para o deploy)

---

## Criando o app no Spotify Developer Dashboard

1. Acesse o [dashboard](https://developer.spotify.com/dashboard) e clique em **Create app**.
2. Preencha nome e descrição. Em **Which API/SDKs are you planning to use?**, marque **Web API**.
3. Em **Redirect URIs**, adicione **exatamente** estas URLs (uma por linha):

   ```
   http://127.0.0.1:5173/callback
   https://soundscape.squareweb.app/callback
   ```

   Substitua o domínio de produção pelo subdomínio real do seu app frontend na Square Cloud.

   > O Spotify não aceita mais `http://localhost` em redirect URIs — use `127.0.0.1`. A URI precisa ser idêntica (protocolo, host, porta e path) à configurada no backend e no frontend.

4. Salve e copie **Client ID** e **Client Secret** (o secret fica atrás do botão *View client secret*).

Escopos solicitados pelo app (somente leitura, nenhuma permissão de escrita):

`user-read-private`, `user-read-email`, `user-top-read`, `user-read-recently-played`, `user-library-read`, `user-follow-read`, `playlist-read-private`, `playlist-read-collaborative`, `user-read-currently-playing`, `user-read-playback-state`

---

## Variáveis de ambiente

Nunca commite `.env`. Cada pasta tem um `.env.example` documentando o necessário.

### `backend/.env`

| Variável | Obrigatória | Descrição |
| --- | :---: | --- |
| `NODE_ENV` | — | `development` ou `production` |
| `PORT` | — | Porta HTTP (padrão `3333`). Na Square Cloud é injetada automaticamente |
| `SPOTIFY_CLIENT_ID` | ✅ | Client ID do app do Spotify |
| `SPOTIFY_CLIENT_SECRET` | ✅ | Client Secret — **nunca sai do servidor** |
| `SPOTIFY_REDIRECT_URI` | ✅ | URL de callback do frontend, igual à registrada no Spotify |
| `AI_API_KEY` | — | Chave da API de IA. Sem ela, o perfil usa o fallback determinístico |
| `AI_MODEL` | — | Modelo usado (padrão `gpt-4o`) |
| `AI_BASE_URL` | — | Base da API (padrão `https://api.openai.com/v1`) |
| `AI_TIMEOUT_MS` | — | Timeout da chamada de IA (padrão `90000`) |
| `SESSION_SECRET` | ✅ em produção | String aleatória longa que assina os session tokens |
| `SESSION_TTL_HOURS` | — | Vida da sessão (padrão `12`) |
| `FRONTEND_URL` | ✅ | Origem permitida no CORS. Aceita lista separada por vírgula |
| `RATE_LIMIT_MAX` / `RATE_LIMIT_AI_MAX` | — | Tetos de requisição por janela |
| `LOG_LEVEL` | — | `debug`, `info`, `warn` ou `error` |

Gere o `SESSION_SECRET` com:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### `frontend/.env`

| Variável | Descrição |
| --- | --- |
| `VITE_API_URL` | URL base do backend (ex.: `https://soundscape-api.squareweb.app`) |
| `VITE_SPOTIFY_REDIRECT_URI` | URL de callback, idêntica à do Spotify e à do backend |

> Tudo com prefixo `VITE_` é embutido no bundle público. **Nunca** coloque client secret ou chave de IA aqui.

---

## Rodando localmente

Backend e frontend rodam em terminais separados.

**Terminal 1 — backend**

```bash
cd backend
npm install
cp .env.example .env      # Windows: copy .env.example .env
# edite o .env com suas credenciais
npm run dev               # http://127.0.0.1:3333
```

**Terminal 2 — frontend**

```bash
cd frontend
npm install
cp .env.example .env      # Windows: copy .env.example .env
npm run dev               # http://127.0.0.1:5173
```

Abra `http://127.0.0.1:5173` e clique em **Conectar Spotify**.

Verificação rápida do backend:

```bash
curl http://127.0.0.1:3333/health
```

Scripts disponíveis:

| Pasta | Comando | O que faz |
| --- | --- | --- |
| backend | `npm run dev` | Servidor com reload (tsx watch) |
| backend | `npm run build` | Compila TypeScript para `dist/` |
| backend | `npm start` | Roda `dist/app.js` |
| backend | `npm run typecheck` | Checagem de tipos sem emitir |
| frontend | `npm run dev` | Vite dev server |
| frontend | `npm run build` | `tsc -b` + build de produção + gera `404.html` |
| frontend | `npm run preview` | Serve o build local |

---

## Como a autenticação funciona

```
Browser                      Backend                        Spotify
   │                            │                              │
   │ GET /auth/login ──────────>│                              │
   │<── { url, state } ─────────│ (monta a URL de autorização) │
   │                            │                              │
   │ redirect ───────────────────────────────────────────────-─>│
   │<── /callback?code&state ───────────────────────────────────│
   │                            │                              │
   │ POST /auth/callback ──────>│ troca code + client_secret ─>│
   │                            │<── access + refresh token ───│
   │<── { sessionToken, user } ─│ (tokens ficam em memória)    │
   │                            │                              │
   │ X-Session-Token: <uuid> ──>│ usa o access token ─────────>│
```

Pontos de segurança:

- O `client_secret` e os tokens do Spotify **nunca** chegam ao browser. O `localStorage` guarda apenas um `sessionToken` opaco no formato `<uuid>.<hmac>`, assinado com `SESSION_SECRET`.
- O `state` do OAuth é de uso único e expira em 10 minutos (proteção contra CSRF).
- **Refresh transparente**: quando faltam menos de 60s para o `access_token` expirar, o backend o renova com o `refresh_token` antes da chamada. Se a Spotify API responder 401 mesmo assim, um refresh forçado é feito e a requisição é repetida uma vez. Chamadas concorrentes compartilham o mesmo refresh.
- Ao receber 401 do backend, o frontend limpa a sessão e volta para a home automaticamente.

---

## API do backend

Todas as respostas seguem o mesmo envelope:

```json
{ "ok": true,  "data": {} }
{ "ok": false, "error": { "code": "SESSION_INVALID", "message": "..." } }
```

Rotas privadas exigem o header `X-Session-Token`.

| Método | Rota | Auth | Descrição |
| --- | --- | :---: | --- |
| `GET` | `/health` | — | Status, uptime, integrações e memória |
| `GET` | `/auth/login` | — | Devolve a URL de autorização e o `state` |
| `POST` | `/auth/callback` | — | Troca `{ code, state }` por `{ sessionToken, user }` |
| `GET` | `/auth/me` | ✅ | Usuário e metadados da sessão |
| `POST` | `/auth/logout` | ✅ | Encerra a sessão |
| `GET` | `/spotify/snapshot?refresh=1` | ✅ | Coleta completa + métricas derivadas |
| `GET` | `/spotify/metrics` | ✅ | Apenas as métricas |
| `GET` | `/spotify/now-playing` | ✅ | Tocando agora (leve, para polling) |
| `GET` | `/spotify/search/artist?q=` | ✅ | Busca de artista |
| `POST` | `/spotify/compare/link` | ✅ | Cria o link de comparação |
| `GET` | `/spotify/compare/:code` | — | Metadados públicos do link |
| `POST` | `/spotify/compare/:code` | ✅ | Executa a comparação |
| `POST` | `/ai/profile` | ✅ | Gera (ou devolve do cache) o perfil de IA |
| `GET` | `/ai/profile` | ✅ | Só o cache, sem gastar tokens |
| `DELETE` | `/ai/profile` | ✅ | Descarta o cache da análise |

O snapshot é cacheado por sessão (15 min por padrão) para não repetir ~30 chamadas na Spotify API a cada navegação. A coleta usa concorrência limitada (5 requisições simultâneas), lotes de 100 IDs para audio features e 50 para artistas, com retry e backoff exponencial em 429/5xx.

### Dados coletados

Top artists e top tracks nos três períodos (`short_term`, `medium_term`, `long_term`, 50 cada), recently played (50 com timestamps), saved tracks (até 200 paginadas), playlists com as faixas das mais relevantes, followed artists, audio features de todas as faixas coletadas, detalhes de artistas (gêneros, imagens, popularidade) e currently playing.

### Métricas calculadas

Médias das audio features, mapa de gêneros com percentuais, distribuição por década, horário de pico, heatmap hora × dia, score mainstream, score de diversidade, humor dominante, taxa de repetição, concentração no artista principal, ano médio de lançamento, evolução short vs long term e a persona (10 arquétipos, escolhida por pontuação com evidências).

---

## Deploy na Square Cloud

A Square Cloud hospeda **dois apps separados**, cada um apontando para sua pasta. O arquivo `squarecloud.app` dentro de cada pasta configura aquele app.

### Backend — `Soundscape API`

```
MAIN=dist/app.js
MEMORY=512
VERSION=recommended
DISPLAY_NAME=Soundscape API
SUBDOMAIN=soundscape-api
START=npm run square:start
AUTORESTART=true
```

`square:start` compila o TypeScript e sobe o servidor (`npm run build && node dist/app.js`). Por isso `typescript` e os pacotes `@types/*` ficam em `dependencies`, e não em `devDependencies` — o compilador precisa existir no ambiente de produção.

### Frontend — `Soundscape`

```
MAIN=index.html
RUNTIME=static
MEMORY=512
VERSION=recommended
DISPLAY_NAME=Soundscape
SUBDOMAIN=soundscape
START=npm run build
AUTORESTART=true
```

O script `postbuild` copia `dist/index.html` para `dist/404.html`. Isso é **essencial**: sem esse arquivo, o host estático devolve 404 em links diretos como `/callback` e `/dashboard`, e o login do Spotify quebra.

### Passo a passo

1. Suba o monorepo para um repositório no GitHub.
2. No dashboard da Square Cloud, crie o app do **backend** conectando o repositório e apontando para a pasta `backend`.
3. Configure as variáveis de ambiente do backend no dashboard. Use a URL final do frontend em `FRONTEND_URL`.
4. Crie o app do **frontend** apontando para a pasta `frontend`, com `VITE_API_URL` e `VITE_SPOTIFY_REDIRECT_URI`.
5. Volte ao Spotify Developer Dashboard e adicione a redirect URI de produção (`https://<seu-subdominio>/callback`).
6. A cada `push` na branch `main`, o deploy acontece automaticamente.

---

## CI/CD com GitHub Actions

Dois workflows em `.github/workflows/`, cada um disparando apenas quando a sua pasta muda:

- **`deploy-backend.yml`** — `push` na `main` com mudanças em `backend/**`. Instala dependências, roda typecheck, compila e envia um zip (`dist`, `src`, `package.json`, `package-lock.json`, `tsconfig.json`, `squarecloud.app`) com `squarecloudofc/github-action@v2`.
- **`deploy-frontend.yml`** — `push` na `main` com mudanças em `frontend/**`. Instala, builda com as variáveis `VITE_*` e envia o conteúdo de `dist` (já com `404.html` e o `squarecloud.app`).

Ambos aceitam disparo manual (`workflow_dispatch`).

### Secrets necessários

Em **Settings → Secrets and variables → Actions → Repository secrets**:

| Secret | Usado por | Onde encontrar |
| --- | --- | --- |
| `SQUARE_TOKEN` | ambos | Dashboard da Square Cloud → configurações da conta → API token |
| `SQUARE_BACKEND_APP_ID` | backend | ID do app do backend na Square Cloud |
| `SQUARE_FRONTEND_APP_ID` | frontend | ID do app do frontend na Square Cloud |
| `VITE_API_URL` | frontend | URL pública do backend (ex.: `https://soundscape-api.squareweb.app`) |
| `VITE_SPOTIFY_REDIRECT_URI` | frontend | `https://<subdominio-do-frontend>/callback` |

As duas variáveis `VITE_*` são secrets porque o build acontece no runner do GitHub — o Vite precisa delas no momento da compilação para embuti-las no bundle.

---

## Limitação importante da Spotify API

Desde **27/11/2024** o Spotify restringiu alguns endpoints para aplicativos criados após essa data (apps em *development mode* sem acesso estendido). Os principais impactos aqui:

| Recurso | Status para apps novos | Como o Soundscape lida |
| --- | --- | --- |
| `GET /audio-features` | Bloqueado (403) | O backend detecta o 403, marca `meta.audioFeaturesUnavailable = true` e **estima** as features a partir de gênero, popularidade e duração (`estimateFeaturesForTracks`). A UI mostra o aviso "Valores estimados" nas páginas afetadas. |
| `preview_url` das tracks | Frequentemente `null` | O `PlayButton` só mostra play quando existe preview; caso contrário exibe "Abrir no Spotify". O mini-player nunca aparece sem áudio real. |
| `GET /recommendations` e `/related-artists` | Bloqueados | O projeto não usa esses endpoints. As recomendações vêm da IA e são enriquecidas via `GET /search` + `GET /artists/{id}/top-tracks`, que continuam liberados. |

Todas as listas de artistas, músicas, gêneros, playlists, décadas e horários continuam sendo **dados reais** da conta. Se o seu app tiver acesso estendido (ou for anterior à mudança), as features vêm medidas de verdade e o aviso desaparece automaticamente.

---

## Troubleshooting

**`INVALID_CLIENT: Invalid redirect URI`**
A URI registrada no Spotify difere da usada pelo app. Os três valores precisam ser idênticos, caractere por caractere: `SPOTIFY_REDIRECT_URI` (backend), `VITE_SPOTIFY_REDIRECT_URI` (frontend) e a entrada no dashboard do Spotify. Use `127.0.0.1`, não `localhost`.

**`STATE_INVALID` — "Requisição de login expirada ou inválida"**
O `state` do OAuth é de uso único, expira em 10 minutos e vive na memória do backend. Isso acontece se o servidor reiniciou durante o login, se a página de callback foi recarregada ou se o link do callback foi reaproveitado. Volte à home e conecte novamente.

**`SPOTIFY_INVALID_CLIENT`**
`SPOTIFY_CLIENT_ID` ou `SPOTIFY_CLIENT_SECRET` estão errados ou vazios. Confira o `.env` do backend e o dashboard da Square Cloud.

**Erro de CORS no console do browser**
`FRONTEND_URL` no backend precisa conter a origem exata do frontend, sem barra no final. Aceita lista: `https://soundscape.squareweb.app,https://outro-dominio.com`. Em desenvolvimento, qualquer `localhost`/`127.0.0.1` é liberado automaticamente.

**"Seu histórico ainda está em branco"**
O Spotify precisa de algumas semanas de escuta para popular `/me/top`. Contas novas retornam listas vazias — não é bug do app.

**Gráficos com aviso "Valores estimados"**
Seu app do Spotify não tem acesso a `/audio-features`. Veja a seção [Limitação importante da Spotify API](#limitação-importante-da-spotify-api).

**Botão de play não aparece em algumas músicas**
Aquela faixa não tem `preview_url` (varia por região e por licenciamento). O botão vira "Abrir no Spotify".

**404 em `/callback` ou `/dashboard` em produção**
Falta o `dist/404.html`. Rode `npm run build` na pasta `frontend` (o `postbuild` gera o arquivo) e confirme que ele foi enviado no deploy.

**Card exportado sem as capas dos álbuns**
O html2canvas precisa que as imagens tenham sido carregadas com permissão de CORS. Recarregue a página antes de exportar. As imagens do CDN do Spotify (`i.scdn.co`) liberam CORS, então funciona no caso normal.

**Sessão caindo sozinha / "A sessão de quem criou o link expirou"**
As sessões vivem em memória: qualquer restart do backend (inclusive um deploy) invalida todas. É uma consequência assumida do design sem banco de dados.

**A análise de IA volta com `fallback: true`**
`AI_API_KEY` não está configurada, a chave é inválida ou a chamada falhou. O perfil determinístico assume o lugar e o app segue funcionando. Confira os logs do backend.

**`npm run build` do backend falha na Square Cloud**
`typescript` e `@types/*` precisam estar em `dependencies` (já estão). Se você moveu para `devDependencies`, o `START` não encontra o compilador.

---

## Licença

MIT.

Soundscape não é afiliado ao Spotify. Spotify é uma marca registrada da Spotify AB. Os dados exibidos vêm da própria conta do usuário, são processados no momento da consulta e não são armazenados em banco de dados.
