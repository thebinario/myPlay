# Roadmap de Refatoração — Midoteca

> Recorte **de execução/refatoração** do plano mestre de produto
> [`ROADMAP.md`](ROADMAP.md) (15 fases / 4 versões). Aqui está **o que migrar
> primeiro** no código existente, de forma incremental, para convergir ao
> **modelo canônico** de [`ARCHITECTURE.md`](ARCHITECTURE.md) — o mesmo para
> backend e frontend. Não impõe reescrita total. Regras em
> [`../AGENTS.md`](../AGENTS.md) e [`DDD_GUIDELINES.md`](DDD_GUIDELINES.md).

## 0. Relação com o roadmap mestre

Este documento acompanha a convergência arquitetural junto às fases do
[`ROADMAP.md`](ROADMAP.md). O adapter já foi iniciado; P3 está em andamento:

| Prioridade aqui | Fase do roadmap mestre | Tema |
| --- | --- | --- |
| **P0** remover código morto | F00 · Auditoria/baseline | limpeza de sobras |
| **P1** decompor telas grandes | F01 · Arquitetura e estado | DDD/Clean/Hexagonal |
| **P2** quebrar `mockLibraryRepository` | F01/F03 · fonte única de verdade | fronteira de repositório |
| **P3** adapter do FE sobre o núcleo | F03 · Desktop e catálogo | liga `client` ↔ `midoteca` |
| **P4** `domain/` + casos de uso no FE | F01/F02 · componentização | separação de camadas |
| **P5** layout canônico do backend | F01/F03 | `modules/` + `platform/` + `app/` |
| **P6** layout canônico do frontend | F01 | `features/` → `modules/`, testes em `test/` |
| **P7** casos de uso × hooks no FE | F01/F02 | `application/` sem React |
| **P8** nomenclatura canônica de contratos/inputs/DTOs | F01 | `repositories.ts`/`contracts.ts`; `use-cases/` + `queries/`; sem `dto.ts`/`inputs.ts` |
| **P9** seam de DI compartilhado + contratos por papel (ISP) | F01 | `shared/providers/`; `core/contracts/` um por papel |
| **P10** refino do backend | F01/F03 | dividir adapters/domain services grandes; `core/contracts/` para contrato de 2+ contextos |

## 1. Princípios

- **Código novo já nasce no modelo canônico**; código antigo migra quando tocado
  ou quando representa risco relevante.
- **Não interromper a entrega de funcionalidades** para reescrever.
- Passos pequenos, com testes verdes a cada passo (ver
  [`TESTING_STRATEGY.md`](TESTING_STRATEGY.md)).
- Não migrar módulos não relacionados à tarefa atual.
- Migração de layout **não altera comportamento**: caracterizar → mover → ajustar
  imports → rodar a suíte.

## 2. Alvo da convergência

Estrutura única (backend e frontend) definida em
[`ARCHITECTURE.md`](ARCHITECTURE.md) §4:

```text
src/
├── app/            # composition root + shell
├── core/           # kernel: domain compartilhado + contratos + erros/validação/config
├── modules/<ctx>/{domain,application,infrastructure,presentation}
├── shared/         # ui, testing (sem regra de negócio)
└── platform/       # adapters técnicos compartilhados por 2+ contextos
```

## 3. Status atual (evidência verificada)

| Área | Situação |
| --- | --- |
| `midoteca/` (backend) | Layout canônico aplicado (P5), API desktop sobre IPC e persistência SQLite 100% operacionais. 138 testes unitários e de integração passando na suíte com SQLite nativo verde. |
| `client/` (frontend) | Produção no desktop 100% conectada ao núcleo via IPC para catálogo, fontes, organização de cursos, reprodução de vídeo (`progress.savePlayback`), leitura de PDF (`progress.saveReading`), busca universal (`catalog.search`), preferências (`IpcPreferencesRepository`) e onboarding (`IpcOnboardingRepository`). 402 testes passando na suíte. |
| `backend/` (legado myPlay) | Descartado como base de código (31 arquivos / 2.654 linhas) |

> A integração frontend ↔ backend via IPC está completa e validada com suítes
> de testes verdes em ambos os runtimes (540 testes no total). O build empacotado
> foi testado e validado em instalação em máquina real com Windows 11.

## 4. Priorização

