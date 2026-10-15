# Arquitetura — midoteca-desktop (frontend)

> Vale para o app `client/` (React 19 + Vite). Visão unificada do projeto em
> [`../../docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md); diretrizes de
> domínio em [`../../docs/DDD_GUIDELINES.md`](../../docs/DDD_GUIDELINES.md);
> organização de pastas/nomes em
> [`../../docs/CODE_ORGANIZATION.md`](../../docs/CODE_ORGANIZATION.md).

## 1. Visão geral

`midoteca-desktop` é o cliente local-first da Midoteca. Hoje consome um
repositório **em memória** (`MockLibraryService`) através de uma fronteira de
contratos; o objetivo é trocar essa origem por um adapter IPC/HTTP ligado ao
núcleo `midoteca/` **sem alterar os componentes**.

O app **não** fala com o backend diretamente: toda leitura/escrita passa pelo
port `LibraryRepository` obtido via `useLibrary()` / `useLibraryRepository()`.

## 2. Camadas

```text
┌──────────────────────────────────────────────────────────────┐
│ Presentation   │ components/** · hooks de apresentação · App   │
├──────────────────────────────────────────────────────────────┤
│ Application    │ casos de uso (a extrair de views/hooks)       │
├──────────────────────────────────────────────────────────────┤
│ Domain         │ types/library.ts · regras puras               │
├──────────────────────────────────────────────────────────────┤
│ Infrastructure │ services/contracts.ts (ports)                 │
│                │ services/mockData.ts (adapter em memória)     │
│                │ (futuro) services/ipc/*                       │
└──────────────────────────────────────────────────────────────┘
```

Regra de dependência: **as setas apontam para dentro.** `domain`/`application`
não importam React nem adapters; a Presentation depende de ports (não de
implementações concretas).

## 3. Estrutura atual

```text
client/src/
├── App.tsx                     # composição da shell + estado de navegação/sessão
├── main.tsx / index.tsx        # bootstrap React
├── config/app.config.ts        # URLs de API do legado (streaming/transcode) — rever
├── types/library.ts            # DOMÍNIO (tipos/view-models)
├── services/
│   ├── contracts.ts            # PORTS: LibraryRepository (+ sub-ports)
│   ├── mockData.ts             # ADAPTER em memória (MockLibraryService/MockSearchService)
│   └── LibraryContext.tsx      # injeção (Provider) + hooks (useLibrary/useLibraryItems)
├── components/
│   ├── common/                 # Sidebar
│   ├── library/ course/ editor/ home/ search/ pdf/ player/   # features
│   ├── ui/                     # design system (Button, Badge, Tooltip, ...)
│   ├── player/use*.ts          # hooks de apresentação (playback, auto-hide)
│   └── VideoPlayer.tsx, VideoList.tsx, AddVideo.tsx, ...      # ⚠ código morto (sem importador)
├── features/*/stories/         # Storybook (catálogo visual por feature)
└── __tests__/                  # testes de componente/contrato
```

## 4. Estrutura-alvo (incremental)

```text
client/src/
├── domain/                     # entidades + regras puras (progresso, next/prev, validação)
├── application/                # casos de uso (abrir aula, persistir posição, salvar curso)
├── services/
│   ├── contracts.ts            # ports (inalterados)
│   ├── mock/*                  # adapter em memória (fixtures + serviço)
│   └── ipc/*                   # adapter real (Tauri IPC / HTTP local)
├── features/<ctx>/
│   ├── components/             # visual (~150 linhas)
│   ├── hooks/                  # apresentação
│   └── stories/                # Storybook
└── components/ui/              # design system
```

Ver priorização em
[`../../docs/REFACTORING_ROADMAP.md`](../../docs/REFACTORING_ROADMAP.md).

## 5. Fluxo de dados

```text
App.tsx (shell + navegação + sessão)
   │  useLibrary()
   ▼
LibraryContext  ──►  LibraryRepository (port)
                        │
                        ├── MockLibraryService   (hoje, memória)
                        └── IpcLibraryRepository (futuro → núcleo midoteca)
```

- `useLibraryItems()` usa `useSyncExternalStore` sobre `repository.subscribe`,
  então o catálogo re-renderiza quando cursos/documentos/filmes mudam.
- `useLibrary()` deriva `courses`/`movies`/`documents` de `items`.
- **Mutar posição de reprodução/leitura não dispara assinantes** (por contrato);
  só mutações de catálogo notificam.

## 6. Ports & Adapters (frontend)

Ports em `services/contracts.ts`:

| Port                       | Papel                                                                   |
| -------------------------- | ----------------------------------------------------------------------- |
| `LibraryCatalogRepository` | itens, curso/documento por id, salvar curso, concluir aula, `subscribe` |
| `PlaybackStateRepository`  | posição por aula, preferência de legenda, legendas custom               |
| `ReadingStateRepository`   | estado de leitura de PDF (página/rolagem/zoom/tema)                     |
| `PageProvider`             | `fetchPageRange` (mock hoje; HTTP Range/pdf.js depois)                  |
| `ISearchService`           | `search(query, filter)`                                                 |
| `LibraryRepository`        | **agregado** dos acima                                                  |

Injeção: `<LibraryProvider repository={…}>`. Sem provider, cai no mock padrão
(útil para Storybook e testes unitários). Componentes usam apenas os hooks.

## 7. Estado e navegação

- `App.tsx` concentra o **estado de interface**: aba ativa
  (`NavigationTab`), ids selecionados, e a **sessão de reprodução** (tela cheia
  vs mini player). Ao sair do player, a sessão é **minimizada**, não encerrada.
- Atalho global `Ctrl/Cmd+K` abre a busca.
- Cada view recebe dados e callbacks por props; não acessa o repositório para
  navegar.

## 8. Design system e Storybook

- `components/ui/*` — componentes atômicos reutilizáveis (Button, Badge,
  Tooltip, SearchField, ProgressBar, IconButton, SectionHeader, Spinner) com
  stories próprias.
- `features/*/stories/*` — stories por feature (Home, Library, Course, Editor,
  Player, MiniPlayer, PDF, Search).
- Storybook é o catálogo visual e serve de teste de contrato de UI.

## 9. Regras de dependência (frontend)

- `components/**` ❌ chamadas HTTP/IPC diretas · ❌ importar `mockData` direto.
  Use `useLibraryRepository()` / `useLibrary()`.
- `domain/` e `application/` (alvo) ❌ `react`, `react-dom`, `axios`,
  `@tauri-apps/*`.
- Novos adapters implementam os ports de `contracts.ts` **sem** mudar
  consumidores.

## 10. Pontos de atenção

- `config/app.config.ts` aponta para a API do **legado** (streaming/transcode).
  Deve ser revisto quando o adapter real (núcleo `midoteca`) entrar.
- Componentes `components/VideoPlayer.tsx`, `VideoList.tsx`, `AddVideo.tsx`,
  `EditVideoDialog.tsx`, `ScanDirectory.tsx` são **código morto** (sem
  importadores) — remover (P0 do roadmap).
- Algumas views passam de 500 linhas; extrair hooks/casos de uso e subcomponentes.

## 11. Testes

Stack: Vitest + `@testing-library/react` + jsdom + Storybook. Injetar repositório
fake via `LibraryProvider`. Ver [`../../docs/TESTING_STRATEGY.md`](../../docs/TESTING_STRATEGY.md).
