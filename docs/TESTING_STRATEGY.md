# Estratégia de Testes — Midoteca

> Vale para **backend (`midoteca/`)** e **frontend (`client/`)**. Complementa
> [`../AGENTS.md`](../AGENTS.md) e [`DDD_GUIDELINES.md`](DDD_GUIDELINES.md).

## 1. Princípios

1. **TDD** para código novo: Red → Green → Refactor.
2. **Testes de caracterização** para código legado antes de refatorar.
3. **Sem mocks desnecessários**: prefira os adaptadores reais. SQLite real em
   arquivo temporário > dublê.
4. Refatorar em passos pequenos, rodando testes a cada mudança significativa.
5. **Equivalência de comportamento** preservada, salvo mudança funcional pedida.

## 2. Pirâmide de testes

```text
        ▲  E2E / Storybook (visual + fluxo)          — poucos, críticos
       ╱ ╲ Componente (React Testing Library)         — telas e interações
      ╱   ╲ Contrato (port ↔ adapter)                  — garante o contrato
     ╱     ╲ Integração (SQLite/FS reais)              — persistência e IO
    ╱───────╲ Unitário (regras puras)                  — muitos, rápidos
```

| Nível | Backend | Frontend |
| --- | --- | --- |
| Unitário | `organization`, `manifest`, `resource-governor`, validação | regras puras, helpers, reducers |
| Integração | repositórios SQLite (arquivo real), scanner FS (árvore temp) | hooks com repositório fake |
| Contrato | `IndexingStore`, `LibraryRepository`, `FileScanner` | `LibraryRepository` (mock vs futuro IPC) |
| Componente | — | `@testing-library/react` + jsdom |
| E2E/Visual | — | Storybook (`features/*/presentation/*.stories.tsx`) |

## 3. Backend (`midoteca/`)

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

Cobertura atual (Fases 1–2): **92 testes / 17 arquivos** — domínio, repositórios
SQLite, migrações/idempotência, integridade referencial, scanner, organização,
manifesto, indexação incremental, títulos, queries, source service, governor.

Exemplo de teste de integração real:

```ts
const temp = createTempDatabase();
const app = createMidoteca({ databaseFile: temp.file });
const source = await app.sources.addSource({ rootPath: library.root });
const summary = await app.indexer.runScan({ sourceId: source.id });
expect(summary.created).toBe(6);
```

## 4. Frontend (`client/`)

**Stack**: Vitest + `@testing-library/react` + jsdom (+ Storybook). Specs em
`client/src/__tests__/*.test.tsx`.

Regras:

- Injetar um repositório fake via `<LibraryProvider repository={fake}>` — nunca
  depender de `mockData` global nos testes.
- Testar comportamento visível ao usuário (papéis/labels), não detalhes internos.
- Testes de componente substituem lógica por interações; regras puras têm testes
  unitários próprios (quando extraídas).
- Stories do Storybook servem de teste visual/contrato de UI.

Comandos:

```bash
cd client
npm test            # vitest run
npm run test:watch
npm run build       # tsc && vite build
npm run storybook   # catálogo visual
```

Cobertura atual: **12 arquivos** em `__tests__` (navegação, biblioteca, curso,
editor, player, PDF, busca, mini player, repositório, home).

## 5. Testes de caracterização (legado)

Ao tocar código legado (ex.: telas grandes do `client/`):

1. Identificar o comportamento atual observável.
2. Escrever testes que **congelam** esse comportamento (mesmo que "feio").
3. Refatorar em passos pequenos, mantendo os testes verdes.
4. Só então alterar comportamento, com teste novo explícito.

O legado `backend/` (NestJS/PostgreSQL) **não** recebe testes: está descartado
como base de código (ver [`../midoteca/docs/MYPLAY_AUDIT.md`](../midoteca/docs/MYPLAY_AUDIT.md)).

## 6. Contratos

Todo **port** deve ter teste de contrato que qualquer adapter precisa satisfazer:

- Backend: `IndexingStore`, `FileScanner`, `SourceProbe`, `LibraryRepository`.
- Frontend: `LibraryRepository` — o teste roda contra `MockLibraryService` hoje e
  contra o adapter IPC amanhã, sem reescrever a suíte.

## 7. O que NÃO fazer

- ❌ Mockar o SQLite (perde WAL/FK/transação reais).
- ❌ Testar detalhes de implementação (estado interno, ordem de chamadas).
- ❌ Componentes acessando `mockData`/IPC direto no teste (use injeção).
- ❌ Escrever teste depois de "refatorar tudo" — é o caminho do retrabalho.

## 8. Definição de pronto (testes)

- [ ] Teste novo falhou antes (Red) e passa depois (Green).
- [ ] `npm test` verde no pacote afetado.
- [ ] `npm run typecheck` limpo.
- [ ] Comportamento legado preservado (caracterização) quando aplicável.
- [ ] Nenhum mock desnecessário introduzido.
