# Diretrizes DDD, Hexagonal e SOLID — Midoteca

> Documento **derivado** do modelo canônico em
> [`ARCHITECTURE.md`](ARCHITECTURE.md). Aqui ficam os **padrões táticos** e as
> decisões de código; lá ficam as áreas, camadas e regras de dependência. Vale
> para **backend (`midoteca/`)** e **frontend (`client/`)** — mesma arquitetura,
> mesmas camadas. Regra permanente em [`../AGENTS.md`](../AGENTS.md).
>
> **Vocabulário:** o artefato que o hexagonal chama de *port* é chamado aqui de
> **contrato** (o adapter é a implementação). Cada contrato mora no arquivo pelo
> seu papel: `domain/repositories.ts` (repositórios + comandos) ou
> `domain/contracts.ts` (demais dependências externas).

## 1. Bounded contexts

Cada contexto é coeso e evolui de forma independente. **Não compartilhe modelos
entre contextos por conveniência**: use ids e contratos. Modelo realmente
compartilhado (2+ contextos) sobe para `core/domain/`.

### Backend (`midoteca/src/modules/`)

| Contexto | Responsabilidade | Contrato principal |
| --- | --- | --- |
| `library` | Fontes de armazenamento, disponibilidade, consultas | `LibraryRepository` |
| `media` | Arquivos físicos + trilhas | `MediaRepository` |
| `courses` | Curso → módulo → aula, vínculo aula↔arquivo | `CourseRepository` |
| `documents` | PDF lógico + vínculos | `DocumentRepository` |
| `progress` | Progresso de reprodução/leitura | `ProgressRepository` |
| `indexing` | Descoberta, organização, reconciliação incremental | `IndexingStore`, `FileScanner`, `SourceProbe`, `ManifestLoader` |
| `search` | Contrato de busca | `SearchRepository` (fronteira) |
| `jobs` | Fila de trabalho persistida | `JobRepository` |
| `settings` | Preferências chave/valor | `SettingsRepository` |

### Frontend (`client/src/modules/`)

| Contexto | Responsabilidade |
| --- | --- |
| `library` | Catálogo (cursos, filmes, documentos) e navegação |
| `home` | Início: continuar assistindo/lendo e recentes |
| `courses` | Detalhes/edição de curso e progresso |
| `player` | Reprodução de aula/filme (tela cheia + mini player) |
| `documents` | Leitura de PDF (página, rolagem, zoom, tema) |
| `search` | Pesquisa universal |
| `settings` | Preferências |

O contrato agregado do FE é `LibraryRepository`
(`client/src/core/contracts/library-repository.ts`), composto por contratos
menores (`LibraryCatalogRepository`, `PlaybackStateRepository`,
`ReadingStateRepository`, `PageProvider`, `ISearchService`). O agregado é
conveniência de composição; cada adapter deve implementar **somente** os
contratos que realmente sustenta.

## 2. Camadas por contexto (vocabulário único)

Idêntico nos dois runtimes — só muda o idioma dos nomes de arquivo:

```text
modules/<contexto>/
├── domain/            # entities.ts · types.ts · errors.ts · events.ts · repositories.ts · contracts.ts · <regra>.ts
├── application/       # use-cases/ (escrita) · queries/ (leitura) · dependencies.ts · services/
├── infrastructure/    # adapters do contexto (SQLite, fs, IPC/HTTP, mock)
└── presentation/      # BE: controllers/ · FE: views/ · components/ · providers/ · hooks/ · stories/
```

> **Não crie camadas, interfaces ou classes vazias só para seguir o padrão.**
> Critérios de "quando cada camada existe" em
> [`ARCHITECTURE.md`](ARCHITECTURE.md) §10. Só extraia quando houver
> responsabilidade real.

