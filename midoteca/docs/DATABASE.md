# Banco de Dados — Midoteca (SQLite)

## 1. Princípios

- **Local-first**: o banco é um arquivo SQLite no diretório de dados do usuário.
  O caminho é resolvido por `resolveDefaultDatabasePath()` (ver
  `src/core/shared/app-paths.ts`) a partir de `MIDOTECA_DATA_DIR` ou do padrão da
  plataforma. Nenhum caminho absoluto é fixado no código.
- **Sem PostgreSQL**: a fundação não depende de nenhum servidor externo.
- **Sem auto-schema**: `synchronize` não existe; o esquema evolui só por
  migrações versionadas.
- **Nunca apagar arquivos**: o banco só guarda catálogo. Nenhuma operação de
  banco remove arquivos do disco.

## 2. Conexão e PRAGMAs

`SqliteDatabase` (`src/infra/sqlite/database.ts`) aplica, por conexão:

| PRAGMA | Valor | Motivo |
| --- | --- | --- |
| `foreign_keys` | `ON` | Integridade referencial real (é por conexão, não persistido). |
| `journal_mode` | `WAL` | Leitores concorrentes com um escritor; menos travas. |
| `synchronous` | `NORMAL` | Bom equilíbrio durabilidade/desempenho com WAL. |
| `busy_timeout` | `5000 ms` | Evita falhas imediatas sob contenção. |

Transações são explícitas via `SqliteDatabase.transaction(fn)` (commit no
sucesso, rollback em qualquer erro).

## 3. Estratégia de migrações

- Migrações são objetos `{ id, name, up, down }` em
  `src/infra/sqlite/migrations/`, listados em ordem em `migrations/index.ts`.
- `id` é monotônico e imutável; `name` espelha o arquivo.
- `runMigrations()` cria `schema_migrations` na primeira execução e aplica
  somente as pendentes, **cada uma em sua própria transação**.
- É idempotente: reabrir um banco já migrado não aplica nada.

| id | nome | conteúdo |
| --- | --- | --- |
| 1 | `0001-initial-schema` | todas as tabelas, índices e constraints da Fase 1 |

Para adicionar uma migração: crie `00NN-<nome>.ts` exportando um `Migration` e
acrescente-o ao array `MIGRATIONS`. Nunca reordene nem renumere migrações
existentes. O `down` existe para reversibilidade em desenvolvimento.

## 4. Convenções

- **Chaves primárias**: `TEXT` com UUIDv4. Caminhos nunca são chave.
- **Timestamps**: `TEXT` ISO-8601 UTC (`created_at`, `updated_at`, `last_scan_at`,
  `completed_at`, `modified_at`).
- **Tempos**: milissegundos em `INTEGER` (`duration_ms`, `position_ms`).
- **Tamanhos**: bytes em `INTEGER` (`file_size`).
- **JSON**: colunas `TEXT` (`metadata`, `payload`, `checkpoint`, `value`), com
  codec tolerante (`decodeObject`/`decodeJson`).
- **Booleanos**: não usados diretamente; presença/ausência de timestamp ou de
  enum expressa estado.

## 5. Tabelas

### `library_sources`
| coluna | tipo | notas |
| --- | --- | --- |
| `id` | TEXT PK | UUID |
| `root_path` | TEXT NOT NULL | raiz do volume |
| `volume_id` | TEXT | identificador do volume |
| `status` | TEXT NOT NULL | `active`\|`offline`\|`scanning`\|`error` |
| `last_scan_at` | TEXT | ISO ou NULL |
| `created_at`/`updated_at` | TEXT NOT NULL | ISO |

Índices: `ux_library_sources_volume_id` (único parcial, onde não-nulo),
`ix_library_sources_status`.

### `media_files`
| coluna | tipo | notas |
| --- | --- | --- |
| `id` | TEXT PK | UUID |
| `source_id` | TEXT NOT NULL | FK → `library_sources` (CASCADE) |
| `relative_path` | TEXT NOT NULL | relativo à raiz da fonte |
| `media_type` | TEXT NOT NULL | `video`\|`audio`\|`pdf`\|`subtitle`\|`image`\|`other` |
| `file_size` | INTEGER | `>= 0` ou NULL |
| `duration_ms` | INTEGER | `>= 0` ou NULL |
| `modified_at` | TEXT | ISO ou NULL |
| `sha256` | TEXT | 64 hex ou NULL, **não único** |
| `availability` | TEXT NOT NULL | `available`\|`missing`\|`unverified` |
| `created_at`/`updated_at` | TEXT NOT NULL | ISO |

