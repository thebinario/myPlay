# Arquitetura — Midoteca (modelo canônico único)

> **Fonte única de verdade da arquitetura.** Vale para os **dois runtimes**:
> núcleo/backend (`midoteca/`) e desktop/frontend (`client/`). Ambos usam **as
> mesmas camadas, os mesmos nomes de pasta e as mesmas regras de dependência**.
>
> Documentos derivados (não canônicos): [`DDD_GUIDELINES.md`](DDD_GUIDELINES.md)
> (padrões táticos + SOLID) · [`CODE_ORGANIZATION.md`](CODE_ORGANIZATION.md)
> (pastas e nomes) · [`TESTING_STRATEGY.md`](TESTING_STRATEGY.md) (testes por
> camada) · [`CONVENTIONS.md`](CONVENTIONS.md) (tooling e commits) ·
> [`REFACTORING_ROADMAP.md`](REFACTORING_ROADMAP.md) (migração incremental) ·
> [`ROADMAP.md`](ROADMAP.md) (plano de produto). Regra permanente em
> [`../AGENTS.md`](../AGENTS.md).

## 1. Por que um modelo único

A Midoteca tem dois runtimes (domínio local-first em TypeScript e interface
React), mas **uma só arquitetura**. Isso significa:

- o mesmo vocabulário de camadas (`domain`, `application`, `infrastructure`,
  `presentation`) nos dois lados, com o **mesmo significado**;
- a mesma forma de fatia vertical (um diretório por contexto, com as quatro
  camadas dentro);
- as mesmas regras de dependência, verificáveis por busca de imports;
- as mesmas práticas de DDD, Clean Architecture, Hexagonal (Ports & Adapters) e
  SOLID.

O que **pode** variar por lado é apenas o idioma de nomes de arquivo (kebab-case
no núcleo, `PascalCase` em componentes React — ver
[`CODE_ORGANIZATION.md`](CODE_ORGANIZATION.md) §4) e a tecnologia dos adapters.

> **Vocabulário.** Nesta arquitetura, o artefato que o hexagonal chama de *port*
> é chamado de **contrato**. Um contrato é uma interface que o runtime precisa de
> fora; o **adapter** é a implementação concreta. "Ports & Adapters" permanece
> apenas como o nome do padrão.

## 2. As cinco áreas de um runtime

Todo runtime da Midoteca se organiza nas **mesmas cinco áreas**:

| Área | Papel | Pode conter regra de negócio? |
| --- | --- | --- |
| `app/` | **Composition root** e shell: único lugar que conhece adapters concretos e monta o grafo de dependências | Não (só montagem/injeção) |
| `core/` | **Kernel compartilhado** por todos os contextos: tipos/entidades canônicas, contratos de fronteira do runtime, erros, validação, ids, clock, config | Só o que é **compartilhado**; regra específica mora no contexto |
| `modules/` | **Um diretório por bounded context** (fatia vertical com as quatro camadas) | Sim — é aqui que a regra vive |
| `shared/` | Reutilizável entre contextos **sem regra de negócio**: `ui`, `providers` (seams de injeção), `testing`, utilitários neutros | Não |
| `platform/` | **Adapters técnicos compartilhados por 2+ contextos**: persistência, filesystem, eventos, desktop/IPC, nuvem | Não (só tradução técnica) |

Regra de alocação de adapter (§6) é o que decide entre `modules/<ctx>/infrastructure`
e `platform/`.

## 3. As quatro camadas de um contexto (e seus nomes canônicos)

Dentro de cada contexto, as quatro camadas são sempre as mesmas — nos dois
runtimes — e **cada tipo de arquivo tem um lugar e um nome fixos**:

| Camada | Responsabilidade | Arquivos canônicos |
| --- | --- | --- |
| `domain/` | Entidades, value objects, regras puras, **contratos do contexto**. Zero IO, zero framework | `entities.ts` · `types.ts` · `errors.ts` · `events.ts` · `repositories.ts` · `contracts.ts` · `<regra>.ts` |
| `application/` | **Casos de uso** explícitos: escrita (`use-cases/`) e leitura (`queries/`), com entrada/saída **colocalizadas** | `use-cases/<verbo>-<sub>.ts` · `queries/<verbo>-<sub>.ts` · `dependencies.ts` · `services/<nome>.ts` |
| `infrastructure/` | **Adapters** que implementam os contratos do contexto | `<ctx>.repository.sqlite.ts` · `<ctx>.query.sqlite.ts` · (mock/IPC/HTTP) |
| `presentation/` | Superfície do runtime, **fina**: entrega e recebe, nunca decide | BE: `controllers/<nome>.controller.ts` · FE: `views/` · `components/` · `providers/` · `hooks/` · `stories/` |

O que cada arquivo de `domain/` contém:

| Arquivo | Contém | Exemplo |
| --- | --- | --- |
| `domain/entities.ts` | Entidades e value objects | `Course`, `LibrarySource`, `MediaFile` |
| `domain/types.ts` | Tipos/enums de domínio que **não** são entidade | `MediaKind`, `IndexStatus` |
| `domain/errors.ts` | Erros do contexto | `ManifestParseError` |
| `domain/events.ts` | Eventos de domínio e seus payloads | `LibraryEvent`, `LibraryEventPayloads` |
| `domain/repositories.ts` | **Interfaces de repositório + seus comandos de entrada** (`CreateX`/`UpdateX`/`MoveX`) **+ contratos de leitura (store)** | `LibraryRepository`, `CreateLibrarySource`, `IndexingStore`, `LibraryQueryStore` |
| `domain/contracts.ts` | Demais **contratos** de dependência externa (não-repositório) | `FileScanner`, `SourceProbe`, `ManifestLoader`, `EventBus` |
| `domain/read-models.ts` | **Read models** (projeções) referenciados por um contrato de leitura | `CourseSummary`, `DocumentSummary`, `SourceIndexState` |
| `domain/<regra>.ts` | Regra pura / domain service | `organization.ts`, `manifest.ts` |