| Prioridade | Alvo | Impacto | Risco | Situação |
| --- | --- | --- | --- | --- |
| **P0** | Remover código morto (`legacy/`, `stories/` do CRA, sobras) | Alto (ruído/confusão) | Baixo | ⏳ isolado, fora do build; remoção física pendente |
| **P5** | Layout canônico do backend (`app/`, `core/`, `modules/`, `platform/`) | Alto (vocabulário único) | Médio (paths/imports) | ✅ layout concluído; nomenclatura (P8) e `presentation/` pendentes |
| **P6** | Layout canônico do frontend (`features/` → `modules/`, testes → `test/`) | Médio (vocabulário único) | Baixo (mecânico) | ✅ `features/` → `modules/` + kebab-case da infra; mover testes para `test/` pendente |
| **P2** | Separar fixtures de adapter em `mock-library-repository.ts` (737 linhas) | Médio | Baixo | ⏳ pendente |
| **P7** | Casos de uso × hooks de apresentação no FE | Médio (testabilidade) | Médio | ✅ concluído |
| **P8** | Nomenclatura canônica de contratos/inputs/DTOs (`repositories.ts`/`contracts.ts`, `use-cases/`+`queries/`) | Alto (clareza) | Médio (renames/imports) | ⏳ docs alinhadas; migração de código pendente |
| **P9** | Seam de DI compartilhado (`shared/providers/`) + contratos por papel em `core/contracts/` | Alto (desacopla 5 contextos; ISP) | Médio (mover Context + split de contrato) | ⏳ docs alinhadas; migração pendente |
| **P10** | Refino do backend: adapters/domain services acima do indicador + contrato compartilhado por 2+ contextos | Médio/Alto (coesão backend) | Médio (dividir arquivos) | ⏳ docs alinhadas; migração pendente |
| **P3** | Adapter do FE ligando `client` ↔ `midoteca` | Alto (produto) | Médio | ✅ concluído: catálogo, fontes, cursos, player, PDF, busca, preferências e onboarding 100% integrados ao SQLite via IPC |
| **P1** | Extrair lógica das telas grandes | Alto (manutenção/testes) | Médio | 🟡 parcial: hooks/regra extraídos; views ainda 349–560 linhas |
| **P4** | `domain/` por contexto no FE | Médio | Médio | ✅ `courses`/`documents`/`player` com regra pura; outros contextos sem regra |
| — | `backend/` legado | — | **Não migrar** | — |

Ordem recomendada: **P0** → **P8** → **P9** → **P6** → **P2/P7/P4** →
**P10** → concluir **P3**, migrando operações mockadas por domínio. O transporte
desktop já existe; a porta síncrona e o contrato agregado do frontend são os
principais bloqueios atuais.

## 5. P0 — Remover código morto

Inventário verificado (nenhum importador em código ativo; `tsconfig` já os
exclui):

| Arquivo | Linhas | Origem |
| --- | --- | --- |
| `client/src/legacy/VideoPlayer.tsx` | 1.046 | myPlay |
| `client/src/legacy/VideoList.tsx` | 836 | myPlay |
| `client/src/legacy/EditVideoDialog.tsx` | 256 | myPlay |
| `client/src/legacy/ScanDirectory.tsx` | 149 | myPlay |
| `client/src/legacy/AddVideo.tsx` | 113 | myPlay |
| `client/src/legacy/index.tsx` · `reportWebVitals.ts` · `setupTests.ts` | 17 · 15 · 5 | CRA |
| `client/src/setupProxy.js` · `client/src/react-app-env.d.ts` | — | CRA |
| `client/src/stories/**` (Button/Header/Page + assets) | — | CRA/Storybook boilerplate |

Ação: remover os arquivos acima e limpar as exclusões correspondentes de
`tsconfig.json`, `.prettierignore` e do lint. Ganho: **~3.174 linhas** menos, sem
mudança de comportamento. Passo de menor risco.

> As 22 stories dos componentes reais (`shared/ui` + `presentation/`) **permanecem**;
> só o boilerplate do CRA sai.

## 6. P1 — Telas grandes → componentes coesos + casos de uso

**Concluído** para as telas principais (cada view agora é fina; lógica em hooks e
subcomponentes):

