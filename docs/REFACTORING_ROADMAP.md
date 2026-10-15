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
| `client/` (frontend) | Fronteira de repositório criada (`contracts.ts`, `LibraryContext`); telas grandes e código morto pendentes |
| `backend/` (legado myPlay) | Descartado como base de código |

## 3. Priorização

| Prioridade | Alvo | Impacto | Risco |
| --- | --- | --- | --- |
| **P0** | Remover código morto do `client/` | Alto (ruído/confusão) | Baixo |
| **P1** | Extrair lógica das telas grandes do `client/` | Alto (manutenção/testes) | Médio |
| **P2** | Quebrar `mockData.ts` e isolar fixtures | Médio | Baixo |
| **P3** | Adapter IPC/HTTP ligando `client` ↔ `midoteca` | Alto (produto) | Médio |
| **P4** | Frontend: `domain/` + `application/` por feature | Médio | Médio |
| — | `backend/` legado | — | **Não migrar** |

## 4. P0 — Remover código morto do frontend

Cinco componentes em `client/src/components/` **não têm nenhum importador**
(verificado por busca de imports) — sobras do myPlay:

| Arquivo | Linhas |
| --- | --- |
| `components/VideoPlayer.tsx` | 996 |
| `components/VideoList.tsx` | 770 |
| `components/EditVideoDialog.tsx` | 256 |
| `components/ScanDirectory.tsx` | 144 |
| `components/AddVideo.tsx` | 116 |

Ação: confirmar ausência de consumidores (inclusive stories/index) e remover.
Ganho: ~2.280 linhas a menos, sem mudança de comportamento. Passo de menor risco.

## 5. P1 — Telas grandes → componentes coesos + casos de uso

Arquivos ativos que concentram apresentação + lógica (indicador ~150 linhas):

| Arquivo | Linhas | Extrações sugeridas |
| --- | --- | --- |
| `components/player/VideoPlayerView.tsx` | 840 | `usePlayerSession`, `PlayerControls`, `LessonSidebar`, casos de uso (abrir/persistir posição) |
| `components/editor/CourseEditorView.tsx` | 591 | edição de módulos/aulas, formulário, validação → `application/` |
| `components/pdf/PdfViewer.tsx` | 581 | `usePdfReadingState`, `PdfToolbar`, carregamento de páginas via `PageProvider` |
| `components/course/CourseDetailsView.tsx` | 531 | `useCourseProgress`, lista de aulas, cabeçalho |
| `components/search/SearchView.tsx` | 529 | `useSearch`, agrupamento/render de resultados |
| `components/library/LibraryView.tsx` | 446 | filtros/grade, card reutilizável |
| `components/home/HomeView.tsx` | 436 | seções (continuar, recentes) como componentes |
| `components/player/MoviePlayerView.tsx` | 405 | reuso do player de vídeo |
| `components/player/useMediaElementPlayback.ts` | 400 | quebrar em hooks menores (controle de mídia, legendas) |
| `components/player/MiniPlayer.tsx` | 308 | reuso com a tela cheia |

Estratégia por tela: **teste de caracterização → extrair hook/caso de uso →
extrair componentes → validar**. Não alterar comportamento visual.

## 6. P2 — `mockData.ts` (664 linhas)

Hoje mistura fixtures, `MockLibraryService` e `MockSearchService`.

Ação: separar em `fixtures/` (dados) + `adapters/mock-library.ts` +
`adapters/mock-search.ts`. Mantém o port `LibraryRepository` intacto.

## 7. P3 — Adapter IPC/HTTP (`client` ↔ `midoteca`)

Criar `IpcLibraryRepository implements LibraryRepository` que chama o núcleo
(`createMidoteca` via Tauri IPC / HTTP local / worker). Injetar em
`<LibraryProvider repository={…}>`. **Nenhum componente muda** — é a prova do
desenho Ports & Adapters.

## 8. P4 — `domain/` + `application/` no frontend

Com as telas decompostas, mover regras puras (cálculo de progresso, próxima
aula, validação de edição) para `domain/`, e orquestração para `application/`,
deixando `components/` e `hooks/` apenas com apresentação.

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