E o que cada subpasta de `presentation/` contém (frontend; no backend só
`controllers/` existe, quando houver transporte):

| Subpasta | Contém | Exemplo |
| --- | --- | --- |
| `presentation/views/` | Telas (uma por rota/aba), finas | `views/LibraryView.tsx` |
| `presentation/components/` | Subcomponentes/átomos **do contexto** | `components/PlayerSurface.tsx` |
| `presentation/providers/` | React Context/Provider **local ao contexto** (seam consumido por 2+ contextos → `shared/providers/`; ver nota abaixo) | `providers/XProvider.tsx` |
| `presentation/hooks/` | Hooks de apresentação | `hooks/useVideoPlayer.ts` |
| `presentation/stories/` | Stories do Storybook | `stories/MiniPlayer.stories.tsx` |

> **Só crie a subpasta que tiver conteúdo** (`AGENTS.md` §2). Design system fica
> em `shared/ui/{components,stories}/`.
>
> **Onde vive um Provider/Context (frontend).** Provider **local** a um contexto
> (só ele consome) → `modules/<ctx>/presentation/providers/`. Seam de **injeção
> de dependência consumido por 2+ contextos** (ex.: o repositório da biblioteca,
> usado por `library`, `courses`, `player`, `documents`, `search` e `settings`)
> → `shared/providers/`, que **não** contém regra de negócio: define o Context,
> os hooks de consumo e delega ao contrato de `core/contracts/`. A injeção do
> adapter concreto continua exclusivamente em `app/` (§13). Isso é o que impede
> um contexto de importar a `presentation/` de outro.

> **Regra de ouro dos contratos:** persistência de agregado → `repositories.ts`;
> **qualquer outra** dependência externa → `contracts.ts`. Comandos usados por um
> repositório moram junto do repositório, **nunca** em um `inputs.ts` à parte.
>
> **Contrato de leitura (store).** O contrato do store de leitura **e** os read
> models que ele referencia ficam no `domain/` (`repositories.ts` +
> `read-models.ts`), porque quem o implementa é a `infrastructure` — e a matriz
> (§5) proíbe `infrastructure → application`. `application/queries/` contém
> **apenas as operações** de leitura, que delegam ao store.

Fluxo permitido:

```text
presentation ──► application ──► domain ◄── infrastructure
       (fino)          (casos de uso)   (regras)     (adapters)
```

**Não existe** `dto.ts`, `inputs.ts` genérico nem um `queries.ts` com várias
operações. Motivos e alternativas em [`DDD_GUIDELINES.md`](DDD_GUIDELINES.md) §4.

## 4. Estrutura canônica (idêntica nos dois runtimes)

```text
<runtime>/src/
├── app/                          # COMPOSITION ROOT + shell (único ponto com adapters concretos)
│   ├── composition-root.ts       # backend: createMidoteca()/bootstrap
│   ├── App.tsx · main.tsx        # frontend: shell + entry
│   └── navigation/               # estado de interface/navegação (frontend)
├── core/                         # KERNEL COMPARTILHADO (não é um contexto)
│   ├── domain/                   # entidades/tipos canônicos usados por 2+ contextos
│   ├── contracts/                # contratos de fronteira do runtime (ex.: LibraryRepository do FE)
│   └── errors.ts · ids.ts · validation.ts · clock.ts · config.ts · ...
├── modules/                      # UM DIRETÓRIO POR BOUNDED CONTEXT
│   └── <contexto>/
│       ├── domain/               # regra pura
│       │   ├── entities.ts       # entidades + value objects
│       │   ├── types.ts          # tipos/enums de domínio (não-entidade)
│       │   ├── errors.ts · events.ts
│       │   ├── repositories.ts   # contratos de repositório + comandos (CreateX/UpdateX) + store de leitura
│       │   ├── contracts.ts      # demais contratos externos (scanner, probe, bus)
│       │   ├── read-models.ts    # read models referenciados por contratos de leitura
│       │   └── <regra>.ts        # domain service / regra pura
│       ├── application/
│       │   ├── use-cases/<verbo>-<sub>.ts   # ESCRITA + input/output colocalizados
│       │   ├── queries/<verbo>-<sub>.ts     # LEITURA (operação) — delega ao store do domain
│       │   ├── dependencies.ts              # deps compartilhadas por 2+ operações
│       │   └── services/<nome>.ts           # orquestração/fachada de casos de uso
│       ├── infrastructure/       # adapters do contexto
│       └── presentation/         # superfície (fina)
│           ├── controllers/      # BE: <nome>.controller.ts (transporte; quando existir)
│           ├── views/            # FE: <Nome>View.tsx (telas)
│           ├── components/       # FE: subcomponentes/átomos locais
│           ├── providers/        # FE: <Nome>Provider.tsx (Context LOCAL ao contexto)
│           │                     #     seam usado por 2+ contextos → shared/providers/
│           ├── hooks/            # FE: useXxx.ts
│           └── stories/          # FE: <Nome>.stories.tsx
├── shared/                       # reutilizável, SEM regra de negócio
│   ├── providers/                # FE: seams de DI (Context) usados por 2+ contextos
│   ├── ui/                       # design system (átomos)
│   │   ├── components/           #   Button, Badge, Spinner, …
│   │   └── stories/              #   <Atom>.stories.tsx
│   └── testing/                  # helpers/setup de teste compartilhados
└── platform/                     # adapters técnicos compartilhados por 2+ contextos
    ├── persistence/              # conexão + migrações (SQLite)
    ├── fs/                       # filesystem
    ├── events/                   # event bus
    └── desktop/ · cloud/         # futuro (Tauri/IPC, nuvem)
```

