# Organização de pastas e nomenclatura — Midoteca

> Vale para **backend (`midoteca/`)** e **frontend (`client/`)**. Complementa
> [`ARCHITECTURE.md`](ARCHITECTURE.md), [`DDD_GUIDELINES.md`](DDD_GUIDELINES.md),
> [`CONVENTIONS.md`](CONVENTIONS.md) (padrões da comunidade + tooling + commits)
> e a diretriz em [`../AGENTS.md`](../AGENTS.md).

## 1. Princípios

1. **O nome e o diretório comunicam a responsabilidade.** Se não comunicam, o
   arquivo está no lugar errado (ou acumulando responsabilidades).
2. **Um conceito, um nome.** Não misture idiomas nem estilos no mesmo contexto.
3. **Cada tecnologia tem seu idioma de nomes** — documentado por stack abaixo.
4. **Convenção vence preferência.** Novo código segue o padrão existente do
   pacote; código legado migra quando tocado.

## 2. Regras gerais de casing

| Elemento | Convenção | Exemplo |
| --- | --- | --- |
| Arquivos (backend, TS) | `kebab-case` | `recursive-scanner.ts`, `library.repository.sqlite.ts` |
| Arquivos (frontend, componentes) | `PascalCase.tsx` | `CourseDetailsView.tsx` |
| Arquivos (frontend, hooks) | `camelCase` com prefixo `use` | `useMediaElementPlayback.ts` |
| Pastas | `kebab-case` (backend) · `camelCase`/`kebab-case` curto (frontend) | `core/`, `infra/` · `ui/`, `player/` |
| Tipos/Interfaces/Classes | `PascalCase` | `LibrarySource`, `SqliteMediaRepository` |
| Funções/variáveis | `camelCase` | `resolveDefaultDatabasePath` |
| Constantes | `UPPER_SNAKE_CASE` | `INDEXING_JOB_TYPES`, `MANIFEST_VERSION` |
| Colunas SQLite | `snake_case` | `relative_path`, `title_source` |
| Campos de domínio (TS) | `camelCase` | `relativePath`, `titleSource` |
| Sufixos de arquivo | ver tabela por stack | `.repository.sqlite.ts`, `.stories.tsx` |

## 3. Backend / núcleo (`midoteca/`) — TypeScript + Node + SQLite

### 3.1 Estrutura de pastas

```text
midoteca/
├── src/
│   ├── index.ts                 # ÚNICO composition root + API pública
│   ├── core/                    # domínio + aplicação (SEM infra)
│   │   └── <contexto>/          # library, media, courses, indexing, ...
│   └── infra/                   # adapters (SQLite, FS, events)
│       ├── sqlite/
│       │   ├── migrations/
│       │   └── repositories/
│       ├── fs/
│       └── events/
├── test/                        # *.spec.ts + helpers/
│   └── helpers/
├── scripts/                     # CLIs (migrate.cjs)
└── docs/                        # docs do backend
```

Regras:

- `core/` **nunca** importa `infra/` (inversão via ports).
- Cada contexto em `core/<contexto>/` expõe tudo por `index.ts` (barrel).
- Adapters concretos sempre em `infra/<tecnologia>/`.
- Nada de lógica de negócio em `infra/`; nada de driver em `core/`.

### 3.2 Sufixos de arquivo (backend)

| Sufixo | Papel | Exemplo |
| --- | --- | --- |
| `entities.ts` | entidades/tipos de domínio do contexto | `core/courses/entities.ts` |
| `inputs.ts` | comandos de entrada (create/update) | `core/courses/inputs.ts` |
| `repository.ts` | **port** de repositório do contexto | `core/library/repository.ts` |
| `ports.ts` | port(s) de aplicação (quando não é repositório) | `core/indexing/ports.ts` |
| `service.ts` | caso(s) de uso / serviço de aplicação | `core/library/service.ts` |
| `queries.ts` | leitura/consulta (read side) | `core/library/queries.ts` |
| `<nome>.ts` | unidade coesa (regra pura, helper de contexto) | `core/indexing/organization.ts` |
| `index.ts` | barrel do módulo | `core/indexing/index.ts` |
| `<contexto>.repository.sqlite.ts` | **adapter** de repositório | `media.repository.sqlite.ts` |
| `<nome>.store.sqlite.ts` | adapter de store (persistência auxiliar) | `indexing.store.sqlite.ts` |
| `NNNN-kebab-nome.ts` | migração versionada | `0002-indexing.ts` |
| `*.spec.ts` | teste (unit/integração/contrato) | `indexer.spec.ts` |

