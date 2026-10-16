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
- as mesmas práticas de DDD, Clean Architecture, Hexagonal e SOLID.

O que **pode** variar por lado é apenas o idioma de nomes de arquivo (kebab-case
no núcleo, `PascalCase` em componentes React — ver
[`CODE_ORGANIZATION.md`](CODE_ORGANIZATION.md) §2) e a tecnologia dos adapters.

## 2. As cinco áreas de um runtime

Todo runtime da Midoteca se organiza nas **mesmas cinco áreas**:

| Área | Papel | Pode conter regra de negócio? |
| --- | --- | --- |
| `app/` | **Composition root** e shell: único lugar que conhece adapters concretos e monta o grafo de dependências | Não (só montagem/injeção) |
| `core/` | **Kernel compartilhado** por todos os contextos: tipos/entidades canônicas, `ports` de fronteira do runtime, erros, validação, ids, clock, config | Só o que é **compartilhado**; regra específica mora no contexto |
| `modules/` | **Um diretório por bounded context** (fatia vertical com as quatro camadas) | Sim — é aqui que a regra vive |
| `shared/` | Reutilizável entre contextos **sem regra de negócio**: `ui`, `testing`, utilitários neutros | Não |
| `platform/` | **Adapters técnicos compartilhados por 2+ contextos**: persistência, filesystem, eventos, desktop/IPC, nuvem | Não (só tradução técnica) |

Regra de alocação de adapter (§6) é o que decide entre `modules/<ctx>/infrastructure`
e `platform/`.

## 3. As quatro camadas de um contexto

Dentro de cada contexto, as quatro camadas são sempre as mesmas — nos dois
runtimes:

| Camada | Responsabilidade | Exemplos (backend) | Exemplos (frontend) |
| --- | --- | --- | --- |
| `domain/` | Entidades, value objects, regras puras, domain services, **ports** do contexto. Zero IO, zero framework | `Course`, `LibrarySource`, `organize()` | tipos + regras puras (progresso, próxima aula, validação de edição) |
| `application/` | **Casos de uso** explícitos + DTOs de entrada/saída. Orquestra domínio e ports | `AddSource`, `RunScan`, `ToggleLessonCompletion` | `openLesson`, `saveCourse`, `persistPlaybackPosition` |
| `infrastructure/` | **Adapters** que implementam os ports do contexto (driven/driving) | `*.repository.sqlite.ts` do contexto | `mockLibraryRepository`, `libraryStorage`, futuro IPC/HTTP |
| `presentation/` | Superfície do runtime, **fina**: entrega e recebe, nunca decide | controllers/rotas IPC ou HTTP | componentes + hooks de apresentação |

Fluxo permitido:

```text
presentation ──► application ──► domain ◄── infrastructure
       (fino)          (casos de uso)   (regras)     (adapters)
```

## 4. Estrutura canônica (idêntica nos dois runtimes)

```text
<runtime>/src/
├── app/                          # COMPOSITION ROOT + shell (único ponto com adapters concretos)
│   ├── composition-root.ts       # backend: createMidoteca()/bootstrap
│   ├── App.tsx · main.tsx        # frontend: shell + entry
│   └── navigation/               # estado de interface/navegação (frontend)
├── core/                         # KERNEL COMPARTILHADO (não é um contexto)
│   ├── domain/                   # entidades/tipos canônicos usados por 2+ contextos
│   ├── ports/                    # contratos de fronteira do runtime (in/out)
│   └── errors.ts · ids.ts · validation.ts · clock.ts · config.ts · ...
├── modules/                      # UM DIRETÓRIO POR BOUNDED CONTEXT
│   └── <contexto>/
│       ├── domain/               # entidades, VOs, regras puras, services, ports.ts
│       ├── application/          # use-cases/<verbo>-<substantivo>.ts + dto.ts + services/
│       ├── infrastructure/       # adapters do contexto
│       └── presentation/         # BE: controllers/ · FE: components/ + hooks/
├── shared/                       # reutilizável, SEM regra de negócio
│   ├── ui/                       # design system (átomos)
│   └── testing/                  # helpers de teste compartilhados
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

## 5. Regras de dependência (executáveis)

Matriz permitida (✅ = pode importar):

| De ↓ / Para → | `core/` | `shared/` | `platform/` | `modules/*/domain` | `modules/*/application` | `modules/*/infrastructure` | `modules/*/presentation` | `app/` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `core/` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `shared/` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `platform/` | ✅ | ❌ | ✅ | ✅ (só ports) | ❌ | ❌ | ❌ | ❌ |
| `modules/*/domain` | ✅ | ❌ | ❌ | ✅ (mesmo ctx) | ❌ | ❌ | ❌ | ❌ |
| `modules/*/application` | ✅ | ❌ | ❌ | ✅ (mesmo ctx; de outro ctx: **só `domain/`** = contratos/tipos) | ✅ (mesmo ctx) | ❌ | ❌ | ❌ |
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
```

