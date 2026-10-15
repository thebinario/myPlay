# Diretrizes DDD & Hexagonal — Midoteca

> Vale para **backend (`midoteca/`)** e **frontend (`client/`)**. Complementa
> [`ARCHITECTURE.md`](ARCHITECTURE.md) e a diretriz em [`../AGENTS.md`](../AGENTS.md).

## 1. Bounded contexts

Cada contexto é coeso e evolui de forma independente. Não compartilhe modelos
entre contextos por conveniência; use IDs e contratos.

### Backend / núcleo (`midoteca/src/core`)

| Contexto | Responsabilidade | Port principal |
| --- | --- | --- |
| `library` | Fontes de armazenamento, disponibilidade, consultas | `LibraryRepository` |
| `media` | Arquivos físicos + trilhas | `MediaRepository` |
| `courses` | Curso → módulo → aula, vínculo aula↔arquivo | `CourseRepository` |
| `documents` | PDF lógico + vínculos | `DocumentRepository` |
| `progress` | Progresso de reprodução/leitura | `ProgressRepository` |
| `indexing` | Descoberta, organização, reconciliação incremental | `IndexingStore`, `FileScanner`, `SourceProbe`, `ManifestLoader` |
| `search` | Contrato de busca | `SearchPort` (fronteira) |
| `jobs` | Fila de trabalho persistida | `JobRepository` |
| `settings` | Preferências chave/valor | `SettingsRepository` |

### Frontend (`client/src`)

| Contexto | Responsabilidade |
| --- | --- |
| Library | Catálogo (cursos, filmes, documentos) e navegação |
| Courses | Detalhes/edição de curso e progresso |
| Player | Reprodução de aula/filme (tela cheia + mini player) |
| Documents | Leitura de PDF (página, rolagem, zoom, tema) |
| Search | Pesquisa universal |
| Settings | Preferências (placeholder) |

O contrato agregado do FE é `LibraryRepository`
(`client/src/core/ports/libraryRepository.ts`), composto por ports menores
(`LibraryCatalogRepository`, `PlaybackStateRepository`, `ReadingStateRepository`,
`PageProvider`, `ISearchService`).

## 2. Camadas por contexto

Cada contexto possui, **quando necessário**:

| Camada | Backend | Frontend |
| --- | --- | --- |
| Domain | `core/<ctx>/entities.ts` + regras puras | `core/domain/*.ts` + `features/<ctx>/domain/*` |
| Application | `core/<ctx>/service.ts`, `queries.ts`, `indexer.ts` | `features/<ctx>/application/*` (casos de uso/hooks) |
| Infrastructure | `infra/sqlite/repositories/*`, `infra/fs/*`, `infra/events/*` | `features/<ctx>/infrastructure/*` (mock/`localStorage` hoje; IPC/HTTP depois) |
| Presentation | (futuro) controllers IPC/HTTP finos | `features/<ctx>/presentation/*`, `shared/ui/*` |

> **Não crie camadas, interfaces ou classes vazias só para seguir o padrão.**
> Só extraia quando houver responsabilidade real.

## 3. Regra de dependência

Fluxo permitido: `Presentation → Application → Domain ← Infrastructure`.

Proibido importar no domínio/aplicação:

| Lado | Proibido |
| --- | --- |
| `midoteca/src/core/**` | NestJS, React, TypeORM, SQLite/better-sqlite3, Express, Tauri, Axios, FFmpeg |
| `client/src/{domain,application}/**` | `react`, `react-dom`, `axios`, `@tauri-apps/*` |

Consequências práticas:

- Casos de uso dependem de **abstrações** (`ports`) para sistemas externos.
- Adaptadores concretos (`Sqlite*Repository`, `Fs*`, `MockLibraryService`,
  futuro `Ipc*`) implementam essas abstrações.
- Controllers e componentes React são **finos** e delegam a casos de uso.
- **Nada de regra de negócio em hook de apresentação.**

## 4. Ports & Adapters na prática

### Backend

```ts
// port (domínio)
export interface LibraryRepository { addSource(...): Promise<LibrarySource>; /* ... */ }

// adapter (infra) — implementa o port, usa SQLite
export class SqliteLibraryRepository implements LibraryRepository { /* ... */ }

// composition root injeta o adapter
createMidoteca() → { sources: new LibrarySourceService({ library, probe, events }) }
```