Contextos reais hoje:

| Runtime | Contextos |
| --- | --- |
| Backend | `library`, `media`, `courses`, `documents`, `progress`, `indexing`, `search`, `jobs`, `settings` |
| Frontend | `library`, `home`, `courses`, `player`, `documents`, `search`, `settings` |

Um contexto do frontend pode **compor** contextos do backend para fins de tela
(ex.: `player` consome `progress` + `media`); a composição acontece em
`application/` ou no adapter, nunca nos componentes.

### 4.1 A mesma árvore, preenchida — backend (`midoteca/`)

A árvore do §4 é genérica; esta é a **materialização no backend**, com os
arquivos que existem hoje e os que a migração cria
([`REFACTORING_ROADMAP.md`](REFACTORING_ROADMAP.md), P8/P10). Referência para
onde cada arquivo novo vai:

```text
midoteca/src/
├── app/composition-root.ts                # composition root (`createMidoteca`)
│
├── core/                                  # KERNEL (sem Nest/TypeORM/SQLite/Express)
│   ├── domain/                            # media-type.ts · lesson-media-role.ts
│   ├── contracts/                         # (decisão P10) FileScanner · SourceProbe · ManifestLoader
│   ├── errors.ts · ids.ts · clock.ts · validation.ts
│   └── json.ts · json-codec.ts · title-source.ts · sort-source.ts · app-paths.ts
│
├── modules/
│   ├── library/
│   │   ├── domain/                        # entities.ts · repositories.ts · read-models.ts
│   │   ├── application/
│   │   │   ├── dependencies.ts
│   │   │   ├── queries/                   # list-courses · list-documents · search · get-source-index-state
│   │   │   ├── use-cases/                 # add-source · remove-source ·
│   │   │   │                              #   update-source-path · check-source-availability
│   │   │   └── services/library-source-service.ts
│   │   └── infrastructure/                # library.repository.sqlite.ts ·
│   │                                      #   library.query.sqlite.ts
│   │
│   ├── indexing/
│   │   ├── domain/
│   │   │   ├── repositories.ts            # IndexingStore + comandos (Upsert*/Media*/Link*)
│   │   │   ├── contracts.ts               # SourceProbe · ManifestLoader · FileScanner · ScanOptions
│   │   │   ├── types.ts                   # DiscoveredFile · MediaKind · INDEXING_JOB_TYPES
│   │   │   ├── events.ts · manifest.ts
│   │   │   └── organization/              # regra pura (hoje organization.ts, 329 linhas)
│   │   ├── application/
│   │   │   ├── dependencies.ts
│   │   │   ├── use-cases/                 # run-scan · reconcile-batch ·
│   │   │   │                              #   apply-organization · apply-tracks
│   │   │   └── services/                  # indexer.ts · resource-governor.ts
│   │   └── infrastructure/                # indexing.store.sqlite.ts ·
│   │                                      #   indexing.titles.sqlite.ts
│   │
│   ├── courses/
│   │   ├── domain/                        # entities.ts · repositories.ts · organization/
│   │   ├── application/
│   │   │   ├── dependencies.ts
│   │   │   ├── queries/get-course-tree.ts
│   │   │   ├── use-cases/                 # create/delete/rename/reorder/move/save-organization
│   │   │   └── services/course-organization-service.ts
│   │   └── infrastructure/                # course.repository.sqlite.ts ·
│   │                                      #   course.organization.sqlite.ts
│   │
│   ├── documents/
│   │   ├── domain/                        # entities.ts · repositories.ts
│   │   ├── application/
│   │   │   ├── dependencies.ts
│   │   │   ├── queries/                   # list-documents.ts · …
│   │   │   ├── use-cases/                 # attach · detach · detach-all
│   │   │   └── services/document-association-service.ts
│   │   └── infrastructure/document.repository.sqlite.ts
│   │
│   ├── media/      domain/{entities,repositories}.ts · infrastructure/media.repository.sqlite.ts
│   ├── progress/   domain/{entities,repositories}.ts · infrastructure/progress.repository.sqlite.ts
│   ├── jobs/       domain/{entities,repositories,types}.ts · infrastructure/job.repository.sqlite.ts
│   ├── settings/   domain/{entities,repositories}.ts · infrastructure/settings.repository.sqlite.ts
│   └── search/     domain/contracts.ts     # SearchRepository (reservado, Fase 2)
│
└── platform/                              # adapters de 2+ contextos
    ├── persistence/sqlite/                # database.ts · migrator.ts · migrations/ · errors.ts
    ├── fs/                                # recursive-scanner · source-probe · manifest-loader
    └── events/typed-event-bus.ts
```

O que essa árvore materializa (P8/P10):