**Proibido em `domain/` e `application/` dos dois lados:**

| Runtime | Proibido |
| --- | --- |
| `midoteca/src/{core,modules/**/domain,modules/**/application}` | NestJS, TypeORM, SQLite/`better-sqlite3`, Express, Tauri, Axios, FFmpeg, React |
| `client/src/{core,modules/**/domain,modules/**/application}` | `react`, `react-dom`, `axios`, `@tauri-apps/*`, `localStorage`, `fetch` |

- Inversão de dependência: quem precisa de sistema externo depende de um **port**
  definido no domínio; o adapter concreto fica na infraestrutura.
- Nada depende de `app/`; `app/` depende de tudo.
- Nenhuma escrita em arquivo físico fora de adapters de `platform/fs`
  (regra de ouro: catálogo nunca apaga arquivo — ver §8).

## 6. Onde vive um adapter

| Situação | Onde fica |
| --- | --- |
| Implementa um port de **um único** contexto | `modules/<contexto>/infrastructure/` |
| Implementa um port consumido por **2+** contextos (conexão, migrações, scanner, bus) | `platform/<tecnologia>/` |
| Fala com tecnologia externa específica do runtime (IPC/Tauri, HTTP, nuvem) | `platform/desktop/`, `platform/cloud/` |
| É um dublê para teste/Storybook | `shared/testing/` ou o próprio `infrastructure/` do contexto (quando é um adapter de verdade em memória) |

Essa regra existe para evitar os dois extremos: adapter de contexto único virar
"platform" genérico (perde coesão) e infraestrutura compartilhada duplicada em
cada contexto.

## 7. Ports & Adapters — o mesmo fluxo nos dois lados

```text
port (domain)                 adapter (infrastructure)         composição (app)
─────────────                 ───────────────────────         ────────────────
LibraryRepository  ◄──implements──  SqliteLibraryRepository   createMidoteca()
LibraryRepository  ◄──implements──  MockLibraryService        <LibraryProvider repository={…}>
LibraryRepository  ◄──implements──  IpcLibraryRepository      (futuro)
```

Consequências obrigatórias:

1. **Todo** acesso a sistema externo (banco, fs, rede, IPC, tempo, aleatoriedade)
   entra por um port.
2. Trocar de tecnologia = escrever um adapter novo, **sem** tocar em domínio,
   casos de uso, controllers ou componentes.
3. Todo port tem **teste de contrato** que qualquer adapter precisa satisfazer
   (ver [`TESTING_STRATEGY.md`](TESTING_STRATEGY.md) §6).
4. Ports são **pequenos e segregados** (ISP): prefira vários contratos coesos a
   um "repository" agregado. O agregado é conveniência de composição, não o
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
arestas no backend — `library/application → indexing/domain` (ports `EventBus` e
`SourceProbe`) e `indexing/application → library/domain/ports`
(`LibraryRepository`). Nenhum adapter concreto cruza contexto.

## 9. SOLID aplicado

| Princípio | Como se aplica aqui | Exemplo real |
| --- | --- | --- |
| **S**RP | Uma razão para mudar por arquivo/camada; controller e componente são finos | `video.service.ts` do legado (458 linhas: CRUD + streaming + transcodificação + scan) foi substituído por contextos separados no núcleo |
| **O**CP | Novo comportamento = novo adapter/caso de uso, não `if` em código existente | trocar `MockLibraryService` por `IpcLibraryRepository` sem alterar consumidores; novo storage = novo adapter D1/S3 |
| **L**SP | Todo adapter satisfaz o contrato do port do mesmo jeito | teste de contrato do port roda contra **cada** adapter |
| **I**SP | Ports pequenos e coesos | subdividir contratos amplos (`LibraryCatalog`/`PlaybackState`/`ReadingState`/`PageProvider`/`Search`) |
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

### 12.1 Backend (`midoteca/`) — ✅ migrado (P5)

P5 executado sem mudança de comportamento: **72 arquivos movidos**, 92/92 testes
verdes, `typecheck`/`lint`/`format:check`/`build` em 0 e API pública preservada.

| Era | É agora | Observação |
| --- | --- | --- |
| `src/index.ts` (composition root + API) | `src/app/composition-root.ts` + `src/index.ts` (só API pública) | API pública estável |
| `src/core/shared/*` (10 arquivos de kernel) | `src/core/*` | + `core/domain/` para vocabulário compartilhado |
| `src/core/<ctx>/{entities,inputs}.ts` | `src/modules/<ctx>/domain/` | |
| `src/core/<ctx>/{repository,ports}.ts` | `src/modules/<ctx>/domain/ports.ts` | port junto do domínio do contexto |
| `src/core/<ctx>/{service,queries,indexer}.ts` | `src/modules/<ctx>/application/` | `services/`, `queries.ts`, `resource-governor.ts` |
| `src/core/<ctx>/<regra pura>.ts` | `src/modules/<ctx>/domain/` | ex.: `indexing/domain/organization.ts`, `manifest.ts` |
| `src/infra/sqlite/repositories/<ctx>.*.sqlite.ts` | `src/modules/<ctx>/infrastructure/` | adapter de um contexto |
| `src/infra/sqlite/{database,migrator,migrations}` | `src/platform/persistence/sqlite/` | compartilhado por 2+ contextos |
| `src/infra/fs/*` | `src/platform/fs/` | `FsSourceProbe` serve `library` **e** `indexing` |
| `src/infra/events/*` | `src/platform/events/` | compartilhado |
| `test/*.spec.ts` | mantido | espelha a árvore de `src/` (17 specs) |

