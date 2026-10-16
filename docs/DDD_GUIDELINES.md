# Diretrizes DDD, Hexagonal e SOLID — Midoteca

> Documento **derivado** do modelo canônico em
> [`ARCHITECTURE.md`](ARCHITECTURE.md). Aqui ficam os **padrões táticos** e as
> decisões de código; lá ficam as áreas, camadas e regras de dependência. Vale
> para **backend (`midoteca/`)** e **frontend (`client/`)** — mesma arquitetura,
> mesmas camadas. Regra permanente em [`../AGENTS.md`](../AGENTS.md).

## 1. Bounded contexts

Cada contexto é coeso e evolui de forma independente. **Não compartilhe modelos
entre contextos por conveniência**: use ids e contratos. Modelo realmente
compartilhado (2+ contextos) sobe para `core/domain/`.

### Backend (`midoteca/src/modules/`)

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
(`client/src/core/ports/libraryRepository.ts`), composto por ports menores
(`LibraryCatalogRepository`, `PlaybackStateRepository`, `ReadingStateRepository`,
`PageProvider`, `ISearchService`). O agregado é conveniência de composição; cada
adapter deve implementar **somente** os ports que realmente sustenta.

## 2. Camadas por contexto (vocabulário único)

Idêntico nos dois runtimes — só muda o idioma dos nomes de arquivo:

```text
modules/<contexto>/
├── domain/            # entidades, value objects, regras puras, domain services, ports.ts
├── application/       # use-cases/ + dto.ts + services/ (orquestração)
├── infrastructure/    # adapters do contexto (SQLite, fs, IPC/HTTP, mock)
└── presentation/      # BE: controllers/ · FE: components/ + hooks/
```

> **Não crie camadas, interfaces ou classes vazias só para seguir o padrão.**
> Critérios de "quando cada camada existe" em
> [`ARCHITECTURE.md`](ARCHITECTURE.md) §10. Só extraia quando houver
> responsabilidade real.

Caminhos atuais × canônicos (mapa completo em
[`ARCHITECTURE.md`](ARCHITECTURE.md) §12): hoje o backend usa
`core/<ctx>/{entities,inputs,repository,service,queries}.ts` + `infra/`; o
frontend usa `features/<ctx>/{application,infrastructure,presentation}`. A
migração é incremental e está priorizada em
[`REFACTORING_ROADMAP.md`](REFACTORING_ROADMAP.md).

## 3. Regra de dependência

Fluxo permitido: `presentation → application → domain ← infrastructure`.

Proibido importar no **domínio/aplicação**:

| Lado | Proibido |
| --- | --- |
| `midoteca/src/core/**`, `midoteca/src/modules/**/{domain,application}` | NestJS, React, TypeORM, SQLite/`better-sqlite3`, Express, Tauri, Axios, FFmpeg |
| `client/src/core/**`, `client/src/modules/**/{domain,application}` | `react`, `react-dom`, `axios`, `@tauri-apps/*`, `localStorage`, `fetch` |

Consequências práticas:

- Casos de uso dependem de **abstrações** (`ports`) para sistemas externos.
- Adaptadores concretos implementam essas abstrações e são montados **apenas** no
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
| **Caso de uso** | Intenção explícita do sistema, um por arquivo | `application/use-cases/` | `AddSource`, `RunScan`, `ToggleLessonCompletion`, `openLesson` |
| **Port** | Contrato do que a aplicação precisa | `domain/ports.ts` | `LibraryRepository`, `FileScanner`, `SourceProbe` |
| **Adapter** | Tradução técnica do port | `infrastructure/` ou `platform/` | `Sqlite*Repository`, `RecursiveFileScanner`, `TypedEventBus` |
| **Evento de domínio** | Fato consumado, publicado após commit | `indexing/events` | `index:completed`, `index:progress` |
| **ACL (anticorrupção)** | Tradução entre modelos diferentes | `infrastructure/` do consumidor | adapter do FE traduzindo domínio canônico → view-model; ingestão de legado |

### 4.1 Convenções de caso de uso

- **Um caso de uso por arquivo**, nomeado pela intenção
  (`add-source.ts`, `run-scan.ts`, `toggle-lesson-completion.ts`).
- Entrada e saída tipadas no próprio caso de uso (DTOs), sem expor entidades
  internas quando isso vazar detalhe de persistência.
- Sem framework: o caso de uso recebe ports por injeção (construtor ou factory) e
  devolve valor/promessa. Nada de decorador, nada de `this.request`.