1. **Nomenclatura canônica.** `domain/ports.ts` (repositório) e
   `domain/inputs.ts` (comandos `CreateX`/`UpdateX`) viram **um** `domain/repositories.ts`;
   contratos não-repositório vão para `domain/contracts.ts`. `application/dto.ts`
   some (I/O colocalizado no caso de uso); `application/queries.ts` vira
   `application/queries/<op>.ts`; read models e o contrato de leitura
   (`LibraryQueryStore`) permanecem no `domain/` (`read-models.ts` +
   `repositories.ts`).
2. **Arquivos grandes.** Adapters acima do indicador
   (`course.repository.sqlite.ts` 668, `indexing.store.sqlite.ts` 447,
   `media.repository.sqlite.ts` 304) e `indexing/domain/organization.ts` 329
   dividem por agregado/responsabilidade, **sem** mudar contratos nem consumidores.

### 4.2 A mesma árvore, preenchida — frontend (`client/`)

A árvore acima é genérica; esta é a **materialização no frontend**, com os
arquivos reais que existem hoje e os que a migração cria
([`REFACTORING_ROADMAP.md`](REFACTORING_ROADMAP.md)). É a referência para saber
onde cada arquivo novo vai:

```text
client/src/
├── app/                                   # COMPOSITION ROOT + shell
│   ├── main.tsx                           # único ponto que injeta o adapter concreto
│   ├── App.tsx                            # shell fino (só escolhe a view ativa)
│   └── shell/                             # useAppNavigation.ts · usePlaybackSession.ts
│
├── core/                                  # KERNEL (sem React/Axios/Tauri/localStorage)
│   ├── domain/                            # library-item.ts (vocabulário compartilhado)
│   ├── contracts/                         # contratos de fronteira do runtime, um por papel:
│   │                                      #   library-catalog.ts · playback-state.ts ·
│   │                                      #   reading-state.ts · page-provider.ts ·
│   │                                      #   maintenance.ts · search.ts
│   └── config/app.config.ts
│
├── modules/
│   ├── library/                           # contexto de referência (fatia vertical completa)
│   │   ├── domain/                        # entities.ts · types.ts · read-models.ts
│   │   ├── application/
│   │   │   ├── dependencies.ts
│   │   │   ├── queries/                   # list-library-items.ts
│   │   │   └── use-cases/                 # save-course.ts · toggle-lesson-completion.ts
│   │   ├── infrastructure/
│   │   │   ├── mock/                      # catalog-store · playback-store · reading-store ·
│   │   │   │                              #   page-provider · search-index · mock-library-service
│   │   │   ├── storage/local-storage.ts
│   │   │   └── seed/library-seed.ts
│   │   └── presentation/
│   │       ├── views/LibraryView.tsx
│   │       ├── components/                # LibraryCard.tsx · LibraryEmptyState.tsx
│   │       └── stories/LibraryView.stories.tsx
│   │
│   ├── courses/
│   │   ├── domain/                        # course-editing.ts · course-metrics.ts
│   │   ├── application/{dependencies.ts, use-cases/save-course.ts}
│   │   └── presentation/
│   │       ├── views/                     # CourseDetailsView.tsx · CourseEditorView.tsx
│   │       ├── components/                # CourseHeader · ModuleAccordion · LessonRow ·
│   │       │                              #   DraggableModule · EditableLessonRow ·
│   │       │                              #   CourseTitleEditor · EditorActions
│   │       ├── hooks/useCourseEditor.ts
│   │       └── stories/*.stories.tsx
│   │
│   ├── player/
│   │   ├── domain/                        # progress.ts · playlist.ts
│   │   ├── application/
│   │   │   ├── dependencies.ts
│   │   │   └── use-cases/                 # save-playback-position.ts · complete-lesson.ts
│   │   └── presentation/
│   │       ├── views/                     # VideoPlayerView · MoviePlayerView · MiniPlayer
│   │       ├── components/                # PlayerSurface · MoviePlayerSurface · PlayerTimeline ·
│   │       │                              #   PlaybackControls · SpeedMenu · SubtitleMenu ·
│   │       │                              #   Player{Ended,Loading,Unavailable}State
│   │       ├── hooks/                     # useVideoPlayer · useMediaElementPlayback ·
│   │       │                              #   useAutoHideControls
│   │       └── stories/*.stories.tsx
│   │
│   ├── documents/
│   │   ├── domain/pdf-reading.ts
│   │   ├── application/{dependencies.ts, use-cases/}   # load-page-range · persist-reading-state
│   │   └── presentation/
│   │       ├── views/PdfViewer.tsx
│   │       ├── components/                # PdfToolbar · PdfPageViewport · PdfTextPage ·
│   │       │                              #   PdfUnavailableState
│   │       ├── hooks/usePdfReader.ts
│   │       └── stories/*.stories.tsx
│   │
│   ├── search/
│   │   ├── application/{dependencies.ts, use-cases/}   # group-search-results · resolve-search-target
│   │   └── presentation/
│   │       ├── views/SearchView.tsx
│   │       ├── components/                # SearchInput · SearchFilterTabs · SearchResults ·
│   │       │                              #   SearchResultCard · search-kinds
│   │       ├── hooks/useUniversalSearch.ts
│   │       └── stories/*.stories.tsx
│   │
│   ├── home/presentation/
│   │   ├── views/                         # HomeView.tsx · Sidebar.tsx
│   │   ├── components/                    # (extraídos de HomeView)
│   │   └── stories/*.stories.tsx
│   │
│   └── settings/presentation/views/SettingsView.tsx
│
├── shared/                                # reutilizável, SEM regra de negócio
│   ├── providers/library-repository.tsx   # seam de DI: Context + hooks de consumo
│   ├── ui/
│   │   ├── components/                    # Badge · Button · IconButton · ProgressBar ·
│   │   │                                  #   SearchField · SectionHeader · Spinner · Tooltip
│   │   └── stories/*.stories.tsx
│   └── testing/setup.ts
│
└── react-app-env.d.ts
```

