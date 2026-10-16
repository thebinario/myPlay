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
4. **Convenção vence preferência.** Novo código segue o padrão existente do
   pacote; código legado migra quando tocado.

## 2. Estrutura canônica (idêntica nos dois runtimes)

```text
<runtime>/src/
├── app/                          # composition root + shell (único ponto com adapters concretos)
├── core/                         # kernel compartilhado (não é um contexto)
│   ├── domain/                   # tipos canônicos usados por 2+ contextos
│   ├── ports/                    # contratos de fronteira do runtime
│   └── errors.ts · ids.ts · validation.ts · clock.ts · config.ts · ...
├── modules/<contexto>/           # fatia vertical por bounded context
│   ├── domain/                   # entidades, VOs, regras puras, services, ports.ts
│   ├── application/              # use-cases/ · dto.ts · services/
│   ├── infrastructure/           # adapters do contexto
│   └── presentation/             # BE: controllers/ · FE: components/ + hooks/
├── shared/                       # reutilizável, sem regra de negócio (ui/, testing/)
└── platform/                     # adapters técnicos compartilhados por 2+ contextos
    ├── persistence/ · fs/ · events/ · desktop/ · cloud/
```

## 3. Regras estruturais

- **Barrel por contexto** (`index.ts` na raiz do contexto): importe de
  `modules/<ctx>`, não de arquivos internos de outro contexto.
- **`domain/` não conhece `application/`, `infrastructure/` nem framework.**
- **`application/` conhece apenas o próprio `domain/` e o `core/`.**
- **`presentation/` é fino** e só conversa com o `application/` do próprio
  contexto.
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

### 4.2 Backend (`midoteca/`) — sufixos

| Sufixo | Camada | Papel | Exemplo |
| --- | --- | --- | --- |
| `<ctx>/domain/entities.ts` | domain | entidades/tipos do contexto | `modules/courses/domain/entities.ts` |
| `<ctx>/domain/inputs.ts` | domain | comandos de entrada (create/update) | `modules/courses/domain/inputs.ts` |
| `<ctx>/domain/ports.ts` | domain | **ports** do contexto | `modules/library/domain/ports.ts` |
| `<ctx>/domain/<nome>.ts` | domain | regra pura / domain service | `modules/indexing/domain/organization.ts` |
| `<ctx>/application/use-cases/<verbo>-<sub>.ts` | application | caso de uso explícito | `modules/library/application/use-cases/add-source.ts` |
| `<ctx>/application/dto.ts` | application | entrada/saída do caso de uso | `modules/library/application/dto.ts` |
| `<ctx>/application/services/<nome>.ts` | application | orquestração de casos de uso | `modules/indexing/application/services/scan-runner.ts` |
| `<ctx>/application/queries.ts` | application | read side (consultas) | `modules/library/application/queries.ts` |
| `<ctx>/infrastructure/<ctx>.repository.sqlite.ts` | infrastructure | adapter de repositório | `modules/media/infrastructure/media.repository.sqlite.ts` |
| `<ctx>/infrastructure/<nome>.store.sqlite.ts` | infrastructure | adapter de store auxiliar | `modules/indexing/infrastructure/indexing.store.sqlite.ts` |
| `<ctx>/presentation/<nome>.controller.ts` | presentation | controller/rota (fino) | `modules/library/presentation/library.controller.ts` |
| `platform/persistence/sqlite/*` | platform | conexão, migrações | `database.ts`, `migrator.ts`, `migrations/NNNN-*.ts` |
| `platform/fs/*` · `platform/events/*` | platform | adapters compartilhados | `recursive-scanner.ts`, `typed-event-bus.ts` |
| `index.ts` | — | barrel do contexto / API pública | `modules/library/index.ts` |
| `*.spec.ts` | — | teste (unit/integração/contrato) | `test/indexer.spec.ts` |

Convenções TypeScript (backend):

- `export function`/`export class` nomeados (evitar `export default`).
- JSDoc curto no público: o **porquê**, não o "o quê".
- Imports por caminho relativo dentro do pacote; **não** criar aliases sem config.
- Sem `any`; use tipos do domínio. Erros do driver não vazam.

### 4.3 Frontend (`client/`) — sufixos