- Transação e consistência ficam no caso de uso (ou no serviço que ele chama),
  nunca no controller/componente.
- Orquestração de **vários** casos de uso ou de passos com política própria vai
  em `application/services/` — e o serviço não substitui casos de uso explícitos.

### 4.2 Quando extrair (e quando não)

| Extraia | Não extraia |
| --- | --- |
| Regra reutilizada por 2+ telas/fluxos | Uso único e óbvio |
| Regra que precisa de teste sem UI/HTTP | Passagem de prop/parâmetro |
| Cálculo com invariante (progresso, próxima aula, validação) | Formatação pura de texto |
| Orquestração com IO + regra | `if` de apresentação |

## 5. Ports & Adapters na prática

### Backend

```ts
// domain/ports.ts (módulo) — contrato
export interface LibraryRepository {
  addSource(input: AddSourceInput): Promise<LibrarySource>;
  // ...
}

// infrastructure/ — adapter concreto
export class SqliteLibraryRepository implements LibraryRepository { /* ... */ }

// app/composition-root.ts — única composição
createMidoteca() → { sources: new LibrarySourceService({ library, probe, events }) }
```

### Frontend

```ts
// core/ports/libraryRepository.ts — port do runtime
export interface LibraryRepository extends LibraryCatalogRepository, /* ... */ {}

// modules/library/infrastructure/ — adapter atual
export class MockLibraryService implements LibraryRepository { /* memória */ }

// modules/<ctx>/infrastructure/ — adapter futuro, MESMO port
export class IpcLibraryRepository implements LibraryRepository { /* chama o núcleo */ }

// app/main.tsx — composição
<LibraryProvider repository={new IpcLibraryRepository(...)} />
```

## 6. Entrada, saída e erros (backend)

- **Entradas** (`domain/inputs.ts`): comandos com `id?` opcional (ids
  determinísticos em testes) e campos opcionais quando fizer sentido.
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
| **LSP** | Todo adapter passa o mesmo teste de contrato? | adapter com comportamento divergente do port; método "não suportado" |
| **ISP** | Algum consumidor é obrigado a implementar o que não usa? | port agregado grande; adapter com métodos vazios/`throw` |
| **DIP** | O domínio conhece detalhe de infraestrutura? | `import` de driver/SDK em `domain`/`application`; instanciação direta de adapter fora de `app/` |

Regra prática: **se um `import` de tecnologia aparece em `domain/` ou
`application/`, a arquitetura foi violada** — reverter o `import` para um port.

## 9. Anti-padrões (evidência no legado myPlay)

| Anti-padrão | Onde apareceu | Correção aplicada/prevista |
| --- | --- | --- |
| Serviço com muitas responsabilidades | `backend/src/video/video.service.ts` (458 linhas) | quebrar em contextos (`media`, `progress`, `indexing`) |
| Entidade lógica acoplada a caminho físico | `video.entity.ts` (`filePath`) | `MediaFile` + UUID + caminho relativo |
| Exclusão remove arquivo físico | `video.service.ts` `remove()` (`unlink`) | catálogo apenas |
| Progresso dentro da entidade de conteúdo | `Video.lastPosition` | `playback_progress` por aula |
| Duas entidades para o mesmo conceito | `video/` e `modules/video/` | uma entidade canônica; remover código morto |
| Componente gigante com lógica | `client/.../VideoPlayer.tsx` (996 linhas) | extrair hooks/casos de uso/subcomponentes |
| Duas convenções para o mesmo conceito | backend por sufixo × frontend por pasta | modelo único em [`ARCHITECTURE.md`](ARCHITECTURE.md) |

## 10. Checklist de revisão (PR)

- [ ] Domínio não importa framework/infra (checar imports).
- [ ] Novo comportamento externo atrás de um port + adapter.
- [ ] Adapter alocado pela regra de contexto único × compartilhado
      ([`ARCHITECTURE.md`](ARCHITECTURE.md) §6).
- [ ] Casos de uso explícitos para operações com regra de negócio.
- [ ] Componentes/controllers finos; regra em `application`/`domain`.
- [ ] Sem dependência circular (`domain` não importa `application`; nada importa `app`).
- [ ] Erros mapeados para o domínio (sem vazamento do driver).
- [ ] Regra de ouro respeitada (nada de escrita em arquivos físicos).
- [ ] Testes cobrindo o comportamento
      (ver [`TESTING_STRATEGY.md`](TESTING_STRATEGY.md)).
