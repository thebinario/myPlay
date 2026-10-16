# Organização de pastas e nomenclatura — Midoteca

> Vale para **backend (`midoteca/`)** e **frontend (`client/`)**. As pastas de
> camada são **as mesmas** nos dois runtimes (ver
> [`ARCHITECTURE.md`](ARCHITECTURE.md) §2–§4); o que muda é o idioma dos nomes de
> arquivo (§4). Complementa [`DDD_GUIDELINES.md`](DDD_GUIDELINES.md),
> [`CONVENTIONS.md`](CONVENTIONS.md) (tooling + commits) e a diretriz em
> [`../AGENTS.md`](../AGENTS.md).

## 1. Princípios

1. **O nome e o diretório comunicam a responsabilidade.** Se não comunicam, o
   arquivo está no lugar errado (ou acumulando responsabilidades).
2. **Mesma arquitetura, mesmas pastas.** Um conceito não pode ter dois lugares
   diferentes nos dois runtimes.
3. **Cada tecnologia tem seu idioma de nomes de arquivo** (§4), só isso varia.
4. **Nada de nomes guarda-chuva.** `dto.ts`, `inputs.ts` e `queries.ts` (com
   várias operações) não existem: cada arquivo diz o que é (`repositories.ts`,
   `contracts.ts`, `use-cases/`, `queries/`).
5. **Convenção vence preferência.** Novo código segue o padrão existente do
   pacote; código legado migra quando tocado.

## 2. Estrutura canônica (idêntica nos dois runtimes)

```text
<runtime>/src/
├── app/                          # composition root + shell (único ponto com adapters concretos)
├── core/                         # kernel compartilhado (não é um contexto)
│   ├── domain/                   # tipos canônicos usados por 2+ contextos
│   ├── contracts/                # contratos de fronteira do runtime
│   └── errors.ts · ids.ts · validation.ts · clock.ts · config.ts · ...
├── modules/<contexto>/           # fatia vertical por bounded context
│   ├── domain/                   # entities.ts · types.ts · errors.ts · events.ts · repositories.ts · contracts.ts · <regra>.ts
│   ├── application/              # use-cases/ · queries/ · dependencies.ts · services/
│   ├── infrastructure/           # adapters do contexto
│   └── presentation/             # BE: controllers/ · FE: views/ · components/ · providers/ · hooks/ · stories/
├── shared/                       # reutilizável, sem regra de negócio
│   ├── ui/{components,stories}/  # design system
│   ├── providers/                # seams de DI (Context) usados por 2+ contextos
│   └── testing/                  # helpers/setup de teste
└── platform/                     # adapters técnicos compartilhados por 2+ contextos
    ├── persistence/ · fs/ · events/ · desktop/ · cloud/
```

## 3. Regras estruturais

- **Barrel por contexto** (`index.ts` na raiz do contexto): importe de
  `modules/<ctx>`, não de arquivos internos de outro contexto.
- **`domain/` não conhece `application/`, `infrastructure/` nem framework.**
- **`application/` conhece o próprio `domain/`, o `core/` e o `domain/` de outro
  contexto** (só contratos/tipos) — **nunca** `application/`, `infrastructure/`
  ou `presentation/` de outro contexto.
- **`presentation/` é fino** e só conversa com o `application/` do próprio
  contexto, `core/contracts/`, `shared/ui/` e `shared/providers/` — **nunca** a
  `presentation/` de outro contexto nem `infrastructure/`.
- **DI entre contextos** vive em `shared/providers/` (o Context + os hooks de
  consumo, sem regra de negócio); a injeção do adapter concreto fica em `app/`.
- **Adapters**: um contexto só → `modules/<ctx>/infrastructure/`; 2+ contextos →
  `platform/<tecnologia>/` ([`ARCHITECTURE.md`](ARCHITECTURE.md) §6).
- **Sem pastas de um arquivo** só para "completar" um padrão.
- **Sem código morto**: arquivo sem importador deve ser removido.
- **`test/` espelha `src/`** (fora do código de produção).

## 4. Nomes por tecnologia

### 4.1 Casing geral