| Sufixo | Camada | Papel | Exemplo |
| --- | --- | --- | --- |
| `presentation/<Nome>View.tsx` | presentation | tela (fina) | `modules/library/presentation/LibraryView.tsx` |
| `presentation/<Nome>.tsx` | presentation | subcomponente/átomo local | `presentation/MiniPlayer.tsx` |
| `presentation/hooks/useXxx.ts` | presentation | **hook de apresentação** | `presentation/hooks/useAutoHideControls.ts` |
| `application/use-cases/<verbo>-<sub>.ts` | application | **caso de uso** (sem React) | `modules/courses/application/use-cases/save-course.ts` |
| `domain/<nome>.ts` | domain | entidades/regras puras | `modules/player/domain/progress.ts` |
| `infrastructure/<nome>.ts` | infrastructure | adapter (mock/persistência/IPC) | `modules/library/infrastructure/mock-library-repository.ts` |
| `*.stories.tsx` | presentation | story do Storybook | `LibraryView.stories.tsx` |
| `useXxx.ts` (kernel/hook reutilizável) | presentation/shared | hook genérico | `shared/ui/useXxx.ts` |
| `*.config.ts` | core | configuração | `core/config/app.config.ts` |
| `*.ts` (ports) | core | contratos | `core/ports/library-repository.ts` |
| `PascalCase.tsx` (Provider) | presentation | React Context/Provider | `modules/library/presentation/LibraryProvider.tsx` |
| `*.test.tsx` / `*.test.ts` | — | teste | `test/library.test.tsx` |

Convenções React:

- **Um componente por arquivo**, `PascalCase`, exportado nomeado.
- Views terminam com `View`; átomos do design system **não** (`Button`, `Badge`).
- Props tipadas com `interface <Nome>Props`.
- Componentes **não** acessam repositório, HTTP/IPC ou `localStorage`: usam
  `useLibrary()` / `useLibraryRepository()`.
- Átomos reutilizáveis em `shared/ui/`; específicos em
  `modules/<ctx>/presentation/`.
- **Hook não contém regra de negócio**: cálculo/invariante vai para `domain/`;
  passo de aplicação vai para `application/use-cases/`.
- Indicadores de tamanho: componente ~150 linhas, hook ~120
  ([`ARCHITECTURE.md`](ARCHITECTURE.md) §11).

### 4.4 Storybook

- Stories colocalizadas com o componente
  (`modules/<ctx>/presentation/<Nome>.stories.tsx`), exportando `Default` e
  variações de estado (`Loading`, `Empty`, `Error`) quando pertinentes; título
  `Modules/<Contexto>/<Nome>`.

## 5. Migrações (backend)

- Nome do arquivo: `NNNN-kebab-nome.ts` (id crescente, zero-padded).
- `name` da migração **igual** ao nome do arquivo (sem `.ts`).
- Forward-only; cada migração em sua própria transação.
- Nunca editar uma migração já aplicada; crie uma nova.

## 6. "Onde eu coloco X?" (decision table)

| Quero criar… | Backend (`midoteca/`) | Frontend (`client/`) |
| --- | --- | --- |
| Entidade/tipo do contexto | `modules/<ctx>/domain/entities.ts` | `modules/<ctx>/domain/<assunto>.ts` |
| Tipo usado por 2+ contextos | `core/domain/*` | `core/domain/*` |
| Comando de entrada | `modules/<ctx>/domain/inputs.ts` | props do caso de uso / hook |
| Contrato (port) do contexto | `modules/<ctx>/domain/ports.ts` | `modules/<ctx>/domain/ports.ts` |
| Contrato de fronteira do runtime | `core/ports/*` | `core/ports/*` |
| Caso de uso | `modules/<ctx>/application/use-cases/*` | `modules/<ctx>/application/use-cases/*` |
| Orquestração de casos de uso | `modules/<ctx>/application/services/*` | `modules/<ctx>/application/*` |
| Consulta/read side | `modules/<ctx>/application/queries.ts` | `application/` do contexto |
| Regra pura | `modules/<ctx>/domain/*` | `modules/<ctx>/domain/*` |
| Adapter do contexto | `modules/<ctx>/infrastructure/*` | `modules/<ctx>/infrastructure/*` |
| Adapter compartilhado (2+ ctx) | `platform/<tech>/*` | `platform/<tech>/*` |
| Acesso a FS | `platform/fs/*` ou `modules/<ctx>/infrastructure/*` | — (fica no núcleo) |
| Controller/rota | `modules/<ctx>/presentation/*.controller.ts` | — |
| Componente visual | — | `modules/<ctx>/presentation/` ou `shared/ui/` |
| Hook de apresentação | — | `modules/<ctx>/presentation/hooks/useXxx.ts` |
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