| Antes (myPlay) | Depois |
| --- | --- |
| `VideoPlayer.tsx` (1.046) | `modules/player/presentation/VideoPlayerView.tsx` (~145) + `presentation/hooks/useVideoPlayer.ts` + controles |
| `CourseEditorView.tsx` (591) | `modules/courses/presentation/CourseEditorView.tsx` (~68) + `presentation/hooks/useCourseEditor.ts` |
| `PdfViewer.tsx` (581) | `modules/documents/presentation/PdfViewer.tsx` (~58) + `presentation/hooks/usePdfReader.ts` |
| `SearchView.tsx` (529) | `modules/search/presentation/SearchView.tsx` (~86) + `presentation/hooks/useUniversalSearch.ts` |
| `CourseDetailsView.tsx` (531) | `modules/courses/presentation/CourseDetailsView.tsx` |
| `LibraryView.tsx` (446) | `modules/library/presentation/LibraryView.tsx` |
| `HomeView.tsx` (436) | `modules/home/presentation/HomeView.tsx` + `Sidebar.tsx` |
| `MoviePlayerView.tsx` (405) | `modules/player/presentation/MoviePlayerView.tsx` |
| `MiniPlayer.tsx` (308) | `modules/player/presentation/MiniPlayer.tsx` |

Estratégia aplicada: **caracterização → extrair hook/caso de uso → extrair
componentes → validar**. Comportamento visual preservado.

**Dívida residual (verificada):** a lógica saiu, mas as views continuam grandes
e ainda misturam subcomponentes — `CourseDetailsView` 560, `HomeView` 474,
`MoviePlayerView` 461, `LibraryView` 455, `MiniPlayer` 349, `App.tsx` 336.
Próximo passo: extrair `presentation/components/` seguindo o piloto `player`
(já aplicado em `player/presentation/` e `shared/ui/`).

## 7. P2 — `mockLibraryRepository.ts`

Hoje: **737 linhas** em `modules/library/infrastructure/`, atrás do contrato
`LibraryRepository`. Restante: separar **fixtures** (`fixtures/`) dos **adapters**
(`mock-library.ts`, `mock-search.ts`) e extrair a persistência (`library-storage`)
como contrato de infraestrutura (já existe) — sem mudar comportamento.

## 8. P3 — Adapter do frontend sobre o núcleo · 🟡 parcial

`IpcLibraryRepository` e `IpcLibrarySourcesRepository` já atravessam o bridge
desktop e o catálogo consulta SQLite. A composição de produção ainda injeta um
`MockLibraryService` como delegate para edição/conclusão de cursos, progresso,
legendas, estado de leitura e busca. Assim, alterações nessas áreas não têm
persistência autoritativa no núcleo.

**Próximos passos:**

1. Separar `LibraryRepository` em portas assíncronas por responsabilidade (P9),
   para consumir IPC sem snapshots síncronos nem fallback mock em produção.
2. Migrar organização/conclusão e progresso de playback/leitura para casos de
   uso e `progress.*`, disponível no contrato desktop.
3. Conectar a busca ao read model real e completar o contrato para aulas e
   vídeos antes de remover o comportamento atual.
4. Migrar preferências e onboarding para `settings.*` e contratos próprios.
5. Manter mocks somente na composição de desenvolvimento e nos testes.

## 9. P4 — `domain/` + casos de uso no FE

Estrutura de contexto já existe. **Aplicado** onde há regra pura (`courses`,
`documents`, `player`); contextos sem regra pura (`home`, `search`, `settings`)
não têm `domain/` — criar só quando a regra aparecer, mantendo `presentation/`
só com apresentação.

## 10. P5 — Layout canônico do backend — ✅ **layout aplicado**

**Problema:** o núcleo usava um vocabulário próprio (`core/<ctx>/` plano +
`infra/`), diferente do modelo canônico compartilhado com o frontend.

**Responsabilidade extraída:** separação estrita por contexto e camada —
`core/` (kernel), `modules/<ctx>/{domain,application,infrastructure}`,
`platform/` (adapters de 2+ contextos) e `app/` (composition root).

