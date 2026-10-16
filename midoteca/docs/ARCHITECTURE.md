# Arquitetura — Midoteca (Fases 1–2)

> Organização de pastas e nomes de arquivo: [`../../docs/CODE_ORGANIZATION.md`](../../docs/CODE_ORGANIZATION.md).
> **Modelo canônico (fonte única de verdade, vale também para o frontend):
> [`../../docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md)** — este documento
> descreve a **implementação atual do núcleo** e como ela converge para o modelo
> canônico (§10).

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
│ Presentation (Fase 3+)                         │  HTTP / IPC / Tauri commands
│   controller · Tauri command · worker          │  (ainda não existe)
├───────────────────────────────────────────────┤
│ Aplicação (modules/<ctx>/application/)         │  casos de uso, queries, serviços
│   LibrarySourceService · Indexer · queries     │  orquestra domínio + ports
├───────────────────────────────────────────────┤
│ Domínio (modules/<ctx>/domain/ + core/)        │  entidades, regras puras, ports
│   sem dependência de infraestrutura            │
├───────────────────────────────────────────────┤
│ Infraestrutura (modules/<ctx>/infrastructure/) │  implementa os ports
│   Sqlite*Repository · platform/*               │  driver, migrações, fs, eventos
└───────────────────────────────────────────────┘
```

Regra de dependência: `domain/` e `application/` **nunca** importam
`infrastructure/` nem framework. Os contratos são interfaces em
`modules/<ctx>/domain/ports.ts`; as classes `Sqlite*Repository` em
`modules/<ctx>/infrastructure/` os implementam. Trocar SQLite por outro
mecanismo (ex.: D1) significa escrever novos adaptadores, sem tocar no domínio.
Adapters técnicos usados por 2+ contextos (conexão/migrações, filesystem, bus)
vivem em `platform/` ([`../../docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md)
§6).

## 3. Estrutura de diretórios

O layout abaixo já é o **modelo canônico**
([`../../docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) §4), o mesmo do
frontend, aplicado na migração **P5** sem mudança de comportamento:

```text
src/
├── index.ts                          # API pública (re-exporta core/, modules/, platform/)
├── app/
│   └── composition-root.ts           # createMidoteca(): abre SQLite, migra, injeta adapters
├── core/                             # kernel compartilhado (não é um contexto)
│   ├── domain/                       # vocabulário usado por 2+ contextos (MediaType, LessonMediaRole)
│   └── errors.ts · ids.ts · validation.ts · clock.ts · json.ts · json-codec.ts
│       · title-source.ts · sort-source.ts · app-paths.ts · index.ts
├── modules/
│   ├── library/
│   │   ├── domain/                   # entities, inputs, ports, queries (read models + port)
│   │   ├── application/              # services/library-source-service, queries
│   │   └── infrastructure/           # library.repository.sqlite, library-query.repository.sqlite
│   ├── media/ · courses/ · documents/ · progress/ · jobs/ · settings/
│   │   └── domain/ · infrastructure/ (media/course/document/progress/job/settings repository.sqlite)
│   ├── indexing/
│   │   ├── domain/                   # types, contracts, events, manifest, organization, ports
│   │   ├── application/              # services/indexer, resource-governor
│   │   └── infrastructure/           # indexing.store.sqlite
│   └── search/domain/contracts.ts    # fronteira: contrato de busca
└── platform/
    ├── persistence/sqlite/           # SqliteDatabase (WAL, FK, busy_timeout), errors, migrator, migrations/
    ├── fs/                           # RecursiveFileScanner, FsSourceProbe, FsManifestLoader
    └── events/                       # TypedEventBus (in-process)
```

### 3.1 Pendências de convergência

O layout está no destino; restam refinamentos **dentro** das camadas, sem
mudança de comportamento prevista (§10):

- dividir `application/services/*` em **casos de uso explícitos**
  (`use-cases/<verbo>-<substantivo>.ts`) conforme forem tocados;
- camada `presentation/` (transporte IPC/HTTP), prevista para a Fase 3;
- dividir os adapters acima do indicador de tamanho (~250 linhas).

Regra de alocação de adapter: serve **um** contexto →
`modules/<ctx>/infrastructure/`; serve **2+** contextos → `platform/<tech>/`
([`../../docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) §6).

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

> O transporte (item abaixo) é a camada `presentation/` do modelo canônico e o
> que destrava o adapter IPC/HTTP do frontend (P3 do
> [`../../docs/REFACTORING_ROADMAP.md`](../../docs/REFACTORING_ROADMAP.md)).

- A indexação incremental (scanner + reconciliação) já está implementada
  (ver §9). A Fase 3 acrescenta hashing/probe de conteúdo e FTS5/embeddings
  **sem** mudar contratos.
- A fila `jobs` permite enfileirar hasher/transcodificador por um worker
  dedicado.
- O composition root pode ser exposto por um controller NestJS local, comandos
  Tauri ou um worker, sem alterar o domínio (camada `presentation/`).

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

| Módulo                                      | Responsabilidade                                                                                                         |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `modules/indexing`                          | Tipos de descoberta, organização pura, portas (store/scanner/probe/manifest), event bus, resource governor e o `Indexer` |
| `modules/library/application/services`      | `LibrarySourceService`: adicionar/validar/remover fontes e checar disponibilidade                                        |
| `modules/library/application/queries.ts`    | `LibraryQueryService`: consultas paginadas e busca (port/read models em `domain/queries.ts`)                             |
| `platform/fs`                               | `RecursiveFileScanner`, `FsSourceProbe`, `FsManifestLoader`                                                              |
| `platform/events`                           | `TypedEventBus` (in-process, sem transporte)                                                                             |
| `modules/<ctx>/infrastructure`              | `indexing.store.sqlite.ts`, `library-query.repository.sqlite.ts`                                                         |

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

- **Organização é pura** (`modules/indexing/domain/organization.ts`): recebe a lista plana
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

## 10. Conformidade com o modelo canônico

Verificado **depois** da migração **P5**: `npm test` (92/92), `npm run typecheck`,
`npm run lint`, `npm run format:check`, `npm run build` e uma varredura de imports
de todas as arestas entre áreas. Nenhuma migração de layout alterou
comportamento: caracterizar (testes) → mover → ajustar imports → rodar a suíte.

| Regra canônica | Situação no núcleo |
| --- | --- |
| `domain/` e `application/` não importam `infrastructure/` | ✅ 0 ocorrências |
| Domínio/aplicação sem framework ou driver | ✅ 0 ocorrências de React/NestJS/TypeORM/Express/Tauri/Axios/`better-sqlite3` (restam 2 menções em comentários) |
| Driver nativo fora do domínio | ✅ `better-sqlite3` só em `platform/persistence/sqlite` (+ comentário em `modules/indexing/domain/ports.ts`) |
| Fatia vertical `modules/<ctx>/{domain,application,infrastructure}` | ✅ conforme (P5) |
| `domain/` não importa `domain/` de outro contexto | ✅ vocabulário compartilhado promovido a `core/domain/` (`MediaType`, `LessonMediaRole`) |
| `application/` só cruza contexto por **ports** | ✅ 2 arestas: `library → indexing/domain` (EventBus, SourceProbe) e `indexing → library/domain/ports` |
| Adapters compartilhados em `platform/` | ✅ conforme (`persistence/sqlite`, `fs`, `events`) |
| Testes em `test/` espelhando `src/` | ✅ conforme (17 specs) |
| Casos de uso explícitos em `application/` | ⚠️ **parcial** — `services/`, `queries.ts` e `resource-governor.ts` já vivem em `application/`; falta dividir em `use-cases/` |
| `presentation/` (transporte) | ⚠️ **ausente** — previsto para a Fase 3 |
| Adapters dentro do indicador de tamanho (~250 linhas) | ⚠️ exceções: `course.repository.sqlite.ts` (430), `indexing.store.sqlite.ts` (421) |

Pendências, prioridade e risco: **P5/P7** do
[`../../docs/REFACTORING_ROADMAP.md`](../../docs/REFACTORING_ROADMAP.md).
