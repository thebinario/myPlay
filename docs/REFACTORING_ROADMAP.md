# Roadmap de Refatoração — Midoteca

> Recorte **de execução/refatoração** do plano mestre de produto
> [`ROADMAP.md`](ROADMAP.md) (14 fases / 4 versões). Aqui está **o que migrar
> primeiro** no código existente, de forma incremental. Não impõe reescrita
> total. Regras em [`../AGENTS.md`](../AGENTS.md) e
> [`DDD_GUIDELINES.md`](DDD_GUIDELINES.md).

## 0. Relação com o roadmap mestre

Este documento é a **parte prática** das fases **F00–F02 (v0.1)** do
[`ROADMAP.md`](ROADMAP.md) e prepara a **F03 (v0.5)**:

| Prioridade aqui | Fase do roadmap mestre | Tema |
| --- | --- | --- |
| **P0** remover código morto | F00 · Auditoria/baseline | limpeza de sobras |
| **P1** decompor telas grandes | F01 · Arquitetura e estado | DDD/Clean/Hexagonal |
| **P2** quebrar `mockData.ts` | F01/F03 · fonte única de verdade | fronteira de repositório |
| **P3** adapter IPC/HTTP | F03 · Desktop e catálogo | liga `client` ↔ `midoteca` |
| **P4** `domain/`+`application/` no FE | F01/F02 · componentização | separação de camadas |

## 1. Princípios

- **Código novo já nasce correto**; código antigo migra quando tocado ou quando
  representa risco relevante.
- **Não interromper a entrega de funcionalidades** para reescrever.
- Passos pequenos, com testes verdes a cada passo (ver
  [`TESTING_STRATEGY.md`](TESTING_STRATEGY.md)).
- Não migrar módulos não relacionados à tarefa atual.

## 2. Status atual (evidência)

| Área | Situação |
| --- | --- |
| `midoteca/` (backend) | Fases 1–2 concluídas, arquitetura correta, **92 testes** |
| `client/` (frontend) | **Migrado para módulos por domínio**: `app/`, `core/{domain,ports,config}`, `features/*/{application,infrastructure,presentation}`, `shared/ui`; telas grandes decompostas; legado isolado em `legacy/`; **212 testes** |
| `backend/` (legado myPlay) | Descartado como base de código |

## 3. Priorização

| Prioridade | Alvo | Impacto | Risco | Situação |
| --- | --- | --- | --- | --- |
| **P0** | Remover código morto do `client/` | Alto (ruído/confusão) | Baixo | ⏳ isolado em `src/legacy/` (excluído do build); remoção física pendente |
| **P1** | Extrair lógica das telas grandes do `client/` | Alto (manutenção/testes) | Médio | ✅ telas principais decompostas |
| **P2** | Quebrar `mockData.ts` e isolar fixtures | Médio | Baixo | ⏳ movido para `library/infrastructure`; separar fixtures pendente |
| **P3** | Adapter IPC/HTTP ligando `client` ↔ `midoteca` | Alto (produto) | Médio | ⏳ não iniciado |
| **P4** | Frontend: `domain/` + `application/` por feature | Médio | Médio | ✅ estrutura `features/<domínio>/` criada |
| — | `backend/` legado | — | **Não migrar** |

## 4. P0 — Remover código morto do frontend

Cinco componentes do myPlay **não têm nenhum importador** (verificado por busca
de imports). Foram **isolados em `client/src/legacy/`** (fora do build;
`tsconfig` exclui `src/legacy`). A remoção física é o passo final deste item:

| Arquivo (agora em `src/legacy/`) | Linhas |
| --- | --- |
| `VideoPlayer.tsx` | 996 |
| `VideoList.tsx` | 770 |
| `EditVideoDialog.tsx` | 256 |
| `ScanDirectory.tsx` | 144 |
| `AddVideo.tsx` | 116 |

Ação restante: remover o diretório `legacy/` quando conveniente.
Ganho: ~2.280 linhas a menos, sem mudança de comportamento. Passo de menor risco.