Dois pontos que essa árvore materializa e valem para os dois runtimes:

1. **Nenhum contexto importa a `presentation/` de outro.** O que era acoplamento
   por `library/presentation/LibraryProvider` passa a ser `shared/providers/`
   (o seam) + `core/contracts/` (o contrato), com o adapter injetado em `app/`.
2. **Contrato por papel (ISP).** Em vez de um `LibraryRepository` que estende
   tudo, cada operação declara só o contrato de que precisa
   (`library-catalog`, `playback-state`, `reading-state`, `page-provider`,
   `maintenance`, `search`).

## 5. Regras de dependência (executáveis)

Matriz permitida (✅ = pode importar):

| De ↓ / Para → | `core/` | `shared/` | `platform/` | `modules/*/domain` | `modules/*/application` | `modules/*/infrastructure` | `modules/*/presentation` | `app/` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `core/` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `shared/` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `platform/` | ✅ | ❌ | ✅ | ✅ (só contratos) | ❌ | ❌ | ❌ | ❌ |
| `modules/*/domain` | ✅ | ❌ | ❌ | ✅ (mesmo ctx) | ❌ | ❌ | ❌ | ❌ |
| `modules/*/application` | ✅ | ❌ | ❌ | ✅ (mesmo ctx **e** `domain/` de outro ctx = contratos/tipos) | ✅ (mesmo ctx) | ❌ | ❌ | ❌ |
| `modules/*/infrastructure` | ✅ | ❌ | ✅ | ✅ (mesmo ctx) | ❌ | ✅ (mesmo ctx) | ❌ | ❌ |
| `modules/*/presentation` | ✅ | ✅ | ❌ | ✅ (só tipos) | ✅ (mesmo ctx) | ❌ | ✅ (mesmo ctx) | ❌ |
| `app/` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

Fences (o lint não pega sozinho — incluir no checklist de PR, §12):

```bash
# 1. domínio/aplicação não importam infraestrutura nem framework (só imports; comentários não contam)
grep -rnE "^\s*import .*(infrastructure|sqlite|better-sqlite3|react|@nestjs|typeorm|express)" src/core src/modules/*/domain src/modules/*/application
# 2. contexto não importa a presentation de outro contexto
grep -rn "modules/.*/presentation" src/modules/*/domain src/modules/*/application src/modules/*/infrastructure
# 3. só o composition root conhece adapters concretos
grep -rnE "Sqlite|Ipc|Http|Mock" src/modules/*/application src/modules/*/domain src/core
# 4. cruzamento entre contextos passa SÓ por domain/ (nunca application/ ou infrastructure/ de outro ctx)
grep -rnE "modules/[a-z]+/(application|infrastructure)" src/modules/*/domain src/modules/*/application
# 5. presentation não importa infrastructure, nem a presentation de OUTRO contexto (FE)
#    (a presentation do próprio contexto é permitida; filtrar manualmente)
grep -rnE "@/modules/[a-z]+/(infrastructure|presentation)" src/modules/*/presentation
# 6. DI entre contextos passa por shared/providers, não por um módulo (FE)
grep -rn "@/modules/[a-z]+/presentation/providers" src/app src/modules/*/presentation
```

**Proibido em `domain/` e `application/` dos dois lados:**

| Runtime | Proibido |
| --- | --- |
| `midoteca/src/{core,modules/**/domain,modules/**/application}` | NestJS, TypeORM, SQLite/`better-sqlite3`, Express, Tauri, Axios, FFmpeg, React |
| `client/src/{core,modules/**/domain,modules/**/application}` | `react`, `react-dom`, `axios`, `@tauri-apps/*`, `localStorage`, `fetch` |

- Inversão de dependência: quem precisa de sistema externo depende de um
  **contrato** definido na camada interna; o adapter concreto fica na
  infraestrutura.
- Nada depende de `app/`; `app/` depende de tudo.
- No frontend, a `presentation/` de um contexto depende do **próprio**
  `application/`/`domain/` + `core/contracts/` + `shared/ui/` +
  `shared/providers/` (DI). Ela **não** importa a `presentation/` de outro
  contexto nem `infrastructure/`.
- Nenhuma escrita em arquivo físico fora de adapters de `platform/fs`
  (regra de ouro: catálogo nunca apaga arquivo — ver §8).

## 6. Onde vive um adapter

| Situação | Onde fica |
| --- | --- |
| Implementa um contrato de **um único** contexto | `modules/<contexto>/infrastructure/` |
| Implementa um contrato consumido por **2+** contextos (conexão, migrações, scanner, bus) | `platform/<tecnologia>/` |
| Fala com tecnologia externa específica do runtime (IPC/Tauri, HTTP, nuvem) | `platform/desktop/`, `platform/cloud/` |
| É um dublê para teste/Storybook | `shared/testing/` ou o próprio `infrastructure/` do contexto (quando é um adapter de verdade em memória) |

Essa regra existe para evitar os dois extremos: adapter de contexto único virar
"platform" genérico (perde coesão) e infraestrutura compartilhada duplicada em
cada contexto.

## 7. Contratos & Adapters — o mesmo fluxo nos dois lados