Caminhos atuais × canônicos (mapa completo em
[`ARCHITECTURE.md`](ARCHITECTURE.md) §12): backend e frontend já usam
`modules/<ctx>/{domain,application,infrastructure,presentation}`. No frontend, os
casos de uso ficam em `application/use-cases/` (sem React) e os hooks de
apresentação em `presentation/hooks/`. A migração é incremental e está
priorizada em [`REFACTORING_ROADMAP.md`](REFACTORING_ROADMAP.md).

## 3. Regra de dependência

Fluxo permitido: `presentation → application → domain ← infrastructure`.

Proibido importar no **domínio/aplicação**:

| Lado | Proibido |
| --- | --- |
| `midoteca/src/core/**`, `midoteca/src/modules/**/{domain,application}` | NestJS, React, TypeORM, SQLite/`better-sqlite3`, Express, Tauri, Axios, FFmpeg |
| `client/src/core/**`, `client/src/modules/**/{domain,application}` | `react`, `react-dom`, `axios`, `@tauri-apps/*`, `localStorage`, `fetch` |

Consequências práticas:

- Casos de uso dependem de **contratos** para sistemas externos.
- Adaptadores concretos implementam esses contratos e são montados **apenas** no
  composition root (`createMidoteca` / `main.tsx`).
- Controllers e componentes React são **finos** e delegam a casos de uso.
- **Nada de regra de negócio em hook de apresentação** — hook apresenta, caso de
  uso decide.
- Matriz completa e fences de verificação: [`ARCHITECTURE.md`](ARCHITECTURE.md) §5.

## 4. Padrões táticos

| Padrão | O que é | Onde vive | Exemplo no repositório |
| --- | --- | --- | --- |
| **Entidade** | Objeto com identidade e invariantes | `domain/entities.ts` | `Course`, `MediaFile`, `LibrarySource` |
| **Value object** | Sem identidade; igualdade por valor | `domain/` | `TitleSource`, `relativePath`, `positionMs` + `durationMs` |
| **Agregado** | Cluster com raiz única, consistência transacional | `domain/` | Curso → módulos → aulas (`getTree`); `LibrarySource` como âncora de caminhos |
| **Domain service** | Regra que não pertence a uma entidade | `domain/<nome>.ts` | `indexing/organization.ts` (organização pura, sem IO) |
| **Caso de uso (escrita)** | Intenção explícita do sistema, um por arquivo | `application/use-cases/` | `AddSource`, `RunScan`, `ToggleLessonCompletion`, `openLesson` |
| **Consulta (leitura)** | Leitura explícita, um por arquivo | `application/queries/` | `ListCourses`, `GetDocumentDetails`, `SearchLibrary` |
| **Read model** | Projeção de leitura (não é entidade) | `application/queries/` | `CourseSummary`, `DocumentSummary`, `Paged` |
| **Contrato de repositório** | Persistência de agregado + seus comandos | `domain/repositories.ts` | `LibraryRepository`, `CreateLibrarySource` |
| **Contrato externo** | Demais dependências de fora | `domain/contracts.ts` | `FileScanner`, `SourceProbe`, `EventBus` |
| **Adapter** | Tradução técnica do contrato | `infrastructure/` ou `platform/` | `Sqlite*Repository`, `FsSourceProbe`, `TypedEventBus` |
| **Evento de domínio** | Fato consumado, publicado após commit | `domain/events.ts` | `index:completed`, `index:progress` |
| **ACL (anticorrupção)** | Tradução entre modelos diferentes | `infrastructure/` do consumidor | adapter do FE traduzindo domínio canônico → view-model; ingestão de legado |

### 4.1 Convenções de caso de uso e consulta

- **Um arquivo por operação**, nomeado pela intenção: `use-cases/add-source.ts`
  (escrita), `queries/list-courses.ts` (leitura).
- **Entrada e saída colocalizadas** no arquivo da operação (ou importadas do
  caso de uso dono quando compartilhadas). **Não** criar `dto.ts`.
- Sem framework: a operação recebe contratos por injeção (construtor ou factory)
  e devolve valor/promessa. Nada de decorador, nada de `this.request`.