| Elemento | Convenção | Exemplo |
| --- | --- | --- |
| Arquivos — backend (`midoteca/`) | `kebab-case.ts` | `recursive-scanner.ts`, `add-source.ts` |
| Arquivos — frontend, componentes | `PascalCase.tsx` | `CourseDetailsView.tsx` |
| Arquivos — frontend, hooks | `camelCase` com prefixo `use` | `useMediaElementPlayback.ts` |
| Pastas de camada | sempre `domain` · `application` · `infrastructure` · `presentation` · `platform` · `core` · `shared` · `modules` | `client/` já usa `modules/` |
| Tipos/Interfaces/Classes | `PascalCase` | `LibrarySource`, `SqliteMediaRepository` |
| Funções/variáveis | `camelCase` | `resolveDefaultDatabasePath` |
| Constantes | `UPPER_SNAKE_CASE` | `INDEXING_JOB_TYPES`, `MANIFEST_VERSION` |
| Colunas SQLite | `snake_case` | `relative_path`, `title_source` |
| Campos de domínio (TS) | `camelCase` | `relativePath`, `titleSource` |

### 4.2 Backend (`midoteca/`) — arquivos canônicos por camada

| Arquivo | Camada | Papel | Exemplo |
| --- | --- | --- | --- |
| `<ctx>/domain/entities.ts` | domain | entidades + value objects | `modules/courses/domain/entities.ts` |
| `<ctx>/domain/types.ts` | domain | tipos/enums de domínio (não-entidade) | `modules/indexing/domain/types.ts` |
| `<ctx>/domain/errors.ts` · `events.ts` | domain | erros e eventos do contexto | `modules/indexing/domain/events.ts` |
| `<ctx>/domain/repositories.ts` | domain | **contrato de repositório + seus comandos** (`CreateX`/`UpdateX`) **+ contrato de leitura (store)** | `modules/library/domain/repositories.ts` |
| `<ctx>/domain/contracts.ts` | domain | demais **contratos** externos (scanner, probe, bus) | `modules/indexing/domain/contracts.ts` |
| `<ctx>/domain/read-models.ts` | domain | **read models** (projeções) referenciados por um contrato de leitura | `modules/library/domain/read-models.ts` |
| `<ctx>/domain/<regra>.ts` | domain | regra pura / domain service | `modules/indexing/domain/organization.ts` |
| `<ctx>/application/use-cases/<verbo>-<sub>.ts` | application | caso de uso de **escrita** + input/output | `modules/library/application/use-cases/add-source.ts` |
| `<ctx>/application/queries/<verbo>-<sub>.ts` | application | **consulta** (operação de leitura) — delega ao store do `domain/` | `modules/library/application/queries/list-courses.ts` |
| `<ctx>/application/dependencies.ts` | application | deps compartilhadas por 2+ operações | `modules/courses/application/dependencies.ts` |
| `<ctx>/application/services/<nome>.ts` | application | orquestração/fachada de casos de uso | `modules/indexing/application/services/indexer.ts` |
| `<ctx>/infrastructure/<ctx>.repository.sqlite.ts` | infrastructure | adapter de repositório | `modules/media/infrastructure/media.repository.sqlite.ts` |
| `<ctx>/infrastructure/<ctx>.query.sqlite.ts` | infrastructure | adapter do store de leitura | `modules/library/infrastructure/library.query.sqlite.ts` |
| `<ctx>/presentation/<nome>.controller.ts` | presentation | controller/rota (fino) | `modules/library/presentation/library.controller.ts` |
| `platform/persistence/sqlite/*` | platform | conexão, migrações | `database.ts`, `migrator.ts`, `migrations/NNNN-*.ts` |
| `platform/fs/*` · `platform/events/*` | platform | adapters compartilhados | `source-probe.ts`, `typed-event-bus.ts` |
| `index.ts` | — | barrel do contexto / API pública | `modules/library/index.ts` |
| `*.spec.ts` | — | teste (unit/integração/contrato) | `test/indexer.spec.ts` |

Convenções TypeScript (backend):

- `export function`/`export class` nomeados (evitar `export default`).
- JSDoc curto no público: o **porquê**, não o "o quê".
- Imports por caminho relativo dentro do pacote; **não** criar aliases sem config.
- Sem `any`; use tipos do domínio. Erros do driver não vazam.