Restrições: `UNIQUE (source_id, relative_path)`; `CHECK` de tipo/availability e
de tamanhos não-negativos; `CHECK length(sha256)=64` quando presente.
Índices: `ix_media_files_source`, `ix_media_files_sha256`, `ix_media_files_type`,
`ix_media_files_availability`.

> `sha256` é indexado, **não único**: conteúdo duplicado é permitido e útil para
> dedup/fingerprint. O mesmo hash pode existir em vários arquivos/fontes.

### `media_tracks`
`id` PK · `media_file_id` FK→`media_files` (CASCADE) · `kind`
(`subtitle`\|`audio`\|`video`\|`chapter`\|`attachment`) · `language` · `path` ·
`metadata` (JSON). Índice `ix_media_tracks_media`.

### `courses`
`id` PK · `title` NOT NULL · `description` · `metadata` (JSON) ·
`created_at`/`updated_at`.

### `course_modules`
`id` PK · `course_id` FK→`courses` (CASCADE) · `title` · `sort_order INTEGER`.
Índice `ix_course_modules_course (course_id, sort_order)`.

### `lessons`
`id` PK · `module_id` FK→`course_modules` (CASCADE) · `title` · `sort_order`.
Índice `ix_lessons_module (module_id, sort_order)`.

### `lesson_media`
`lesson_id` FK→`lessons` (CASCADE) · `media_file_id` FK→`media_files` (CASCADE) ·
`role` (`primary`\|`supplementary`\|`attachment`\|`subtitle`).
PK composta `(lesson_id, media_file_id, role)`. Índice `ix_lesson_media_media`.
Permite **múltiplos arquivos por aula** e o mesmo arquivo em várias aulas.

### `documents`
`id` PK · `media_file_id` FK→`media_files` (CASCADE), `UNIQUE` · `title` ·
`page_count INTEGER` (`>= 0` ou NULL). Um documento lógico por arquivo.

### `document_links`
`id` PK · `document_id` FK→`documents` (CASCADE) · `course_id` FK→`courses`
(CASCADE) · `module_id` FK→`course_modules` (CASCADE) · `lesson_id` FK→`lessons`
(CASCADE). `CHECK`: ao menos um de course/module/lesson não-nulo. Índices por
coluna.

### `playback_progress`
`id` PK · `lesson_id` FK→`lessons` (CASCADE), `UNIQUE` · `position_ms INTEGER`
(`>= 0`) · `duration_ms INTEGER` (`>= 0` ou NULL) · `completed_at` · `updated_at`.
Uma linha por aula (upsert).

### `reading_progress`
`id` PK · `document_id` FK→`documents` (CASCADE), `UNIQUE` · `page INTEGER`
(`>= 1`) · `scroll_ratio REAL` (`0..1`) · `zoom REAL` (`> 0`) · `theme` ·
`updated_at`. Uma linha por documento (upsert).

### `jobs`
`id` PK · `type` NOT NULL · `status` (`pending`\|`running`\|`paused`\|`completed`
\|`failed`\|`cancelled`) · `priority INTEGER` · `payload` (JSON) · `checkpoint`
(JSON) · `attempts INTEGER` (`>= 0`) · timestamps. Índice
`ix_jobs_status_priority (status, priority DESC, created_at)`.

### `app_settings`
`key` PK · `value` (JSON, NOT NULL) · `updated_at`.

### `schema_migrations` (controle interno)
`id` PK · `name` · `applied_at`.

## 6. Matriz de exclusão (ON DELETE)

| Relação | Ação | Efeito |
| --- | --- | --- |
| `library_sources` → `media_files` | CASCADE | remove catálogo de arquivos da fonte |
| `media_files` → `media_tracks` | CASCADE | remove trilhas do arquivo |
| `media_files` → `lesson_media` | CASCADE | remove vínculos aula↔arquivo |
| `media_files` → `documents` | CASCADE | remove documento sem seu arquivo |
| `documents` → `document_links` | CASCADE | remove vínculos do documento |
| `documents` → `reading_progress` | CASCADE | remove progresso de leitura |
| `courses` → `course_modules` | CASCADE | remove módulos do curso |
| `course_modules` → `lessons` | CASCADE | remove aulas do módulo |
| `lessons` → `lesson_media` | CASCADE | remove vínculos da aula |
| `lessons` → `playback_progress` | CASCADE | remove progresso da aula |
| `courses`/`course_modules`/`lessons` → `document_links` | CASCADE | remove vínculos |

**Todas as cascatas afetam apenas linhas do catálogo.** Nenhuma toca o disco.

## 7. Reproduzindo os testes

```bash
cd midoteca
npm test
```

Os testes usam bancos **temporários em arquivo** (não `:memory:`) para exercitar
WAL, persistência entre reaberturas e integridade referencial de forma realista.
Não dependem de PostgreSQL, internet ou arquivos multimídia.