### Frontend

```ts
// port (FE)
export interface LibraryRepository extends LibraryCatalogRepository, /* ... */ {}

// adapter atual (infra do FE)
export class MockLibraryService implements LibraryRepository { /* memória */ }

// adapter futuro (infra do FE) — MESMO port, sem tocar nos consumidores
export class IpcLibraryRepository implements LibraryRepository { /* chama o núcleo */ }

// injeção (composition root do FE)
<LibraryProvider repository={new IpcLibraryRepository(...)} />
```

## 5. Entrada, saída e erros (backend)

- **Entradas** (`core/*/inputs.ts`): comandos com `id?` opcional (ids
  determinísticos em testes) e campos opcionais quando fizer sentido.
- **Saídas**: entidades de domínio (`core/*/entities.ts`), **sem** tipos do driver.
- **Validação**: na borda do adapter (`core/shared/validation.ts`), lançando
  `ValidationError` antes de tocar o banco.
- **Erros**: hierarquia `MidotecaError` → `NotFoundError`, `ValidationError`,
  `ConflictError`, `PersistenceError`. O driver SQLite é mapeado por
  `infra/sqlite/errors.ts`; **nunca** vaze códigos do driver para o domínio.

## 6. Regras de modelagem inegociáveis

1. **Identidade é UUID**, nunca caminho de arquivo.
2. **Arquivo físico ≠ conteúdo lógico** (ver
   [`../midoteca/docs/FILE_IDENTITY.md`](../midoteca/docs/FILE_IDENTITY.md)).
3. **Excluir catálogo nunca apaga arquivo físico.**
4. Ausência de arquivo → `availability = 'missing'`, sem deleção.
5. Títulos seguem precedência **manual > manifest > detected**.
6. Cascatas de FK afetam **apenas** linhas de catálogo.

## 7. Estrutura-alvo (exemplos)

### Backend — contexto novo

```text
core/streaming/
├── entities.ts        # tipos puros
├── inputs.ts          # comandos
├── ports.ts           # interfaces (ex.: StreamPort)
├── service.ts         # casos de uso
└── index.ts
infra/streaming/       # adapters concretos (ex.: FsStreamAdapter)
```

### Frontend — feature migrada

```text
features/player/
├── components/        # visual (PlayerControls, PlayerSurface, ...)
├── hooks/             # apresentação (usePlayerUiState)
├── application/       # casos de uso (openLesson, persistPosition)
├── domain/            # regras puras (progresso, next/prev)
└── adapters/          # uso do LibraryRepository (via context)
```

## 8. Anti-padrões (evidência no legado)

| Anti-padrão | Onde apareceu | Correção |
| --- | --- | --- |
| Service com muitas responsabilidades | `backend/src/video/video.service.ts` (458 linhas) | quebrar em media/progress/streaming/jobs |
| Entidade lógica acoplada a caminho físico | `video.entity.ts` (`filePath`) | `MediaFile` + UUID + caminho relativo |
| Exclusão remove arquivo físico | `video.service.ts` `remove()` (`unlink`) | catálogo apenas |
| Progresso dentro da entidade de conteúdo | `Video.lastPosition` | `playback_progress` por aula |
| Duas entidades para o mesmo conceito | `video/` e `modules/video/` | uma entidade canônica; remover código morto |
| Componente gigante com lógica | `client/.../VideoPlayer.tsx` (996 linhas) | extrair hooks/casos de uso/componentes |

## 9. Checklist de revisão (PR)

- [ ] Domínio não importa framework/infra (checar imports).
- [ ] Novo comportamento externo atrás de um port + adapter.
- [ ] Componentes/controllers finos; regra em application/domain.
- [ ] Sem dependência circular (`core/` não importa `infra/`).
- [ ] Erros mapeados para o domínio (sem vazamento do driver).
- [ ] Regra de ouro respeitada (nada de escrita em arquivos físicos).
- [ ] Testes cobrindo o comportamento (ver [`TESTING_STRATEGY.md`](TESTING_STRATEGY.md)).