- Transação e consistência ficam no caso de uso (ou no serviço que ele chama),
  nunca no controller/componente.
- Orquestração de **vários** casos de uso ou de passos com política própria vai
  em `application/services/` — e o serviço não substitui casos de uso explícitos.
- Dependências repetidas por 2+ operações viram um tipo em
  `application/dependencies.ts` — não um `dto.ts` genérico.

### 4.2 Órgão de leitura (read side)

- Read models (projeções) referenciados por um **contrato de leitura** moram no
  `domain`: `domain/read-models.ts`. Um read model usado por uma única consulta,
  sem contrato próprio, pode ficar no próprio arquivo da consulta.
- Quando a consulta vai direto à projeção (SQL otimizado), o contrato do store
  fica em `domain/repositories.ts` — **não** em `application/queries/`, pois quem
  o implementa é a `infrastructure` e a matriz proíbe `infrastructure →
  application`. As **operações** de leitura ficam em `application/queries/<op>.ts`
  e o adapter em `infrastructure/<ctx>.query.sqlite.ts`.
- O domínio **não** conhece persistência/SQL. O contrato do store e os read models
  são *shapes* puros (sem comportamento), declarados no `domain/`; a
  `infrastructure` os implementa.

### 4.3 Quando extrair (e quando não)

| Extraia | Não extraia |
| --- | --- |
| Regra reutilizada por 2+ telas/fluxos | Uso único e óbvio |
| Regra que precisa de teste sem UI/HTTP | Passagem de prop/parâmetro |
| Cálculo com invariante (progresso, próxima aula, validação) | Formatação pura de texto |
| Orquestração com IO + regra | `if` de apresentação |

## 5. Contratos & Adapters na prática

### Backend

```ts
// domain/repositories.ts — contrato + comandos colocalizados
export interface CreateLibrarySource { rootPath: string; displayName?: string | null }
export interface LibraryRepository {
  addSource(input: CreateLibrarySource): Promise<LibrarySource>;
  // ...
}

// domain/contracts.ts — dependência externa que não é repositório
export interface SourceProbe { check(rootPath: string): Promise<SourceAvailability> }

// infrastructure/ — adapter concreto
export class SqliteLibraryRepository implements LibraryRepository { /* ... */ }

// app/composition-root.ts — única composição
createMidoteca() → { sources: new LibrarySourceService({ library, probe, events }) }
```

### Frontend

```ts
// core/contracts/library-repository.ts — contrato de fronteira do runtime
export interface LibraryRepository extends LibraryCatalogRepository, /* ... */ {}

// modules/library/infrastructure/ — adapter atual
export class MockLibraryService implements LibraryRepository { /* memória */ }

// modules/<ctx>/infrastructure/ — adapter futuro, MESMO contrato
export class IpcLibraryRepository implements LibraryRepository { /* chama o núcleo */ }

// app/main.tsx — composição
<LibraryProvider repository={new IpcLibraryRepository(...)} />
```

## 6. Entrada, saída e erros (backend)

- **Comandos de escrita**: colocalizados com o caso de uso
  (`application/use-cases/<op>.ts`) ou com o repositório que os consome
  (`domain/repositories.ts`), com `id?` opcional (ids determinísticos em testes).
- **Saídas**: entidades de domínio, **sem** tipos do driver.
- **Validação**: na borda do adapter (`core/validation.ts`), lançando
  `ValidationError` antes de tocar o banco.
- **Erros**: hierarquia `MidotecaError` → `NotFoundError`, `ValidationError`,
  `ConflictError`, `PersistenceError`. Erros do driver são mapeados
  (`platform/persistence/sqlite/errors.ts`); **nunca** vaze código do driver para
  o domínio.
- **Frontend**: falha de adapter vira estado explícito de tela
  (`empty`/`error`/`unavailable`), nunca `throw` dentro de componente visual.

## 7. Regras de modelagem inegociáveis

