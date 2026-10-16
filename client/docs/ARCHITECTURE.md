# Arquitetura — midoteca-desktop (frontend)

> App `client/` (React 19 + Vite 6 + TypeScript strict). **Modelo canônico
> (fonte única de verdade, vale também para o backend):
> [`../../docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md)**. Este documento
> descreve a **implementação atual do frontend** e sua convergência ao modelo
> canônico (§4). Padrões táticos em
> [`../../docs/DDD_GUIDELINES.md`](../../docs/DDD_GUIDELINES.md); pastas e nomes em
> [`../../docs/CODE_ORGANIZATION.md`](../../docs/CODE_ORGANIZATION.md); testes em
> [`../../docs/TESTING_STRATEGY.md`](../../docs/TESTING_STRATEGY.md).

## 1. Visão geral

`midoteca-desktop` é o cliente local-first da Midoteca. Hoje consome um
repositório **em memória com persistência em `localStorage`**
(`MockLibraryService`); o objetivo é trocar essa origem por um adapter ligado ao
núcleo `midoteca/` **sem alterar os componentes**.

O app **não** fala com o núcleo diretamente: toda leitura/escrita passa pelo port
`LibraryRepository`, obtido via `useLibrary()` / `useLibraryRepository()`.

## 2. Camadas (canônicas)

```text
┌────────────────────────────────────────────────────────────────┐
│ presentation │ componentes, Views, Providers, hooks de          │
│              │ apresentação (AutoHideControls, MediaPlayback…)  │
├────────────────────────────────────────────────────────────────┤
│ application  │ casos de uso e orquestração (sem React)          │
├────────────────────────────────────────────────────────────────┤
│ domain       │ tipos/entidades, regras puras (progresso, próxima │
│              │ aula, validação) — sem IO, sem React             │
├────────────────────────────────────────────────────────────────┤
│ infrastructure │ adapters: mock persistente (hoje), IPC/HTTP     │
│                │ (futuro) — implementam os ports                │
└────────────────────────────────────────────────────────────────┘
      port (core/ports)  ◄── implements ──  adapter (infrastructure)
```

Regra de dependência: **as setas apontam para dentro.** `domain`/`application`
não importam React nem adapters; `presentation` depende de ports, nunca de
implementação concreta.

## 3. Estrutura atual (verificada)

```text
client/src/
├── app/
│   ├── App.tsx                 # shell: aba ativa, ids selecionados, sessão de reprodução
│   └── main.tsx                # entry React + COMPOSITION ROOT (injeta o repositório)
├── core/                       # KERNEL compartilhado
│   ├── config/app.config.ts    # configuração do app
│   ├── domain/library.ts       # DOMÍNIO: Course, Movie, Document, Lesson, SearchResult, ISearchService
│   └── ports/libraryRepository.ts  # PORTS: catálogo + playback + leitura + page + search
├── features/
│   ├── library/
│   │   ├── infrastructure/     # mockLibraryRepository.ts (737 linhas), libraryStorage.ts
│   │   └── presentation/       # LibraryProvider.tsx, LibraryView.tsx (+ stories)
│   ├── home/presentation/      # HomeView.tsx, Sidebar.tsx
│   ├── courses/
│   │   ├── application/        # useCourseEditor.ts
│   │   └── presentation/       # CourseDetailsView.tsx, CourseEditorView.tsx, subcomponentes
│   ├── player/
│   │   ├── application/        # useVideoPlayer.ts, useMediaElementPlayback.ts, useAutoHideControls.ts
│   │   └── presentation/       # VideoPlayerView, MoviePlayerView, MiniPlayer, PlayerSurface,
│   │                           # PlayerTimeline, PlaybackControls, SubtitleMenu, SpeedMenu, …
│   ├── documents/
│   │   ├── application/        # usePdfReader.ts
│   │   └── presentation/       # PdfViewer.tsx, PdfTextPage.tsx, …
│   ├── search/
│   │   ├── application/        # useUniversalSearch.ts
│   │   └── presentation/       # SearchView.tsx, SearchResultCard, …
│   └── settings/presentation/  # SettingsView.tsx
├── shared/ui/                  # design system: Badge, Button, IconButton, ProgressBar,
│                               # SearchField, SectionHeader, Spinner, Tooltip (+ stories)
├── test/setup.ts               # setup do Vitest (jsdom)
├── __tests__/                  # 13 arquivos de teste
├── stories/                     # ⚠️ sobras do CRA (Button/Header/Page + assets) — código morto
└── legacy/                      # ⚠️ sobras do myPlay (fora do build) — código morto
```

Contextos e maturidade das camadas (estado real):

| Contexto | `domain/` | `application/` | `infrastructure/` | `presentation/` |
| --- | --- | --- | --- | --- |
| `library` | — | — | ✅ mock + storage | ✅ provider + view |
| `home` | — | — | — | ✅ |
| `courses` | — | ✅ hook | — | ✅ |
| `player` | — | ✅ 3 hooks | — | ✅ 9 arquivos |
| `documents` | — | ✅ hook | — | ✅ |
| `search` | — | ✅ hook | — | ✅ |
| `settings` | — | — | — | ✅ |

Legenda: `domain/` ainda não existe em nenhum contexto (regras puras permanecem
dentro de hooks); `hooks` listados em `application/` são hoje **hooks de
apresentação** e devem migrar para `presentation/hooks/` (P7 do roadmap).

## 4. Convergência ao modelo canônico

O frontend está **quase** no modelo canônico: `app/`, `core/{domain,ports,config}`
e `shared/ui` já são exatamente os caminhos canônicos. O que falta:

| Atual | Canonônico | Passo |
| --- | --- | --- |
| `src/features/<ctx>/…` | `src/modules/<ctx>/…` (mesmo nome do backend) | P6 — rename mecânico de pasta + imports (`@/features/*` → `@/modules/*`) |
| hooks de apresentação em `application/` | `presentation/hooks/useXxx.ts` | P7 — separar caso de uso (sem React) de hook de apresentação |
| `src/__tests__/*.test.tsx` | `test/**` espelhando a árvore | P6 |
| `features/<ctx>/domain/` ausente | criar **quando houver regra pura** | incremental |
| `src/legacy/`, `src/stories/` | remover (sem importador, fora do build) | P0 |
| `core/config/app.config.ts` aponta para a API do **legado** (streaming/transcode) | revisar quando o adapter real entrar | P3 |

Prioridades em
[`../../docs/REFACTORING_ROADMAP.md`](../../docs/REFACTORING_ROADMAP.md).

## 5. Fluxo de dados

```text
main.tsx (composition root)
   │  new MockLibraryService(localStorageLibraryStorage)
   ▼
<LibraryProvider repository={…}>
   │  useLibrary()            → courses / movies / documents / items
   │  useLibraryRepository()  → o repositório (para casos de uso)
   │  useLibraryItems()       → useSyncExternalStore(repository.subscribe, …)
   ▼
view (presentation) ──► useCase/hook (application) ──► LibraryRepository (port)
                                                          │
                                                          ├── MockLibraryService   (hoje)
                                                          └── IpcLibraryRepository (futuro → núcleo)
```

- `useLibraryItems()` usa `useSyncExternalStore` sobre `repository.subscribe`; o
  snapshot precisa ser **estável** (não criar array novo a cada leitura).
- `useLibrary()` deriva `courses`/`movies`/`documents` de `items`.
- **Mutar posição de reprodução/leitura não dispara assinantes** (por contrato);
  só mutações de catálogo notificam.

## 6. Ports & Adapters (frontend)

Ports em `src/core/ports/libraryRepository.ts`:

| Port | Papel |
| --- | --- |
| `LibraryCatalogRepository` | itens, curso/documento por id, salvar curso, concluir aula, `subscribe` |
| `PlaybackStateRepository` | posição por aula, preferência de legenda, legendas custom |
| `ReadingStateRepository` | estado de leitura de PDF (página/rolagem/zoom/tema) |
| `PageProvider` | `fetchPageRange` (mock hoje; HTTP Range/pdf.js depois) |
| `ISearchService` | `search(query, filter)` |
| `LibraryRepository` | **agregado** dos acima (conveniência de composição) |
| `LibraryStorage` (infra) | porta de persistência: `load`/`save`/`clear`; adapter `localStorage` |

Injeção: `<LibraryProvider repository={…}>`. Sem provider, o contexto assume o
mock padrão (útil para Storybook e testes). Existe um segundo port de
infraestrutura, `LibraryStorage`, que permite trocar `localStorage` por outro
mecanismo sem tocar no serviço — mesmo padrão do núcleo.

## 7. Estado e navegação

- `app/App.tsx` concentra **estado de interface**: aba ativa (`NavigationTab`),
  ids selecionados e a **sessão de reprodução** (tela cheia × mini player). Ao
  sair do player, a sessão é **minimizada**, não encerrada.
- Atalho global `Ctrl/Cmd+K` abre a busca.
- Views recebem dados e callbacks por props; não navegam acessando o repositório.

## 8. Design system e Storybook

- `src/shared/ui/*` — átomos reutilizáveis (Button, Badge, IconButton,
  ProgressBar, SearchField, SectionHeader, Spinner, Tooltip) com stories.
- Stories por contexto, colocalizadas na `presentation/` do próprio contexto.
- Total atual: **22 arquivos de story**. Storybook é o catálogo visual e serve de
  teste de contrato de UI (roda em modo browser via Vitest + addon do Storybook).

## 9. Regras de dependência (frontend)

- `presentation/**` ❌ HTTP/IPC direto · ❌ `localStorage` · ❌ importar o adapter
  mock direto. Use `useLibraryRepository()` / `useLibrary()`.
- `domain/**` e `application/**` ❌ `react`, `react-dom`, `axios`,
  `@tauri-apps/*`, `localStorage`, `fetch`.
- Novos adapters implementam os ports existentes **sem** mudar consumidores.
- Matriz completa e `grep` de verificação:
  [`../../docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) §5.

## 10. Pontos de atenção (dívida conhecida)

- `core/config/app.config.ts` aponta para a API do **legado** (streaming/transcode).
- `mockLibraryRepository.ts` com 737 linhas — separar fixtures de adapter (P2).
- Nenhum contexto tem `domain/`; regras puras ainda dentro de hooks.
- `legacy/` e `stories/` são código morto sem importador (P0).
- Testes em `src/__tests__` (dentro do código de produção) — mover para `test/`.

## 11. Testes

Stack: Vitest + `@testing-library/react` + jsdom + Storybook, em **dois projetos**
do Vitest (unidade em jsdom; stories em browser via Playwright/chromium).
Injetar repositório fake via `<LibraryProvider repository={fake}>`. Detalhes em
[`../../docs/TESTING_STRATEGY.md`](../../docs/TESTING_STRATEGY.md).