### 3.3 Convenções TypeScript

- `export function`/`export class` nomeados (evitar `export default` no backend).
- Tipos e funções públicas documentadas com JSDoc curto (o "porquê", não o "o quê").
- Imports por caminho relativo dentro do pacote; **não** criar aliases sem config.
- Validação de entrada na borda (`core/shared/validation.ts`).
- Sem `any`; use tipos do domínio. Erros do driver não vazam (ver `infra/sqlite/errors.ts`).

### 3.4 Migrações

- Nome do arquivo: `NNNN-kebab-nome.ts` (id crescente, zero-padded).
- `name` da migração **igual** ao nome do arquivo (sem `.ts`).
- Forward-only; cada migração em sua própria transação.
- Nunca editar uma migração já aplicada; crie uma nova.

### 3.5 Testes (backend)

- Local: `test/`, espelhando o sujeito (`<sujeito>.spec.ts`).
- Repositórios: `<contexto>.repository.spec.ts`.
- Helpers reutilizáveis em `test/helpers/` (`temp-db.ts`, `temp-library.ts`).
- Preferir adapters reais (SQLite/FS) a mocks (ver [`TESTING_STRATEGY.md`](TESTING_STRATEGY.md)).

### 3.6 Camada de transporte futura (NestJS)

Quando um transporte for adicionado, ele fica **fora** de `core/` e segue a
convenção NestJS, sem contaminar o domínio:

| Sufixo NestJS | Papel |
| --- | --- |
| `*.module.ts` | módulo Nest |
| `*.controller.ts` | rota HTTP/IPC (fino) |
| `*.service.ts` | orquestração do transporte (delega ao núcleo) |
| `*.dto.ts` | validação/transformação de entrada |
| `*.entity.ts` | **apenas** se houver ORM (não usar TypeORM no domínio) |

Regra: controller **não** acessa repositório de infraestrutura; chama os casos
de uso do núcleo.

## 4. Frontend (`client/`) — React + Vite + TypeScript

### 4.1 Estrutura de pastas

```text
client/src/
├── App.tsx                      # shell + navegação + sessão (PascalCase)
├── main.tsx / index.tsx         # bootstrap
├── config/                      # *.config.ts
├── types/                       # tipos de domínio/view-model
├── services/                    # ports + adapters + context
│   ├── contracts.ts             # ports (camelCase)
│   ├── mockData.ts              # adapter em memória
│   └── LibraryContext.tsx       # Provider (PascalCase, exporta componente)
├── components/
│   ├── <feature>/               # library, course, editor, home, player, pdf, search
│   ├── common/                  # compartilhados (Sidebar)
│   └── ui/                      # design system (átomos)
├── features/<feature>/stories/  # Storybook
└── __tests__/                   # testes
```

Alvo incremental: `domain/`, `application/`, `features/<ctx>/{components,hooks,stories}`
(ver [`../docs/REFACTORING_ROADMAP.md`](REFACTORING_ROADMAP.md)).

### 4.2 Sufixos de arquivo (frontend)

| Sufixo | Papel | Exemplo |
| --- | --- | --- |
| `PascalCase.tsx` | componente React | `CourseDetailsView.tsx` |
| `useXxx.ts` | hook (apresentação) | `useAutoHideControls.ts` |
| `*.stories.tsx` | story do Storybook | `LibraryView.stories.tsx` |
| `*.test.tsx` / `*.test.ts` | teste | `Library.test.tsx` |
| `*.config.ts` | configuração | `app.config.ts` |
| `contracts.ts` | ports/interfaces | `services/contracts.ts` |
| `types/<assunto>.ts` | tipos de domínio | `types/library.ts` |
| `PascalCaseContext.tsx` | React Context/Provider | `LibraryContext.tsx` |

