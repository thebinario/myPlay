# Arquitetura — Midoteca (Fases 1–2)

> Organização de pastas e nomes de arquivo: [`../../docs/CODE_ORGANIZATION.md`](../../docs/CODE_ORGANIZATION.md).
> Visão unificada (backend + frontend): [`../../docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md).

## 1. Visão geral

A Midoteca é um aplicativo desktop **local-first**. Todo o estado de catálogo
vive em um banco **SQLite local**, no diretório de dados do usuário — nunca no HD
externo sendo catalogado. A reprodução e a navegação devem funcionar sem IA, sem
internet e sem indexação; portanto, a Fase 1 entrega apenas a fundação de
domínio + persistência, com o mínimo de dependências.

A Fase 1 implementa um **núcleo TypeScript desacoplado de transporte**. Não há
HTTP, IPC, NestJS nem Tauri aqui. O núcleo expõe um _composition root_
(`createMidoteca`) que abre uma única conexão SQLite e injeta os repositórios de
domínio.

## 2. Camadas

```text
┌───────────────────────────────────────────────┐
│ Transporte (Fase 2+)                           │  HTTP / IPC / Tauri commands
│   NestJS controller · Tauri command · worker   │  (ainda não existe)
├───────────────────────────────────────────────┤
│ Aplicação / composição                         │
│   createMidoteca()  → Midoteca                 │  src/index.ts
├───────────────────────────────────────────────┤
│ Domínio (core/)                                │
│   entidades · tipos de entrada · contratos     │  sem dependências de infra
├───────────────────────────────────────────────┤
│ Infraestrutura (infra/sqlite/)                 │
│   driver · migrações · repositórios SQLite     │  implementa os contratos
└───────────────────────────────────────────────┘
```

Regra de dependência: `core/` **nunca** importa `infra/`. Os contratos de
repositório são interfaces em `core/*/repository.ts`; as classes
`Sqlite*Repository` em `infra/sqlite/repositories/` os implementam. Trocar SQLite
por outro mecanismo (ex.: D1) significa escrever novos adaptadores, sem tocar no
domínio.

## 3. Estrutura de diretórios

```text
src/
├── index.ts                       # composition root + API pública
├── core/
│   ├── shared/                    # kernel: ids, erros, validação, JSON, clock, caminhos, título
│   ├── library/                   # LibrarySource, repository (port), service, queries
│   ├── media/                     # MediaFile, MediaTrack + MediaRepository
│   ├── courses/                   # Course, CourseModule, Lesson, LessonMedia + CourseRepository
│   ├── documents/                 # Document, DocumentLink + DocumentRepository
│   ├── progress/                  # PlaybackProgress, ReadingProgress + ProgressRepository
│   ├── jobs/                      # Job + JobRepository
│   ├── settings/                  # AppSetting + SettingsRepository
│   ├── indexing/                  # Fase 2: types, organization (puro), ports, scanner,
│   │                              #   manifest, events, resource-governor, indexer
│   └── search/                    # fronteira: contrato de busca
└── infra/
    ├── sqlite/
    │   ├── database.ts            # SqliteDatabase (WAL, FK, busy_timeout, transações)
    │   ├── errors.ts              # mapeamento de erros do driver → domínio
    │   ├── migrator.ts            # runner de migrações versionadas
    │   ├── migrations/            # 0001-initial-schema, 0002-indexing, índice, tipos
    │   └── repositories/          # adaptadores SQLite (inclui indexing.store e library-query)
    ├── fs/                        # RecursiveFileScanner, FsSourceProbe, FsManifestLoader
    └── events/                    # TypedEventBus (in-process)
```

## 4. Responsabilidades dos módulos

| Módulo      | Responsabilidade                                                                                                 | Fora de escopo na Fase 1        |
| ----------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `shared`    | IDs UUID, hierarquia de erros, validação de entrada, codec JSON, timestamps ISO, resolução do diretório de dados | —                               |
| `library`   | Fontes de armazenamento (volumes/HDs) e seu estado de escaneamento                                               | scanner real de diretórios      |
| `media`     | Arquivos físicos (vídeo/áudio/PDF/legenda) e trilhas auxiliares                                                  | probe de metadados, hashing     |
| `courses`   | Árvore lógica curso → módulo → aula e associação aula↔arquivo                                                    | editor, reordenação em massa    |
| `documents` | Documento lógico e seus vínculos com curso/módulo/aula                                                           | extração de páginas, texto      |
| `progress`  | Progresso de reprodução (por aula) e de leitura (por documento)                                                  | —                               |
| `jobs`      | Fila de trabalho em segundo plano persistida                                                                     | worker de execução              |
| `settings`  | Preferências chave/valor                                                                                         | —                               |
| `indexing`  | Descoberta, organização pura, reconciliação incremental, eventos, back-pressure                                  | hash/probe de conteúdo (Fase 3) |
| `search`    | Fronteira e contrato de busca (compatível com o client)                                                          | FTS5/RAG                        |

## 5. Decisões arquiteturais centrais

- **Runtime**: núcleo TypeScript desacoplado de transporte. Ver
  [`adr/0001-backend-runtime.md`](adr/0001-backend-runtime.md).
- **Banco**: SQLite via `better-sqlite3` (síncrono, maduro, amplamente usado em
  apps desktop/Electron). WAL + `foreign_keys=ON` por conexão.
- **IDs**: UUIDv4 em colunas `TEXT`; **nunca** caminhos de arquivo.
- **Fronteira física/lógica**: arquivos físicos (`media_files`) são separados de
  conteúdos lógicos (`courses`/`lessons`/`documents`). Progresso é ancorado em
  aula/documento, não em arquivo.
- **Migrações**: versionadas, forward-only, aplicadas em transação, registradas
  em `schema_migrations`. Nunca `synchronize`/auto-schema.
- **Transações explícitas** para leituras agregadas (`getTree`) e escritas
  relacionadas.

## 6. Política de exclusão (regra de ouro)

> Excluir um registro do catálogo **nunca** remove automaticamente um arquivo
> físico.

- Nenhum repositório toca o sistema de arquivos. `media.delete`,
  `documents.delete`, `courses.delete` e `library.deleteSource` removem apenas
  linhas de catálogo.
- Cascatas de FK removem apenas linhas relacionadas (links, módulos, aulas,
  progresso, documentos), jamais arquivos.
- Arquivos ausentes são sinalizados via `media_files.availability = 'missing'`,
  preservando o histórico em vez de apagar registros.

## 7. Evolução (Fase 3+)

- A indexação incremental (scanner + reconciliação) já está implementada
  (ver §9). A Fase 3 acrescenta hashing/probe de conteúdo e FTS5/embeddings
  **sem** mudar contratos.
- A fila `jobs` permite enfileirar hasher/transcodificador por um worker
  dedicado.
- O composition root pode ser exposto por um controller NestJS local, comandos
  Tauri ou um worker, sem alterar o domínio.

## 8. Auditoria do backend myPlay

A classificação detalhada dos componentes do backend de referência está em
[`MYPLAY_AUDIT.md`](MYPLAY_AUDIT.md). Resumo: o backend legado foi **descartado**
como base de código (PostgreSQL com credenciais embutidas, entidade `Video`
duplicada, acoplamento arquivo↔registro e exclusão física), mas **reaproveitado
como referência conceitual** para formatos, extensões e fluxos.

## 9. Fase 2 — Biblioteca, descoberta e indexação incremental

A Fase 2 adiciona descoberta e organização de arquivos **sem** mudar a regra de
ouro (nunca tocar arquivos físicos) e sem reescrever a Fase 1.

### 9.1 Novos módulos

| Módulo                      | Responsabilidade                                                                                                         |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `core/indexing`             | Tipos de descoberta, organização pura, portas (store/scanner/probe/manifest), event bus, resource governor e o `Indexer` |
| `core/library/service.ts`   | `LibrarySourceService`: adicionar/validar/remover fontes e checar disponibilidade                                        |
| `core/library/queries.ts`   | `LibraryQueryService`: consultas paginadas e busca                                                                       |
| `infra/fs`                  | `RecursiveFileScanner`, `FsSourceProbe`, `FsManifestLoader`                                                              |
| `infra/events`              | `TypedEventBus` (in-process, sem transporte)                                                                             |
| `infra/sqlite/repositories` | `indexing.store.sqlite.ts`, `library-query.repository.sqlite.ts`                                                         |

### 9.2 Fluxo de indexação

```text
LibrarySourceService.addSource()
        │  (valida caminho, volumeId, cria source)
        ▼
Indexer.runScan({ sourceId })
        │
        ├─ probe.inspect(rootPath) ── offline? → status offline, summary 'source-unavailable'
        ├─ status = 'scanning'
        ├─ scanner.scan(rootPath)  ── descobre só .mp4/.mkv/.pdf/.srt/... (kind)
        │     │  batches de N arquivos
        │     ▼
        │   reconcileBatch()  (1 transação por lote)
        │     created / updated / moved / unchanged  (runToken = last_seen_at)
        ├─ markMissing(runToken)  → availability='missing' (sem deletar)
        ├─ organize(discovered)   → plano puro curso→módulo→aula + documentos + trilhas
        │     └─ applyOrganization() (1 transação)  + manifest overlay
        ├─ status = 'active', last_scan_at = agora
        └─ emit 'index:completed'
```

- **Organização é pura** (`core/indexing/organization.ts`): recebe a lista plana
  de arquivos descobertos e devolve um plano, sem IO. Testável isoladamente.
- **Escrita em lote**: o `IndexingStore` é síncrono (better-sqlite3) e roda
  dentro de `store.transaction(...)`; repositórios assíncronos não são usados em
  transação de lote.
- **Eventos**: emitidos **após** o commit da transação, nunca dentro dela.

### 9.3 Descoberta incremental (run token)

Cada execução gera um `runToken`. O scanner reconcilia por
`(source_id, relative_path)`; renomeações/movimentos são detectados por
`(file_size, modified_at)` **apenas quando há um único candidato**. Ao final,
linhas não vistas viram `missing`. Detalhes de identidade em
[`FILE_IDENTITY.md`](FILE_IDENTITY.md).

### 9.4 Títulos e manifesto

Precedência **manual > manifest > detected**, registrada em `title_source`.
`manual` nunca é sobrescrito por rescan. O `.midoteca/course.json` (versionado)
fornece títulos de curso/módulo/aula. Ver
[`LIBRARY_INDEXING.md`](LIBRARY_INDEXING.md).

### 9.5 Back-pressure

`ResourceGovernor` pausa/retoma/cancela cooperativamente e faz `throttle()` sob
sinais (playback ativo, disco ocupado, pressão de memória, bateria). O indexador
`await`a o governor entre lotes, mantendo a UI responsiva.
