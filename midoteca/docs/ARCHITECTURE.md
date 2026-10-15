# Arquitetura — Midoteca (Fase 1)

## 1. Visão geral

A Midoteca é um aplicativo desktop **local-first**. Todo o estado de catálogo
vive em um banco **SQLite local**, no diretório de dados do usuário — nunca no HD
externo sendo catalogado. A reprodução e a navegação devem funcionar sem IA, sem
internet e sem indexação; portanto, a Fase 1 entrega apenas a fundação de
domínio + persistência, com o mínimo de dependências.

A Fase 1 implementa um **núcleo TypeScript desacoplado de transporte**. Não há
HTTP, IPC, NestJS nem Tauri aqui. O núcleo expõe um *composition root*
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
│   ├── shared/                    # kernel: ids, erros, validação, JSON, clock, caminhos
│   ├── library/                   # LibrarySource + LibraryRepository
│   ├── media/                     # MediaFile, MediaTrack + MediaRepository
│   ├── courses/                   # Course, CourseModule, Lesson, LessonMedia + CourseRepository
│   ├── documents/                 # Document, DocumentLink + DocumentRepository
│   ├── progress/                  # PlaybackProgress, ReadingProgress + ProgressRepository
│   ├── jobs/                      # Job + JobRepository
│   ├── settings/                  # AppSetting + SettingsRepository
│   ├── indexing/                  # fronteira (Fase 2): tipos de job de indexação
│   └── search/                    # fronteira (Fase 2): contrato de busca
└── infra/sqlite/
    ├── database.ts                # SqliteDatabase (WAL, FK, busy_timeout, transações)
    ├── errors.ts                  # mapeamento de erros do driver → domínio
    ├── migrator.ts                # runner de migrações versionadas
    ├── migrations/                # 0001-initial-schema, índice, tipos
    └── repositories/              # adaptadores SQLite
```

## 4. Responsabilidades dos módulos

| Módulo | Responsabilidade | Fora de escopo na Fase 1 |
| --- | --- | --- |
| `shared` | IDs UUID, hierarquia de erros, validação de entrada, codec JSON, timestamps ISO, resolução do diretório de dados | — |
| `library` | Fontes de armazenamento (volumes/HDs) e seu estado de escaneamento | scanner real de diretórios |
| `media` | Arquivos físicos (vídeo/áudio/PDF/legenda) e trilhas auxiliares | probe de metadados, hashing |
| `courses` | Árvore lógica curso → módulo → aula e associação aula↔arquivo | editor, reordenação em massa |
| `documents` | Documento lógico e seus vínculos com curso/módulo/aula | extração de páginas, texto |
| `progress` | Progresso de reprodução (por aula) e de leitura (por documento) | — |
| `jobs` | Fila de trabalho em segundo plano persistida | worker de execução |
| `settings` | Preferências chave/valor | — |
| `indexing` | Fronteira e nomes canônicos de jobs de indexação | implementação |
| `search` | Fronteira e contrato de busca (compatível com o client) | FTS5/RAG |

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

## 7. Preparação para a Fase 2

- `indexing`/`search` já reservam as fronteiras; a Fase 2 adiciona os
  adaptadores (scanner incremental, FTS5, embeddings) sem mudar contratos.
- A fila `jobs` permite que o scanner/hasher/transcodificador sejam enfileirados
  por um worker dedicado.
- O composition root pode ser exposto por um controller NestJS local, comandos
  Tauri ou um worker, sem alterar o domínio.

## 8. Auditoria do backend myPlay

A classificação detalhada dos componentes do backend de referência está em
[`MYPLAY_AUDIT.md`](MYPLAY_AUDIT.md). Resumo: o backend legado foi **descartado**
como base de código (PostgreSQL com credenciais embutidas, entidade `Video`
duplicada, acoplamento arquivo↔registro e exclusão física), mas **reaproveitado
como referência conceitual** para formatos, extensões e fluxos.