| Passo | De | Para | Situação |
| --- | --- | --- | --- |
| 1 | `src/index.ts` (composition root + API) | `src/app/composition-root.ts` + `src/index.ts` (só API pública) | ✅ |
| 2 | `src/core/shared/*` (10 arquivos) | `src/core/*` (kernel) | ✅ |
| 3 | `src/core/<ctx>/{entities,inputs}.ts` | `src/modules/<ctx>/domain/` | ✅ |
| 4 | `src/core/<ctx>/{repository,ports}.ts` | `src/modules/<ctx>/domain/ports.ts` | ✅ |
| 5 | `src/core/<ctx>/{service,queries,indexer}.ts` | `src/modules/<ctx>/application/` | ✅ movido (parcial) |
| 6 | `src/core/<ctx>/<regra pura>.ts` | `src/modules/<ctx>/domain/` | ✅ |
| 7 | `src/infra/sqlite/repositories/<ctx>.*.sqlite.ts` | `src/modules/<ctx>/infrastructure/` | ✅ |
| 8 | `src/infra/sqlite/{database,migrator,migrations}` | `src/platform/persistence/sqlite/` | ✅ |
| 9 | `src/infra/fs/*`, `src/infra/events/*` | `src/platform/fs/`, `src/platform/events/` | ✅ |
| 10 | — | `src/modules/<ctx>/presentation/` (transporte) | ⏳ Fase 3 |

**Arquivos alterados:** 72 movidos + `src/index.ts` dividido +
`core/domain/{media-type,lesson-media-role}.ts` promovidos + barrels ajustados.
Nenhum arquivo de esquema/mídia tocado.

**Testes:** nenhum teste novo (migração de layout); **os 19 specs / 116 testes
existentes serviram de caracterização** e seguem verdes.

**Validação:** `npm test` 116/116 · `typecheck` 0 · `lint` 0 · `format:check` 0 ·
`build` 0 · `node scripts/migrate.cjs` aplica `1, 2` · E2E contra `dist`
(`createMidoteca` → `addSource` → `listSources` → `runIndexScan` → `queries`)
funcionando · varredura de imports entre áreas sem violações.

**Dívidas restantes:**

- `application/` ainda guarda serviços (`library-source-service`, `indexer`) em
  vez de casos de uso explícitos em `application/use-cases/`;
- `presentation/` (transporte) continua ausente — é a Fase 3 e o que destrava o
  P3;
- adapters acima do indicador: `course.repository.sqlite.ts` (430),
  `indexing.store.sqlite.ts` (421).

Ordem segura usada: **caracterizar** (suíte verde antes) → mover → ajustar
imports → rodar a suíte. Sem mudança de comportamento e sem tocar no schema
SQLite. Detalhes das decisões não previstas no mapa: `docs/ARCHITECTURE.md`
§12.1.

## 11. P6 — Layout canônico do frontend

| Passo | De | Para | Situação |
| --- | --- | --- | --- |
| 1 | `src/features/<ctx>/…` | `src/modules/<ctx>/…` (rename + alias `@/features/*` → `@/modules/*`) | ✅ feito |
| 2 | `src/__tests__/*.test.tsx` | `test/**` espelhando a árvore | ⏳ pendente |
| 3 | `src/legacy/`, `src/stories/` | remover (P0) | ⏳ pendente |

Passo mecânico, sem mudança de comportamento. Verificar: `vitest.config`/`vite.config`
(`setupFiles`, projetos), imports nos testes e stories, e o `tsconfig` (paths).

Executado: `git mv src/features src/modules` + reescrita do alias em 98 imports;
`library/infrastructure` normalizada para kebab-case (`mock-library-repository.ts`,
`library-storage.ts`). Suíte verde após a etapa (212 testes).

## 12. P7 — Casos de uso × hooks de apresentação (FE)

Hoje `features/<ctx>/application/` guarda **hooks React**
(`useVideoPlayer`, `usePdfReader`, `useCourseEditor`, `useUniversalSearch`,
`useMediaElementPlayback`, `useAutoHideControls`). Canonônico:

- **regra/ passo de aplicação** → `modules/<ctx>/application/use-cases/*.ts`
  (sem React, testável isolado);
- **hook de apresentação** → `modules/<ctx>/presentation/hooks/useXxx.ts`
  (estado de UI, efeitos, assinatura do repositório);
- o hook chama o caso de uso; o componente chama o hook. Componente nunca contém
  regra.

Executado (6 hooks movidos; `application/` do FE sem React):