```text
contrato (domain/repositories.ts)   adapter (infrastructure)          composição (app)
────────────────────────────────    ───────────────────────          ────────────────
LibraryRepository  ◄──implements──  SqliteLibraryRepository          createMidoteca()
LibraryRepository  ◄──implements──  MockLibraryService                <LibraryProvider repository={…}>
LibraryRepository  ◄──implements──  IpcLibraryRepository             (futuro)
```

Consequências obrigatórias:

1. **Todo** acesso a sistema externo (banco, fs, rede, IPC, tempo, aleatoriedade)
   entra por um contrato.
2. Trocar de tecnologia = escrever um adapter novo, **sem** tocar em domínio,
   casos de uso, controllers ou componentes.
3. Todo contrato tem **teste de contrato** que qualquer adapter precisa
   satisfazer (ver [`TESTING_STRATEGY.md`](TESTING_STRATEGY.md) §6).
4. Contratos são **pequenos e segregados** (ISP): prefira vários contratos coesos
   a um "repository" agregado. O agregado é conveniência de composição, não o
   contrato de um adapter específico.

## 8. DDD — o que é obrigatório

**Bounded contexts.** Cada contexto é coeso, tem seu modelo e evolui sozinho.
Não compartilhe entidades entre contextos por conveniência: use **ids** e
contratos. Modelo compartilhado de verdade vai para `core/domain/`.

**Linguagem ubíqua.** Os nomes do código são os nomes do domínio
(`LibrarySource`, `LessonMedia`, `playback_progress`), em inglês; textos de UI em
pt-BR (ver [`CONVENTIONS.md`](CONVENTIONS.md)).

**Regras de modelagem inegociáveis.**

1. Identidade é **UUID** — nunca caminho de arquivo.
2. **Arquivo físico ≠ conteúdo lógico** (`media_files` × `courses`/`lessons`/`documents`).
3. Excluir do catálogo **nunca** apaga arquivo físico.
4. Arquivo ausente → `availability = 'missing'`, sem deleção de registro.
5. Precedência de título **manual > manifest > detected**.
6. Progresso é ancorado em **aula/documento**, nunca em arquivo.

**Padrões táticos** (detalhes e exemplos em
[`DDD_GUIDELINES.md`](DDD_GUIDELINES.md)): entidades × value objects, agregados
com raiz única, domain services para regra que não pertence a uma entidade,
casos de uso explícitos com input/output próprios, eventos de domínio emitidos
**após** o commit, e camada anticorrupção (ACL) para traduzir modelos externos
(views de tela, legado).

**Vocabulário compartilhado.** Tipo usado por 2+ contextos é promovido ao
kernel (`core/domain/`), nunca importado do `domain/` de outro contexto. Já
aplicado a `MediaType` (`media` + `indexing`) e `LessonMediaRole` (`courses` +
`indexing`). Por isso o cruzamento permitido no §5 é **`application/ → domain/`
de outro contexto** (contratos, ISO do §8 “use ids e contratos”): hoje só há duas
arestas no backend — `library/application → indexing/domain` (contratos
`EventBus` e `SourceProbe`) e `indexing/application → library/domain/repositories`
(`LibraryRepository`). Nenhum adapter concreto cruza contexto.

## 9. SOLID aplicado

| Princípio | Como se aplica aqui | Exemplo real |
| --- | --- | --- |
| **S**RP | Uma razão para mudar por arquivo/camada; controller e componente são finos | `video.service.ts` do legado (458 linhas: CRUD + streaming + transcodificação + scan) foi substituído por contextos separados no núcleo |
| **O**CP | Novo comportamento = novo adapter/caso de uso, não `if` em código existente | trocar `MockLibraryService` por `IpcLibraryRepository` sem alterar consumidores; novo storage = novo adapter D1/S3 |
| **L**SP | Todo adapter satisfaz o contrato do mesmo jeito | teste de contrato roda contra **cada** adapter |
| **I**SP | Contratos pequenos e coesos | subdividir contratos amplos (`LibraryCatalog`/`PlaybackState`/`ReadingState`/`PageProvider`/`Search`) |
| **D**IP | Domínio e aplicação dependem de abstrações; só `app/` conhece concreto | `createMidoteca()` e `<LibraryProvider repository={…}>` |

## 10. Quando cada camada existe

**Não crie camada, pasta, interface ou classe vazia para "seguir o padrão"**
(`AGENTS.md` §2). Critério prático:

| Camada | Crie quando… | Não crie quando… |
| --- | --- | --- |
| `domain/` | há regra/entidade/VO com invariante própria | o contexto só repassa dados |
| `application/` | há um caso de uso com passos ou regra de aplicação (autorização, transação, orquestração) | é CRUD de uma linha ou leitura direta |
| `infrastructure/` | há IO (banco, fs, rede, IPC) | a operação é pura |
| `presentation/` | sempre (é a superfície do runtime) | — |
| `platform/` | o adapter serve 2+ contextos | serve um único contexto |

## 11. Limites de tamanho (indicadores de revisão)

Não são leis; são gatilhos para revisar responsabilidades:

| Unidade | Alvo |
| --- | --- |
| Componente React | ~150 linhas |
| Hook | ~120 linhas |
| Controller / rota | ~100 linhas |
| Caso de uso | ~150 linhas |
| Serviço de aplicação | ~200 linhas |
| Adapter de repositório | ~250 linhas (se passar, avaliar dividir por agregado/consulta) |

## 12. Estado atual × alvo (migração incremental)

O alvo acima é o destino; o código migra **quando tocado ou quando o risco
justificar**, nunca por reescrita total. Mapa por runtime:

### 12.1 Backend (`midoteca/`) — ✅ migrado (P5); nomenclatura canônica pendente (P8)

P5 executado sem mudança de comportamento: **72 arquivos movidos**; a suíte
(hoje **19 specs / 116 testes**) segue verde, `typecheck`/`lint`/`format:check`/`build`
em 0 e API pública preservada.

| Era | É agora | Observação |
| --- | --- | --- |
| `src/index.ts` (composition root + API) | `src/app/composition-root.ts` + `src/index.ts` (só API pública) | API pública estável |
| `src/core/shared/*` (10 arquivos de kernel) | `src/core/*` | + `core/domain/` para vocabulário compartilhado |
| `src/core/<ctx>/{entities,inputs}.ts` | `src/modules/<ctx>/domain/` | |
| `src/core/<ctx>/{repository,ports}.ts` | `src/modules/<ctx>/domain/ports.ts` | contrato junto do domínio do contexto |
| `src/core/<ctx>/{service,queries,indexer}.ts` | `src/modules/<ctx>/application/` | `services/`, `queries.ts`, `resource-governor.ts` |
| `src/core/<ctx>/<regra pura>.ts` | `src/modules/<ctx>/domain/` | ex.: `indexing/domain/organization.ts`, `manifest.ts` |
| `src/infra/sqlite/repositories/<ctx>.*.sqlite.ts` | `src/modules/<ctx>/infrastructure/` | adapter de um contexto |
| `src/infra/sqlite/{database,migrator,migrations}` | `src/platform/persistence/sqlite/` | compartilhado por 2+ contextos |
| `src/infra/fs/*` | `src/platform/fs/` | `FsSourceProbe` serve `library` **e** `indexing` |
| `src/infra/events/*` | `src/platform/events/` | compartilhado |
| `test/*.spec.ts` | mantido | espelha a árvore de `src/` (19 specs) |

Decisões tomadas durante a migração (não estavam no mapa acima):

- `library/queries.ts` foi **dividido** e o **P8-library está concluído**:
  read models (`read-models.ts`) + contratos (`LibraryRepository` + comandos +
  `LibraryQueryStore`) ficam em `modules/library/domain/`; as **operações** de
  leitura passaram a `modules/library/application/queries/<op>.ts` e a fachada
  `LibraryQueryService` para `application/services/library-query-service.ts`. O
  adapter implementa o contrato do **domínio**, sem depender de `application/`
  (matriz §5 exige isso).
- `indexing/scanner.ts` foi **fundido** em `modules/indexing/domain/ports.ts`
  (um único `ports.ts` por contexto). **Alvo P8:** repositórios →
  `domain/repositories.ts`; scanner/probe/loader/bus → `domain/contracts.ts`.
- `MediaType` e `LessonMediaRole` foram promovidos a `core/domain/` por serem
  usados por 2+ contextos (removeu as últimas arestas `domain → domain`).
- o barrel de cada contexto passou a reexportar **também** seu adapter, para que
  `app/` importe `modules/<ctx>` em vez de arquivos internos.
- o barrel de `platform/persistence/sqlite` **deixou** de reexportar adapters de
  contexto (o `platform` não depende de `modules/*/infrastructure`).

Casos de uso extraídos em `modules/{library,indexing,courses,documents}/application/use-cases/`,
com os antigos `services/*` reduzidos a fachadas de orquestração.

Pendências verificadas (→ árvore-alvo do §4.1; prioridades em
[`REFACTORING_ROADMAP.md`](REFACTORING_ROADMAP.md)):

| Achado | Alvo | Prio |
| --- | --- | --- |
| **8** `domain/ports.ts` + **6** `domain/inputs.ts` (P8) | `domain/repositories.ts` (+ comandos) e `domain/contracts.ts` | **P8** |
| `application/dto.ts` (4 contextos); `application/queries.ts` (2); `domain/queries.ts`/`inputs.ts`/`ports.ts` | I/O colocalizado; `application/queries/<op>.ts`; read models + contrato de leitura no `domain/` (`read-models.ts` + `repositories.ts`) | **P8** (library ✅) |
| `indexing/domain/contracts.ts` guarda `INDEXING_JOB_TYPES` (constantes) | `domain/types.ts` | **P8** |
| Adapters acima do indicador: `course.repository.sqlite.ts` **668** · `indexing.store.sqlite.ts` **447** · `media.repository.sqlite.ts` **304** | dividir por agregado/consulta | **P10** |
| `indexing/domain/organization.ts` **329** linhas | `domain/organization/` por responsabilidade | **P10** |
| `indexing/application/resource-governor.ts` na raiz de `application/` | `application/services/resource-governor.ts` | **P10** |
| `platform/fs/*` implementa contratos de `indexing/domain` mas serve 2 contextos | decidir `core/contracts/` (ADR) | **P10** |
| `search/domain/contracts.ts` (`SearchRepository`) sem adapter/consumidor | manter reservado (Fase 2) | — |
| `presentation/` (transporte) ausente nos 9 contextos | Fase 3 (destrava P3) | — |

### 12.2 Frontend (`client/`) — parcialmente migrado

**Alinhado ✅:** `features/` → `modules/`; kernel em `core/{domain,config}`;
`shared/ui/{components,stories}`; subdivisão de `presentation/` em
`views/`/`components/`/`hooks/`/`stories/` (piloto `player` + `shared/ui`);
casos de uso puros em `modules/{courses,search}/application/use-cases/`; regra
pura em `modules/{courses,documents,player}/domain/`; hooks de apresentação
fora de `application/`; `library/infrastructure/` em kebab-case.