### 4.3 Convenções React

- **Um componente por arquivo**, `PascalCase`, exportado nomeado.
- Views (telas) terminam com `View` (`LibraryView`, `CourseDetailsView`); átomos
  do design system **não** (`Button`, `Badge`).
- Hooks: `use` + descrição (`useMediaElementPlayback`), arquivo `camelCase`.
- Props tipadas com `interface <Nome>Props`.
- Componentes **não** acessam `mockData` nem HTTP/IPC: usam
  `useLibrary()` / `useLibraryRepository()`.
- Átomos reutilizáveis vão em `components/ui/`; específicos em `components/<feature>/`.
- Regra de tamanho (indicador, não lei): componente ~150 linhas, hook ~120.

### 4.4 Storybook e testes (frontend)

- Stories em `features/<feature>/stories/<Nome>.stories.tsx`, exportando
  `Default` e variações; título `Features/<Feature>/<Nome>`.
- Testes em `src/__tests__/<Nome>.test.tsx`, injetando repositório fake via
  `<LibraryProvider repository={…}>`.

## 5. "Onde eu coloco X?" (decision table)

| Quero criar… | Backend (`midoteca`) | Frontend (`client`) |
| --- | --- | --- |
| Entidade/tipo de domínio | `core/<ctx>/entities.ts` | `types/<assunto>.ts` |
| Comando de entrada | `core/<ctx>/inputs.ts` | — (props/hook) |
| Contrato (port) | `core/<ctx>/repository.ts` \| `ports.ts` | `services/contracts.ts` |
| Caso de uso | `core/<ctx>/service.ts` | `application/` (alvo) |
| Consulta/read | `core/<ctx>/queries.ts` | hook de apresentação |
| Regra pura | `core/<ctx>/<nome>.ts` | `domain/` (alvo) |
| Adapter de persistência | `infra/sqlite/repositories/*` | `services/*` (mock → IPC) |
| Acesso a FS | `infra/fs/*` | — (fica no núcleo) |
| Componente visual | — (fora do escopo) | `components/<feature>/` ou `ui/` |
| Hook | — | `components/<feature>/useXxx.ts` |
| Teste | `test/<sujeito>.spec.ts` | `src/__tests__/<Nome>.test.tsx` |
| Migração | `infra/sqlite/migrations/NNNN-*.ts` | — |

## 6. Regras que evitam bagunça

- **Barrel por módulo** (`index.ts` em `core/<ctx>/`) — importe do módulo, não de
  arquivos internos, fora do próprio módulo.
- **Sem pastas de um arquivo** só para "completar" um padrão.
- **Sem duplicação de conceito** (ex.: duas entidades `Video` no legado).
- **Sem código morto**: arquivo sem importador deve ser removido (ver roadmap P0).
- **Idioma único** por camada: código/tipos em inglês; textos de UI em pt-BR.
- **Não commitar** `dist/`, `storybook-static/`, `node_modules/`.

## 7. Enforcement

Automatizado por ferramentas (ver [`CONVENTIONS.md`](CONVENTIONS.md)):

- **Prettier** (`.prettierrc.json`) — `npm run format:check` sem divergências.
- **ESLint** (flat config por pacote) — `npm run lint` sem erros.
- **TypeScript** `strict` (`noUnusedLocals`, `noUnusedParameters`) —
  `npm run typecheck`.
- **Testes** — `npm test` (ver [`TESTING_STRATEGY.md`](TESTING_STRATEGY.md)).
- **CI** — `.github/workflows/ci.yml` roda o checklist completo em `push`/PR
  (ver [`CONVENTIONS.md`](CONVENTIONS.md) §9).
- **Commits** — [Conventional Commits](CONVENTIONS.md#6-commits--conventional-commits).
- Regra de dependência ([`DDD_GUIDELINES.md`](DDD_GUIDELINES.md) §3) é o item nº 1
  do checklist de PR (o lint não a detecta sozinho).