| Contexto | Regra extraída | Local |
| --- | --- | --- |
| courses | `renameCourse/Module/Lesson`, `reorderModules`, `moveLesson`; `recalculateCourseMetrics`; caso de uso `saveCourse` | `domain/course-editing.ts`, `domain/course-metrics.ts`, `application/use-cases/save-course.ts` |
| search | `groupSearchResults`, `resolveSearchTarget` | `application/use-cases/*` |
| documents | `normalizeReadingState`, `nextPage/previousPage`, `zoomIn/zoomOut`, `toggleColorMode`, `pageRange`, `scrollRatio`, `clampPage` | `domain/pdf-reading.ts` |
| player | `formatSeconds`, `clampSeekTime`, `seekTimeFromRatio`, `ratioFromOffset`; `lessonsOf`, `nextLessonIndex`, `previousLessonIndex`, `loadingLabelFor` | `domain/progress.ts`, `domain/playlist.ts` |

Testes: +34 casos (`CourseEditing`, `SearchUseCases`, `PdfReading`,
`PlaybackDomain`) → frontend em 246 testes. `useMediaElementPlayback` e
`useAutoHideControls` são apresentação pura (eventos do `<video>`), então foram
apenas movidos para `presentation/hooks/`.

## 13. P8 — Nomenclatura canônica de contratos, inputs e DTOs

**Problema:** os arquivos de contrato e de entrada/saída acumulavam
responsabilidades e nomes genéricos — `domain/inputs.ts` (comandos),
`application/dto.ts` (I/O + read model + bundle de dependências) e
`application/queries.ts` com várias operações. `domain/ports.ts` também
misturava repositório com dependências externas. Resultado: o mesmo conceito em
dois lugares e nomes que não comunicam o papel.

**Alvo (detalhado em [`ARCHITECTURE.md`](ARCHITECTURE.md) §3 e
[`CODE_ORGANIZATION.md`](CODE_ORGANIZATION.md) §4.2):**

| De | Para |
| --- | --- |
| `domain/inputs.ts` (`CreateX`/`UpdateX`) | dentro de `domain/repositories.ts`, junto do repositório |
| `domain/ports.ts` (repositórios) | `domain/repositories.ts` |
| `domain/ports.ts` / `domain/types.ts` (contratos externos) | `domain/contracts.ts` |
| `application/dto.ts` (input/output de caso de uso) | colocalizado em `application/use-cases/<op>.ts` |
| `application/dto.ts` (bundle de deps) | `application/dependencies.ts` |
| `application/queries.ts` (N operações) | `application/queries/<op>.ts` (1 por consulta) |
| read models + contrato de leitura (`domain/queries.ts`) | `domain/read-models.ts` + store em `domain/repositories.ts` |
| `client/src/core/ports/` | `client/src/core/contracts/` |

**Passos:** por contexto (começar por `library`), caracterizar → renomear/mover →
ajustar imports → rodar `npm test`. Sem mudança de comportamento. Migrar os
demais contextos quando tocados ou quando o risco justificar.

**Status:** 🟡 `library` migrado (✅ `domain/read-models.ts` + `domain/repositories.ts`,
`application/queries/<op>.ts`, `application/services/library-query-service.ts`;
19 specs / 116 testes verdes). Demais contextos pendentes.

## 14. P9 — Seam de DI compartilhado + contratos por papel (ISP)

**Problema (verificado no `client/`):** o repositório da biblioteca é consumido
por `library`, `courses`, `player`, `documents`, `search` e `settings`, mas o
Context/hook de consumo mora na `presentation/` de `library`
(`modules/library/presentation/LibraryProvider.tsx`), que ainda importa
`infrastructure/` diretamente. Isso faz 5 contextos importarem a `presentation/`
de outro e quebra a matriz de dependência
([`ARCHITECTURE.md`](ARCHITECTURE.md) §5). Somado a isso,
`core/ports/libraryRepository.ts` estende **6** contratos agregados
(`catalog`, `playback`, `reading`, `page-provider`, `maintenance`, `search`) —
violação de ISP: quem só lê catálogo passa a depender de tudo.

**Alvo:**

1. Contexto + hooks de consumo (`useLibraryRepository`, `useLibraryItems`,
   `useLibrary`) → `shared/providers/library-repository.tsx` (seam de DI, sem
   regra de negócio). A injeção do adapter concreto continua só em
   `app/main.tsx`.
2. Contratos de fronteira do runtime divididos **por papel** em `core/contracts/`
   (`library-catalog.ts`, `playback-state.ts`, `reading-state.ts`,
   `page-provider.ts`, `maintenance.ts`, `search.ts`); o contrato agregado vira
   conveniência de composição, não a dependência de cada consumidor.
