# Estratégia de Testes — Midoteca

> Vale para **backend (`midoteca/`)** e **frontend (`client/`)**. Derivado de
> [`ARCHITECTURE.md`](ARCHITECTURE.md) (camadas e regras) e
> [`DDD_GUIDELINES.md`](DDD_GUIDELINES.md) (padrões táticos). Regra permanente em
> [`../AGENTS.md`](../AGENTS.md).

## 1. Princípios

1. **TDD** para código novo: Red → Green → Refactor.
2. **Testes de caracterização** antes de refatorar código legado.
3. **Sem mocks desnecessários**: prefira os adaptadores reais. SQLite real em
   arquivo temporário > dublê; árvore de arquivos real > fs falso.
4. Refatorar em passos pequenos, rodando os testes a cada mudança significativa.
5. **Equivalência de comportamento** preservada, salvo mudança funcional pedida.
6. **Um teste por camada, no formato da camada** (§4) — não testar detalhe de
   implementação onde o comportamento é o contrato.

## 2. Local e nome dos testes (canônico)

| Aspecto | Regra |
| --- | --- |
| Local | **`test/` na raiz do pacote, espelhando a árvore de `src/`** — fora do código de produção |
| Backend | `test/<espelho>.spec.ts` (ex.: `test/indexer.spec.ts`) ✅ já canônico |
| Frontend | `test/<espelho>.test.tsx` (migrando de `client/src/__tests__/`) |
| Helpers | `test/helpers/` (`temp-db.ts`, `temp-library.ts`) |
| Stories | colocalizadas no `presentation/` do contexto (`*.stories.tsx`) — contam como teste visual/contrato de UI |
| Teste de contrato | `test/contracts/<contrato>.spec.ts`, rodado contra **cada** adapter |

## 3. Pirâmide de testes

```text
        ▲  E2E / Storybook (visual + fluxo)          — poucos, críticos
       ╱ ╲ Componente (React Testing Library)         — telas e interações
      ╱   ╲ Contrato (contrato ↔ adapter)              — garante o contrato
     ╱     ╲ Integração (SQLite/FS reais)              — persistência e IO
    ╱───────╲ Unitário (domínio e casos de uso)        — muitos, rápidos
```

## 4. O que testar em cada camada

| Camada | Objetivo do teste | Backend | Frontend |
| --- | --- | --- | --- |
| `domain/` | invariantes e regras puras, sem IO | `organization`, `manifest`, `resource-governor`, validação | cálculo de progresso, próxima aula, validação de edição |
| `application/` | caso de uso com contratos dublados determinísticos | `AddSource`, `RunScan`, `ToggleLessonCompletion` | `openLesson`, `saveCourse`, `persistPlaybackPosition` |
| `infrastructure/` | adapter real contra o contrato | repositórios SQLite (arquivo real), scanner FS (árvore temp) | `MockLibraryService`, `libraryStorage`; futuro `IpcLibraryRepository` |
| `presentation/` | comportamento visível ao usuário | controller: status/erro/validação de entrada | `@testing-library/react` (papéis/labels), Storybook |
| fronteira runtime | adapter ↔ núcleo, com dados reais | — | adapter IPC/HTTP contra o núcleo `midoteca` |

Regra do `application/`: caso de uso é testado **sem** framework — recebe contratos
(inclusive dublês em memória) e devolve valor. Se um caso de uso só pode ser
testado com React/HTTP, ele está na camada errada.

## 5. Backend (`midoteca/`)

**Stack**: Vitest. Specs em `midoteca/test/**/*.spec.ts`.

Regras:

- Bancos **reais em arquivo** (não `:memory:`) para exercitar WAL, persistência
  entre reaberturas e integridade referencial. Helper: `test/helpers/temp-db.ts`.
- Árvores de arquivos reais em diretório temporário para scanner/indexer. Helper:
  `test/helpers/temp-library.ts`.