## 5. P1 — Telas grandes → componentes coesos + casos de uso

**Concluído** para as telas principais. Resultado da decomposição (cada view agora
é fina; lógica em hooks `application/` e subcomponentes `presentation/`):

| Antes | Depois |
| --- | --- |
| `components/player/VideoPlayerView.tsx` (840) | `features/player/presentation/VideoPlayerView.tsx` (~145) + `application/useVideoPlayer.ts` + controles |
| `components/editor/CourseEditorView.tsx` (591) | `features/courses/presentation/CourseEditorView.tsx` (~68) + `application/useCourseEditor.ts` |
| `components/pdf/PdfViewer.tsx` (581) | `features/documents/presentation/PdfViewer.tsx` (~58) + `application/usePdfReader.ts` |
| `components/search/SearchView.tsx` (529) | `features/search/presentation/SearchView.tsx` (~86) + `application/useUniversalSearch.ts` |
| `components/course/CourseDetailsView.tsx` (531) | `features/courses/presentation/CourseDetailsView.tsx` |
| `components/library/LibraryView.tsx` (446) | `features/library/presentation/LibraryView.tsx` |
| `components/home/HomeView.tsx` (436) | `features/home/presentation/HomeView.tsx` + `Sidebar.tsx` |
| `components/player/MoviePlayerView.tsx` (405) | `features/player/presentation/MoviePlayerView.tsx` |
| `components/player/MiniPlayer.tsx` (308) | `features/player/presentation/MiniPlayer.tsx` |

Estratégia aplicada: **caracterização → extrair hook/caso de uso → extrair
componentes → validar**. Comportamento visual preservado.

## 6. P2 — `mockData.ts`

Movido para `features/library/infrastructure/mockLibraryRepository.ts` (fixtures +
`MockLibraryService`). A separação em `fixtures/` + `adapters/mock-library.ts` +
`adapters/mock-search.ts` **permanece pendente**, mas já sob o módulo `library` e
atrás do port `LibraryRepository`.

## 7. P3 — Adapter IPC/HTTP (`client` ↔ `midoteca`)

Criar `IpcLibraryRepository implements LibraryRepository` que chama o núcleo
(`createMidoteca` via Tauri IPC / HTTP local / worker). Injetar em
`<LibraryProvider repository={…}>`. **Nenhum componente muda** — é a prova do
desenho Ports & Adapters.

## 8. P4 — `domain/` + `application/` no frontend

**Estrutura criada**: `features/<domínio>/{domain,application,infrastructure,presentation}`,
com `core/domain` (tipos) e `core/ports` (contratos) como kernel compartilhado.
Restante: mover regras puras remanescentes (cálculo de progresso, próxima aula,
validação de edição) para `domain/` conforme forem tocadas, mantendo
`presentation/` apenas com apresentação.

## 9. Backend legado (`backend/`)

**Não migrar.** Já auditado e classificado em
[`../midoteca/docs/MYPLAY_AUDIT.md`](../midoteca/docs/MYPLAY_AUDIT.md):
PostgreSQL com credenciais embutidas, entidade `Video` duplicada, acoplamento
arquivo↔registro e exclusão física. Reaproveitar apenas **conceitos** (formatos,
parâmetros de transcodificação, ideias de streaming por range/LRU). Quando
necessário, remover o diretório em PR isolado após confirmar ausência de uso.

## 10. Formato de relato por mudança

Ao concluir cada item, registrar (conforme `AGENTS.md` §11):

- **Problema encontrado**
- **Responsabilidade extraída**
- **Arquivos alterados**
- **Testes criados / executados**
- **Resultado da validação** (`npm test`, `typecheck`, `build`)
- **Dívidas técnicas restantes**

## 11. Não-objetivos

- Reescrever o frontend inteiro de uma vez.
- Migrar `backend/` legado.
- Introduzir abstrações/camadas sem responsabilidade real.
- Mudar navegação/comportamento visual sem necessidade da tarefa.
