# Arquitetura — Midoteca (visão unificada: backend + frontend)

> Diretriz permanente em [`../AGENTS.md`](../AGENTS.md). Este documento é o hub
> de arquitetura do projeto e vale para **os dois lados**: o núcleo/backend
> (`midoteca/`) e o desktop/frontend (`client/`).
>
> Ver também: [`ROADMAP.md`](ROADMAP.md) (plano mestre de produto) ·
> [`DDD_GUIDELINES.md`](DDD_GUIDELINES.md) ·
> [`CODE_ORGANIZATION.md`](CODE_ORGANIZATION.md) ·
> [`CONVENTIONS.md`](CONVENTIONS.md) ·
> [`TESTING_STRATEGY.md`](TESTING_STRATEGY.md) ·
> [`REFACTORING_ROADMAP.md`](REFACTORING_ROADMAP.md).

## 1. O que é o repositório

A Midoteca evolui a partir do myPlay. Hoje o repositório contém três áreas:

| Área | Papel | Situação |
| --- | --- | --- |
| `midoteca/` | Núcleo/backend local-first: domínio + persistência SQLite + indexação | **Ativo** (Fases 1–2) |
| `client/` | App desktop `midoteca-desktop` (React 19 + Vite) | **Ativo** (em migração) |
| `backend/` | Backend legado do myPlay (NestJS + TypeORM + PostgreSQL) | **Descartado** como base; referência conceitual |

Detalhes da auditoria do legado em
[`../midoteca/docs/MYPLAY_AUDIT.md`](../midoteca/docs/MYPLAY_AUDIT.md).

## 2. Uma arquitetura, dois runtimes

Ambos os lados seguem a **mesma** separação de camadas (Clean/Hexagonal):

```text
┌──────────────────────────────────────────────────────────────┐
│ Presentation    │ React components · IPC/HTTP controllers      │
├──────────────────────────────────────────────────────────────┤
│ Application     │ Casos de uso · serviços de aplicação         │
├──────────────────────────────────────────────────────────────┤
│ Domain          │ Entidades · regras · contratos (ports)       │
├──────────────────────────────────────────────────────────────┤
│ Infrastructure  │ SQLite · filesystem · cliente IPC/HTTP · mock │
└──────────────────────────────────────────────────────────────┘
```

Regra de dependência (os dois lados): **as setas apontam para dentro.**
Domínio e aplicação **não** conhecem Presentation nem Infrastructure. As
dependências externas são invertidas por **ports** (interfaces no domínio) e
**adapters** (implementações na infraestrutura).

## 3. Backend / núcleo (`midoteca/`)

```text
midoteca/src/
├── index.ts                 # composition root: createMidoteca()
├── core/                    # DOMÍNIO + APLICAÇÃO (sem infra)
│   ├── shared/              # kernel: ids, erros, validação, json, clock, títulos
│   ├── library/             # entidades, repository (port), service, queries
│   ├── media/  courses/  documents/  progress/  jobs/  settings/
│   ├── indexing/            # organization (puro), ports, indexer, events, governor
│   └── search/              # contrato de busca
└── infra/                   # INFRAESTRUTURA (adapta os ports)
    ├── sqlite/              # database, migrator, migrations, repositories/*
    ├── fs/                  # RecursiveFileScanner, FsSourceProbe, FsManifestLoader
    └── events/              # TypedEventBus
```

- **Composition root**: `createMidoteca(options)` abre a conexão SQLite, aplica
  migrações e injeta os adaptadores. Expõe `library`, `media`, `courses`,
  `documents`, `progress`, `jobs`, `settings`, `sources`, `indexer`, `queries`,
  `events`, `governor`.
- **Ports**: interfaces em `core/*/repository.ts`, `core/indexing/ports.ts` e
  `core/indexing/scanner.ts`. **Adapters**: `infra/sqlite/repositories/*`,
  `infra/fs/*`, `infra/events/*`.
- **Regra de ouro**: nenhuma operação de catálogo toca arquivos físicos.

Documentação detalhada: [`../midoteca/docs/ARCHITECTURE.md`](../midoteca/docs/ARCHITECTURE.md),
[`../midoteca/docs/DOMAIN_MODEL.md`](../midoteca/docs/DOMAIN_MODEL.md),
[`../midoteca/docs/DATABASE.md`](../midoteca/docs/DATABASE.md),
[`../midoteca/docs/LIBRARY_INDEXING.md`](../midoteca/docs/LIBRARY_INDEXING.md),
[`../midoteca/docs/FILE_IDENTITY.md`](../midoteca/docs/FILE_IDENTITY.md),
[`../midoteca/docs/adr/0002-indexing-strategy.md`](../midoteca/docs/adr/0002-indexing-strategy.md).

## 4. Frontend / desktop (`client/`)

O desktop é React 19 + Vite, organizado em **módulos por domínio** com a mesma
fronteira de repositório do backend. O contrato
(`client/src/core/ports/libraryRepository.ts`) desacopla a UI da origem dos dados:

```text
client/src/
├── app/                        # composition root: App.tsx + main.tsx (entry)
├── core/
│   ├── domain/library.ts       # DOMÍNIO (tipos): Course, Lesson, Document, ...
│   ├── ports/libraryRepository.ts  # PORTS: LibraryRepository (catálogo+playback+leitura+page+search)
│   └── config/app.config.ts
├── features/<domínio>/         # library, home, courses, player, documents, search, settings
│   ├── domain/                 # entidades/regras puras do domínio (quando houver)
│   ├── application/            # hooks de caso de uso (usePdfReader, useVideoPlayer, ...)
│   ├── infrastructure/         # adapters (mockLibraryRepository, libraryStorage)
│   └── presentation/           # views, subcomponentes e stories
├── shared/ui/                  # design system reaproveitável (Button, Badge, ...)
├── test/setup.ts               # setup do Vitest
├── __tests__/                  # testes de componente/contrato
└── legacy/                     # código myPlay/CRA desativado (fora do build)
```

Domínios do frontend: `library` (catálogo/estado/persistência), `home`, `courses`
(detalhes + editor), `player` (vídeo, mini player, filme), `documents` (PDF),
`search` e `settings`.

Estado atual x alvo:

| Aspecto | Atual | Alvo incremental |
| --- | --- | --- |
| Origem de dados | `mockLibraryRepository` (memória + `localStorage`) | adapter IPC/HTTP sobre o núcleo `midoteca` |
| Injeção | `LibraryProvider` + `useLibrary` | idem (já é o ponto de injeção) |
| Regras de negócio | hooks de caso de uso por feature | `domain/` + casos de uso dedicados quando crescer |
| Componentes | coesos (~150 linhas) | manter; novas features já nascem pequenas |

Regras do frontend (ver [`DDD_GUIDELINES.md`](DDD_GUIDELINES.md)):

- Componentes visuais **não** fazem HTTP/IPC nem acessam `mockData` diretamente:
  usam `useLibraryRepository()` / `useLibrary()`.
- Um adapter novo (IPC/HTTP) implementa `LibraryRepository` **sem** alterar os
  consumidores. É exatamente o mesmo padrão Ports & Adapters do backend.
- Casos de uso e regras puras ficam fora dos hooks de apresentação.

Documentação detalhada do frontend:
[`../client/docs/ARCHITECTURE.md`](../client/docs/ARCHITECTURE.md),
[`../client/docs/DOMAIN_MODEL.md`](../client/docs/DOMAIN_MODEL.md),
[`../client/docs/adr/0001-repository-boundary.md`](../client/docs/adr/0001-repository-boundary.md).

## 5. Fronteira entre frontend e backend

```text
client/ (Presentation)                midoteca/ (Application + Domain)
   useLibrary() ──► LibraryRepository ──► [adapter IPC/HTTP] ──► createMidoteca()
        (ports no FE)                        (infra do FE)         (casos de uso + domínio)
```

- O **contrato do FE** (`client/src/core/ports/libraryRepository.ts`) é o port; o núcleo
  `midoteca` fornece os casos de uso. O adapter que liga os dois (Tauri IPC /
  HTTP local / worker) é infraestrutura do frontend e ainda não existe.
- `core/domain/library.ts` modela **view-models** (cover, tags, progresso). O domínio
  canônico vive em `midoteca/src/core`; campos de apresentação derivam dele.
- Nenhum dos lados importa o framework do outro: `midoteca` não importa React;
  `client` não importa `better-sqlite3`.

## 6. Regras de dependência (resumo executável)

Proibido importar no **domínio/aplicação** de cada lado:

- `midoteca/src/core/**` ❌ NestJS · React · TypeORM · SQLite · Express · Tauri · Axios · FFmpeg
- `client/src/{domain,application}/**` ❌ `react` · `react-dom` · `axios` · `@tauri-apps/*`

Permitido:

- `infra/**` implementa ports e pode usar bibliotecas concretas.
- `presentation` (controllers/componentes) é **fino**: delega a casos de uso.

## 7. Composition roots

| Lado | Ponto de entrada | Papel |
| --- | --- | --- |
| Backend | `createMidoteca()` (`midoteca/src/index.ts`) | abre SQLite, migra, injeta adapters |
| Frontend | `<LibraryProvider repository=…>` (`client/src/features/library/presentation/LibraryProvider.tsx`) | injeta o `LibraryRepository` (mock hoje, IPC amanhã) |

## 8. Status e próximos passos

- **Backend**: Fases 1–2 concluídas e testadas (92 testes). Ver
  [`../midoteca/docs/ARCHITECTURE.md`](../midoteca/docs/ARCHITECTURE.md) §9.
- **Frontend**: fronteira de repositório criada; próximo passo é **migrar as
  telas grandes** para componentes coesos + casos de uso e trocar o mock por um
  adapter IPC. Ver [`REFACTORING_ROADMAP.md`](REFACTORING_ROADMAP.md).
- **Legado `backend/`**: descartado como base; não migrar.
- **Plano de produto (14 fases / 4 versões)**: [`ROADMAP.md`](ROADMAP.md).