- Sem mocks do driver SQLite. Sem PostgreSQL, sem internet, sem mídia real.
- Todo comportamento de domínio tem teste; `IndexingStore` é testado com o
  SQLite real.

Comandos:

```bash
cd midoteca
npm test            # vitest run
npm run typecheck   # tsc --noEmit
npm run build       # tsc -p tsconfig.build.json
npm run db:migrate  # aplica migrações (requer build)
```

Estado atual **verificado**: **19 arquivos de spec** em `test/`, com **116 testes
verdes** (`vitest run`) — domínio, repositórios SQLite, migrações/idempotência,
integridade referencial, scanner, organização, manifesto, indexação incremental,
títulos, queries, source service e governor. Reconferir rodando `npm test` antes
de citar o número.

Exemplo de teste de integração real:

```ts
const temp = createTempDatabase();
const app = createMidoteca({ databaseFile: temp.file });
const source = await app.sources.addSource({ rootPath: library.root });
const summary = await app.indexer.runScan({ sourceId: source.id });
expect(summary.created).toBe(6);
```

## 6. Frontend (`client/`)

**Stack**: Vitest + `@testing-library/react` + jsdom + Storybook.
Specs hoje em `client/src/__tests__/*.test.tsx` (**17 arquivos / 246 testes**) —
**alvo**: `client/test/**` espelhando a árvore (§2).

Regras:

- Injetar um repositório fake via `<LibraryProvider repository={fake}>` — nunca
  depender do mock global dentro do teste.
- Testar comportamento visível ao usuário (papéis/labels), não detalhes internos.
- Regras puras e casos de uso têm testes unitários próprios, sem React.
- Stories do Storybook servem de teste visual/contrato de UI.

Comandos:

```bash
cd client
npm test            # vitest run
npm run test:watch
npm run typecheck
npm run build       # tsc && vite build
npm run storybook   # catálogo visual
```

## 7. Testes de caracterização (legado)

Ao tocar código legado (ex.: sobras do CRA em `client/src/legacy/` e
`client/src/stories/`):

1. Identificar o comportamento atual observável.
2. Escrever testes que **congelam** esse comportamento (mesmo que "feio").
3. Refatorar em passos pequenos, mantendo os testes verdes.
4. Só então alterar comportamento, com teste novo explícito.

O legado `backend/` (NestJS/PostgreSQL) **não** recebe testes: está descartado
como base de código (ver
[`../midoteca/docs/MYPLAY_AUDIT.md`](../midoteca/docs/MYPLAY_AUDIT.md)).

## 8. Contratos

Todo **contrato** deve ter teste de contrato que qualquer adapter precisa
satisfazer (LSP — [`ARCHITECTURE.md`](ARCHITECTURE.md) §9):

- Backend: `IndexingStore`, `FileScanner`, `SourceProbe`, `LibraryRepository`.
- Frontend: `LibraryRepository` — a suíte roda contra `MockLibraryService` hoje e
  contra o adapter IPC amanhã, **sem reescrever o teste**.
- Ao adicionar um adapter novo, o critério de aceite é: **a suíte de contrato
  existente passa sem alteração**.

## 9. O que NÃO fazer

- ❌ Mockar o SQLite (perde WAL/FK/transação reais).
- ❌ Testar detalhes de implementação (estado interno, ordem de chamadas).
- ❌ Componente acessando repositório/IPC/`localStorage` direto no teste (use injeção).
- ❌ Testar regra de negócio através de componente quando ela deveria estar em
  `domain/`/`application/`.
- ❌ Escrever teste depois de "refatorar tudo" — é o caminho do retrabalho.

## 10. Definição de pronto (testes)

- [ ] Teste novo falhou antes (Red) e passa depois (Green).
- [ ] `npm test` verde no pacote afetado.
- [ ] `npm run typecheck` limpo.
- [ ] Comportamento legado preservado (caracterização) quando aplicável.
- [ ] Teste de contrato atualizado/passando para todo adapter novo.
- [ ] Nenhum mock desnecessário introduzido.