3. `core/ports/` → `core/contracts/` e `ISearchService` sai de `core/domain/`.

**Passos:** caracterizar (suíte verde) → mover Context/hooks para
`shared/providers/` → split dos contratos em `core/contracts/` → ajustar imports
dos 6 consumidores + `app/` → rodar `npm test`. Sem mudança de comportamento.

**Arquivos-alvo:** `modules/library/presentation/LibraryProvider.tsx` (sai),
`shared/providers/library-repository.tsx` (entra), `core/ports/*` →
`core/contracts/*`, ajustes em `app/{App,main}.tsx`, `settings/SettingsView.tsx`,
`courses/hooks/useCourseEditor.ts`, `documents/hooks/usePdfReader.ts`,
`player/hooks/useVideoPlayer.ts`, `search/hooks/useUniversalSearch.ts`.

**Status:** ⏳ documentação alinhada ([`ARCHITECTURE.md`](ARCHITECTURE.md)
§4.1/§12.2); migração de código pendente.

## 15. P10 — Refino do backend (adapters, domain services, contrato compartilhado)

**Problema (verificado):** o layout canônico do backend (P5) está aplicado, mas
sobraram arquivos acima dos indicadores de revisão e uma peça fora de lugar:

| Achado | Linhas | Ação |
| --- | --- | --- |
| `modules/courses/infrastructure/course.repository.sqlite.ts` | **668** | dividir por agregado (`course.repository.sqlite.ts` + `course.organization.sqlite.ts`) |
| `modules/indexing/infrastructure/indexing.store.sqlite.ts` | **447** | dividir (`indexing.store.sqlite.ts` + `indexing.titles.sqlite.ts`) |
| `modules/media/infrastructure/media.repository.sqlite.ts` | **304** | avaliar divisão por agregado |
| `modules/indexing/domain/organization.ts` | **329** | `domain/organization/` por responsabilidade (funções puras) |
| `modules/indexing/application/resource-governor.ts` | 97 | mover para `application/services/` |
| `platform/fs/{recursive-scanner,source-probe,manifest-loader}` | — | implementa contratos de `indexing/domain` que servem 2 contextos (`library` + `indexing`) |

**Alvo:** dividir os arquivos grandes **sem** mudar contratos nem consumidores
(a suíte é a caracterização) e realocar o que não é caso de uso.

**Decisão pendente (ADR):** promover `FileScanner`/`SourceProbe`/`ManifestLoader`
para `core/contracts/` — coerente com "contrato usado por 2+ contextos → kernel"
— eliminando `platform → modules/*/domain`. Alternativa: manter em
`indexing/domain` (com `application → outro domain`, hoje permitido).

**Passos:** caracterizar → dividir/realocar → `npm test`/`typecheck`/`lint`.
Sem mudança de comportamento. Não faz parte do P8 (que é só nomenclatura).

**Status:** ⏳ docs alinhadas ([`ARCHITECTURE.md`](ARCHITECTURE.md) §4.1/§12.1);
migração pendente.

## 16. Backend legado (`backend/`)

**Não migrar.** Já auditado e classificado em
[`../midoteca/docs/MYPLAY_AUDIT.md`](../midoteca/docs/MYPLAY_AUDIT.md):
PostgreSQL com credenciais embutidas, entidade `Video` duplicada, acoplamento
arquivo↔registro e exclusão física. Reaproveitar apenas **conceitos** (formatos,
parâmetros de transcodificação, ideias de streaming por range/LRU). Quando
necessário, remover o diretório em PR isolado após confirmar ausência de uso.

## 17. Formato de relato por mudança

Ao concluir cada item, registrar (conforme `AGENTS.md` §11):

- **Problema encontrado**
- **Responsabilidade extraída**
- **Arquivos alterados**
- **Testes criados / executados**
- **Resultado da validação** (`npm test`, `typecheck`, `build`)
- **Dívidas técnicas restantes**

## 18. Não-objetivos

- Reescrever backend ou frontend inteiros de uma vez.
- Migrar `backend/` legado.
- Introduzir abstrações/camadas sem responsabilidade real.
- Mudar navegação/comportamento visual sem necessidade da tarefa.
- Alterar o schema SQLite durante migrações de layout.
