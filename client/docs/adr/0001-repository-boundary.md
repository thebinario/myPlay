# ADR 0001 — Fronteira de repositório no frontend

- **Status**: Aceito
- **Contexto**: `client/` (midoteca-desktop, React 19 + Vite)
- **Relacionado**: [`../ARCHITECTURE.md`](../ARCHITECTURE.md),
  [`../../../docs/ARCHITECTURE.md`](../../../docs/ARCHITECTURE.md)

## Contexto

O app começou como protótipo com dados em memória. Componentes precisavam de
cursos, filmes e documentos, além de estado de reprodução/leitura. Sem uma
fronteira, a tendência é: (a) componentes importarem diretamente os dados
mockados; (b) lógica de negócio espalhada pelas telas; (c) dificuldade para
trocar a origem por dados reais (núcleo `midoteca` via IPC/HTTP) e para testar.

## Decisão

Introduzir uma **fronteira de repositório** (Ports & Adapters) no frontend:

1. **Ports** em `src/services/contracts.ts`: `LibraryCatalogRepository`,
   `PlaybackStateRepository`, `ReadingStateRepository`, `PageProvider`,
   `ISearchService`, agregados em `LibraryRepository`.
2. **Adapter padrão** em memória: `MockLibraryService`
   (`src/services/mockData.ts`) implementando `LibraryRepository`.
3. **Injeção** via React Context: `<LibraryProvider repository={…}>`; hooks
   `useLibraryRepository()`, `useLibraryItems()` (com `useSyncExternalStore`),
   `useLibrary()`.
4. **Componentes** consomem apenas os hooks — nunca `mockData` nem HTTP/IPC
   diretamente.

## Alternativas consideradas

| Alternativa                                     | Motivo da rejeição                                                  |
| ----------------------------------------------- | ------------------------------------------------------------------- |
| Importar `mockData` direto nos componentes      | acopla UI aos dados; impossibilita troca/teste                      |
| Prop drilling do repositório por todas as views | ruído e acoplamento à árvore de componentes                         |
| Estado global (Redux/Zustand) desde já          | peso desnecessário; o problema é a fronteira de dados, não o estado |
| Buscar via `fetch` dentro de cada tela          | espalha IO na apresentação; dificulta contrato único                |

## Consequências

**Positivas**

- Trocar mock por adapter real (IPC/HTTP) **sem** tocar em componentes.
- Testes injetam um fake via `LibraryProvider`.
- Storybook roda sem backend.
- Mesmo padrão do núcleo (`ports` + `adapters`), linguagem única no projeto.

**Negativas / trade-offs**

- `LibraryRepository` é amplo (catálogo + playback + leitura + page + search);
  pode ser fatiado por contexto quando crescer.
- `useSyncExternalStore` exige que o snapshot seja estável (evitar novo array a
  cada `getSnapshot`).

## Próximos passos

- Criar `IpcLibraryRepository` implementando o mesmo port (roadmap P3).
- Fatiar `mockData.ts` (664 linhas) em fixtures + adapters (roadmap P2).
- Extrair regras puras para `domain/` e casos de uso para `application/`.