Decisões tomadas durante a migração (não estavam no mapa acima):

- `library/queries.ts` foi **dividido**: read models + port `LibraryQueryStore` →
  `modules/library/domain/queries.ts`; `LibraryQueryService` →
  `modules/library/application/queries.ts`. O adapter implementa o port do
  **domínio**, sem depender de `application/`.
- `indexing/scanner.ts` foi **fundido** em `modules/indexing/domain/ports.ts`
  (um único `ports.ts` por contexto).
- `MediaType` e `LessonMediaRole` foram promovidos a `core/domain/` por serem
  usados por 2+ contextos (removeu as últimas arestas `domain → domain`).
- o barrel de cada contexto passou a reexportar **também** seu adapter, para que
  `app/` importe `modules/<ctx>` em vez de arquivos internos.
- o barrel de `platform/persistence/sqlite` **deixou** de reexportar adapters de
  contexto (o `platform` não depende de `modules/*/infrastructure`).

Pendências: casos de uso explícitos em `application/use-cases/`, `presentation/`
(transporte) e adapters acima do indicador (`course.repository.sqlite.ts` 430
linhas, `indexing.store.sqlite.ts` 421 linhas).

### 12.2 Frontend (`client/`) — verificado

| Atual | Canonônico | Observação |
| --- | --- | --- |
| `src/app/{App.tsx,main.tsx}` | igual ✅ | só falta isolar navegação em `app/navigation/` |
| `src/core/{domain,ports,config}` | igual ✅ | já é o kernel |
| `src/shared/ui/*` | igual ✅ | design system |
| `src/features/<ctx>/presentation/` | `src/modules/<ctx>/presentation/` | **renomear** `features/` → `modules/` (mecânico) |
| `src/features/<ctx>/application/*` (hooks React) | separar: **casos de uso** em `application/`; **hooks de apresentação** em `presentation/hooks/` | hoje há hooks de apresentação em `application/` |
| `src/features/<ctx>/domain/` | criar **quando houver regra pura** | ainda ausente em todos os contextos |
| `src/features/library/infrastructure/*` | igual ✅ | único contexto com infraestrutura hoje |
| `src/__tests__/*.test.tsx` | `test/**` espelhando a árvore | mover (cheap) |
| `src/legacy/`, `src/stories/` | **remover** | código morto (fora do build) |

Prioridades e passos em [`REFACTORING_ROADMAP.md`](REFACTORING_ROADMAP.md).

## 13. Composition roots

| Runtime | Ponto de entrada | Papel |
| --- | --- | --- |
| Backend | `midoteca/src/app/composition-root.ts` → `createMidoteca(options)` (reexportado por `src/index.ts`) | abre SQLite, aplica migrações, injeta adapters, publica a API |
| Frontend | `client/src/app/main.tsx` → `<LibraryProvider repository={…}>` | injeta o `LibraryRepository` (mock hoje, IPC depois) |

Regra: **nenhum outro arquivo monta dependências concretas.** Isso é o que
permite trocar a origem dos dados (mock → IPC/HTTP) sem alterar consumidores.

## 14. Fronteira entre os runtimes

```text
client/ (presentation + application)          midoteca/ (application + domain)
   useLibrary() ──► LibraryRepository ──► [adapter de platform/desktop | platform/http] ──► createMidoteca()
        (port no FE)                          (infra do FE)                                (casos de uso + domínio)
```

- O contrato do FE (`client/src/core/ports/libraryRepository.ts`) é o **port**; o
  núcleo fornece os casos de uso; o adapter que liga os dois é infraestrutura do
  frontend e ainda **não existe** (ver P3 do roadmap de refatoração).
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
- [ ] `domain`/`application` não importam framework nem infraestrutura (§5).
- [ ] Novo acesso externo entrou por um port + adapter (§7).
- [ ] Adapter alocado pela regra do §6 (contexto único × compartilhado).
- [ ] Nenhuma camada vazia foi criada "para seguir o padrão" (§10).
- [ ] Ports permanecem pequenos; nenhum contrato inchou (§9, ISP).
- [ ] Regra de ouro respeitada (catálogo não toca arquivo físico) (§8).
- [ ] Testes de contrato do port continuam válidos para o novo adapter.
- [ ] Documentação derivada atualizada quando a regra mudou.