**Pendente** (→ árvore-alvo do §4.1; prioridades em
[`REFACTORING_ROADMAP.md`](REFACTORING_ROADMAP.md)):

| Achado verificado | Alvo | Prio |
| --- | --- | --- |
| 5 contextos importam `library/presentation/LibraryProvider`; o provider importa `infrastructure/` | seam em `shared/providers/` + contrato em `core/contracts/`; adapter injetado só em `app/main.tsx` | **P9** |
| `core/ports/libraryRepository.ts` = contrato "god" (6 contratos somados); `ISearchService` em `core/domain` | um contrato por papel em `core/contracts/` | **P9** |
| `player`/`documents` sem `application/` (orquestração dentro dos hooks) | `application/use-cases/` + hooks finos | **P7/P4** |
| `library/infrastructure/mock-library-repository.ts` (737 linhas, 6 responsabilidades) | `infrastructure/mock/*` por contrato + `seed/` | **P2** |
| Views acima do indicador: `CourseDetailsView` 560 · `HomeView` 474 · `MoviePlayerView` 461 · `LibraryView` 455 · `MiniPlayer` 349 · `App.tsx` 336 | extrair `components/`; navegação/sessão → `app/shell/` | **P1/P6** |
| `core/domain/library.ts` concentra entidades de todos os contextos | entidades no `domain/` do contexto; `core/domain` só o compartilhado | **P4** |
| `core/ports/` → `core/contracts/`; títulos de story e local das stories inconsistentes | convenções do §3 e [`CODE_ORGANIZATION.md`](CODE_ORGANIZATION.md) §4.4 | **P6/P8** |
| `src/test/setup.ts` · `src/__tests__/*` | `shared/testing/setup.ts` · `test/**` espelhando a árvore | **P6** |
| `src/legacy/`, `src/stories/` | **remover** (código morto, fora do build) | **P0** |

Prioridades e passos em [`REFACTORING_ROADMAP.md`](REFACTORING_ROADMAP.md).

## 13. Composition roots

| Runtime | Ponto de entrada | Papel |
| --- | --- | --- |
| Backend | `midoteca/src/app/composition-root.ts` → `createMidoteca(options)` (reexportado por `src/index.ts`) | abre SQLite, aplica migrações, injeta adapters, publica a API |
| Frontend | `client/src/app/main.tsx` → `<LibraryProvider repository={…}>` (`shared/providers/library-repository.tsx`) | injeta o `LibraryRepository` (mock hoje, IPC depois); o Context/hook de consumo fica em `shared/providers/`, a injeção do concreto só aqui |

Regra: **nenhum outro arquivo monta dependências concretas.** Isso é o que
permite trocar a origem dos dados (mock → IPC/HTTP) sem alterar consumidores.

## 14. Fronteira entre os runtimes

```text
client/ (presentation + application)          midoteca/ (application + domain)
   useLibrary() ──► LibraryRepository ──► [adapter de platform/desktop | platform/http] ──► createMidoteca()
        (contrato no FE)                      (infra do FE)                                (casos de uso + domínio)
```

- O contrato do FE (`client/src/core/contracts/library-repository.ts`) é o
  **contrato de fronteira do runtime**; o núcleo fornece os casos de uso; o
  adapter que liga os dois é infraestrutura do frontend e ainda **não existe**
  (ver P3 do roadmap de refatoração).
- `client/src/core/domain/*` modela **view-models** (capa, tags, progresso %). O
  domínio canônico vive em `midoteca/src/modules/*/domain`. A tradução entre os
  dois é uma **camada anticorrupção** dentro do adapter — nunca dentro de um
  componente.
- Nenhum lado importa o framework do outro: `midoteca` não importa React;
  `client` não importa `better-sqlite3`.

## 15. Testes e documentação por camada

- Testes por camada e pirâmide: [`TESTING_STRATEGY.md`](TESTING_STRATEGY.md).
- Decisões arquiteturais relevantes viram **ADR** no runtime afetado:
  `midoteca/docs/adr/`, `client/docs/adr/`. ADR registra contexto, decisão,
  alternativas e consequências — mudança de decisão gera ADR novo, não edição do
  antigo.

## 16. Checklist de PR (arquitetura)

- [ ] Cada arquivo novo está na camada correta (§3) e no contexto certo (§2).
- [ ] Nomes seguem a tabela canônica do §3 (sem `dto.ts`, `inputs.ts`, `ports.ts`).
- [ ] `domain`/`application` não importam framework nem infraestrutura (§5).
- [ ] Novo acesso externo entrou por um contrato + adapter (§7).
- [ ] Contrato de fronteira do runtime em `core/contracts/`, **um por papel** (§9, ISP).
- [ ] Provider/Context: local ao contexto → `presentation/providers/`; consumido por 2+ contextos → `shared/providers/` (§3).
- [ ] `presentation/` não importa `infrastructure/` nem a `presentation/` de outro contexto (§5).
- [ ] Adapter alocado pela regra do §6 (contexto único × compartilhado).
- [ ] Nenhuma camada vazia foi criada "para seguir o padrão" (§10).
- [ ] Contratos permanecem pequenos; nenhum contrato inchou (§9, ISP).
- [ ] Regra de ouro respeitada (catálogo não toca arquivo físico) (§8).
- [ ] Testes de contrato continuam válidos para o novo adapter.
- [ ] Documentação derivada atualizada quando a regra mudou.