### 4.3 Frontend (`client/`) — arquivos canônicos por camada

| Arquivo | Camada | Papel | Exemplo |
| --- | --- | --- | --- |
| `presentation/views/<Nome>View.tsx` | presentation | tela (fina) | `modules/library/presentation/views/LibraryView.tsx` |
| `presentation/components/<Nome>.tsx` | presentation | subcomponente/átomo local | `modules/player/presentation/components/PlayerSurface.tsx` |
| `presentation/providers/<Nome>Provider.tsx` | presentation | React Context/Provider **local ao contexto** | `modules/<ctx>/presentation/providers/XProvider.tsx` |
| `shared/providers/<nome>.tsx` | shared | seam de DI (Context + hooks de consumo) usado por 2+ contextos | `shared/providers/library-repository.tsx` |
| `presentation/hooks/useXxx.ts` | presentation | **hook de apresentação** | `presentation/hooks/useAutoHideControls.ts` |
| `presentation/stories/<Nome>.stories.tsx` | presentation | story do Storybook | `presentation/stories/MiniPlayer.stories.tsx` |
| `application/use-cases/<verbo>-<sub>.ts` | application | **caso de uso** (sem React) | `modules/courses/application/use-cases/save-course.ts` |
| `domain/<nome>.ts` | domain | entidades/regras puras | `modules/player/domain/progress.ts` |
| `infrastructure/<nome>.ts` | infrastructure | adapter (mock/persistência/IPC) | `modules/library/infrastructure/mock-library-repository.ts` |
| `core/contracts/<nome>.ts` | core | contrato de fronteira do runtime | `core/contracts/library-repository.ts` |
| `*.config.ts` | core | configuração | `core/config/app.config.ts` |
| `shared/ui/components/<Atom>.tsx` | shared | átomo do design system | `shared/ui/components/Button.tsx` |
| `shared/ui/stories/<Atom>.stories.tsx` | shared | story do átomo | `shared/ui/stories/Button.stories.tsx` |
| `*.test.tsx` / `*.test.ts` | — | teste | `test/library.test.tsx` |

Convenções React:

- **Um componente por arquivo**, `PascalCase`, exportado nomeado.
- Views terminam com `View`; átomos do design system **não** (`Button`, `Badge`).
- Subdivisão de `presentation/`: `views/` (telas), `components/` (peças do
  contexto), `providers/` (Context **local** ao contexto), `hooks/`, `stories/`
  — **só as que tiverem conteúdo**. Provider/Context consumido por **2+**
  contextos vai para `shared/providers/` (ver §3).
- Props tipadas com `interface <Nome>Props`.
- Componentes **não** acessam repositório, HTTP/IPC ou `localStorage`: usam
  `useLibrary()` / `useLibraryRepository()`.
- Átomos reutilizáveis em `shared/ui/components/`; específicos em
  `modules/<ctx>/presentation/components/`.
- **Hook não contém regra de negócio**: cálculo/invariante vai para `domain/`;
  passo de aplicação vai para `application/use-cases/`.
- Indicadores de tamanho: componente ~150 linhas, hook ~120
  ([`ARCHITECTURE.md`](ARCHITECTURE.md) §11).

### 4.4 Storybook

- Stories em `presentation/stories/<Nome>.stories.tsx` (contexto) e
  `shared/ui/stories/<Atom>.stories.tsx` (design system), exportando `Default` e
  variações de estado (`Loading`, `Empty`, `Error`) quando pertinentes; título
  `Modules/<Contexto>/<Nome>` (contexto) ou `Shared/UI/<Nome>` (design system).

## 5. Migrações (backend)

- Nome do arquivo: `NNNN-kebab-nome.ts` (id crescente, zero-padded).
- `name` da migração **igual** ao nome do arquivo (sem `.ts`).
- Forward-only; cada migração em sua própria transação.
- Nunca editar uma migração já aplicada; crie uma nova.

## 6. "Onde eu coloco X?" (decision table)