1. **Identidade é UUID**, nunca caminho de arquivo.
2. **Arquivo físico ≠ conteúdo lógico** (ver
   [`../midoteca/docs/FILE_IDENTITY.md`](../midoteca/docs/FILE_IDENTITY.md)).
3. **Excluir catálogo nunca apaga arquivo físico.**
4. Ausência de arquivo → `availability = 'missing'`, sem deleção.
5. Títulos seguem precedência **manual > manifest > detected**.
6. Cascatas de FK afetam **apenas** linhas de catálogo.

## 8. SOLID — como verificar na revisão

| Princípio | Pergunta de revisão | Sinal de violação no repo |
| --- | --- | --- |
| **SRP** | O arquivo tem uma razão para mudar? | arquivo acima do indicador com múltiplos assuntos (ex.: serviço com CRUD + streaming + transcodificação) |
| **OCP** | Para adicionar caso novo, preciso editar `if` existente? | `switch` crescendo em service/controller; novo tipo de mídia mexendo em código de leitura |
| **LSP** | Todo adapter passa o mesmo teste de contrato? | adapter com comportamento divergente do contrato; método "não suportado" |
| **ISP** | Algum consumidor é obrigado a implementar o que não usa? | contrato agregado grande; adapter com métodos vazios/`throw` |
| **DIP** | O domínio conhece detalhe de infraestrutura? | `import` de driver/SDK em `domain`/`application`; instanciação direta de adapter fora de `app/` |

Regra prática: **se um `import` de tecnologia aparece em `domain/` ou
`application/`, a arquitetura foi violada** — reverter o `import` para um
contrato.

## 9. Anti-padrões (evidência no legado myPlay)

| Anti-padrão | Onde apareceu | Correção aplicada/prevista |
| --- | --- | --- |
| Serviço com muitas responsabilidades | `backend/src/video/video.service.ts` (458 linhas) | quebrar em contextos (`media`, `progress`, `indexing`) |
| Entidade lógica acoplada a caminho físico | `video.entity.ts` (`filePath`) | `MediaFile` + UUID + caminho relativo |
| Exclusão remove arquivo físico | `video.service.ts` `remove()` (`unlink`) | catálogo apenas |
| Progresso dentro da entidade de conteúdo | `Video.lastPosition` | `playback_progress` por aula |
| Duas entidades para o mesmo conceito | `video/` e `modules/video/` | uma entidade canônica; remover código morto |
| Componente gigante com lógica | `client/.../VideoPlayer.tsx` (996 linhas) | extrair hooks/casos de uso/subcomponentes |
| **Arquivos guarda-chuva** (`dto.ts`, `inputs.ts`, `queries.ts` com N operações) | núcleo atual | separar por operação/por papel (`use-cases/`, `queries/`, `repositories.ts`, `contracts.ts`) — P8 |
| Duas convenções para o mesmo conceito | backend por sufixo × frontend por pasta | modelo único em [`ARCHITECTURE.md`](ARCHITECTURE.md) |

## 10. Checklist de revisão (PR)

- [ ] Domínio não importa framework/infra (checar imports).
- [ ] Novo comportamento externo atrás de um contrato + adapter.
- [ ] Arquivos nos nomes canônicos (sem `dto.ts`/`inputs.ts`/`ports.ts`).
- [ ] Adapter alocado pela regra de contexto único × compartilhado
      ([`ARCHITECTURE.md`](ARCHITECTURE.md) §6).
- [ ] Casos de uso explícitos para operações com regra de negócio.
- [ ] Componentes/controllers finos; regra em `application`/`domain`.
- [ ] Sem dependência circular (`domain` não importa `application`; nada importa `app`).
- [ ] Erros mapeados para o domínio (sem vazamento do driver).
- [ ] Regra de ouro respeitada (nada de escrita em arquivos físicos).
- [ ] Testes cobrindo o comportamento
      (ver [`TESTING_STRATEGY.md`](TESTING_STRATEGY.md)).