| Quero criar… | Backend (`midoteca/`) | Frontend (`client/`) |
| --- | --- | --- |
| Entidade/value object | `modules/<ctx>/domain/entities.ts` | `modules/<ctx>/domain/<assunto>.ts` |
| Tipo/enum de domínio | `modules/<ctx>/domain/types.ts` | `modules/<ctx>/domain/<assunto>.ts` |
| Tipo usado por 2+ contextos | `core/domain/*` | `core/domain/*` |
| Contrato de repositório + comandos (`CreateX`) | `modules/<ctx>/domain/repositories.ts` | `modules/<ctx>/domain/repositories.ts` |
| Outro contrato externo (scanner, probe, bus) | `modules/<ctx>/domain/contracts.ts` | `modules/<ctx>/domain/contracts.ts` |
| Contrato de fronteira do runtime | `core/contracts/*` | `core/contracts/*` |
| Caso de uso (**escrita**) + seu input/output | `modules/<ctx>/application/use-cases/<verbo>-<sub>.ts` | `modules/<ctx>/application/use-cases/<verbo>-<sub>.ts` |
| Consulta (**leitura**) — operação que delega ao store | `modules/<ctx>/application/queries/<verbo>-<sub>.ts` | `modules/<ctx>/application/queries/<verbo>-<sub>.ts` |
| Read model (projeção) de um contrato de leitura | `modules/<ctx>/domain/read-models.ts` | `modules/<ctx>/domain/read-models.ts` |
| Contrato do store de leitura | `modules/<ctx>/domain/repositories.ts` | — |
| Dependências comuns a 2+ operações | `modules/<ctx>/application/dependencies.ts` | `modules/<ctx>/application/dependencies.ts` |
| Orquestração de casos de uso | `modules/<ctx>/application/services/*` | `modules/<ctx>/application/services/*` |
| Regra pura | `modules/<ctx>/domain/*` | `modules/<ctx>/domain/*` |
| Adapter do contexto | `modules/<ctx>/infrastructure/*` | `modules/<ctx>/infrastructure/*` |
| Adapter compartilhado (2+ ctx) | `platform/<tech>/*` | `platform/<tech>/*` |
| Acesso a FS | `platform/fs/*` ou `modules/<ctx>/infrastructure/*` | — (fica no núcleo) |
| Controller/rota | `modules/<ctx>/presentation/*.controller.ts` | — |
| Componente visual (tela) | — | `modules/<ctx>/presentation/views/<Nome>View.tsx` |
| Subcomponente/átomo do contexto | — | `modules/<ctx>/presentation/components/<Nome>.tsx` |
| Átomo do design system | — | `shared/ui/components/<Atom>.tsx` |
| Provider/Context local | — | `modules/<ctx>/presentation/providers/<Nome>Provider.tsx` |
| Seam de DI (Provider consumido por 2+ contextos) | — | `shared/providers/<nome>.tsx` |
| Hook de apresentação | — | `modules/<ctx>/presentation/hooks/useXxx.ts` |
| Story | — | `modules/<ctx>/presentation/stories/<Nome>.stories.tsx` ou `shared/ui/stories/<Atom>.stories.tsx` |
| Composição/injeção | `app/composition-root.ts` | `app/main.tsx` |
| Teste | `test/<espelho>.spec.ts` | `test/<espelho>.test.tsx` |
| Migração | `platform/persistence/sqlite/migrations/NNNN-*.ts` | — |

## 7. Enforcement

Automatizado (ver [`CONVENTIONS.md`](CONVENTIONS.md)):

- **Prettier** — `npm run format:check` sem divergências.
- **ESLint** (flat config por pacote) — `npm run lint` sem erros.
- **TypeScript `strict`** — `npm run typecheck`.
- **Testes** — `npm test`.
- **CI** — `.github/workflows/ci.yml` no checklist completo.
- **Commits** — [Conventional Commits](CONVENTIONS.md#6-commits--conventional-commits).

Não automatizado (checagem manual obrigatória no PR): **regras de dependência**
([`ARCHITECTURE.md`](ARCHITECTURE.md) §5, com os `grep` prontos) e **alocação de
adapters** (§6 do mesmo documento). O lint não detecta nenhum dos dois sozinho.
