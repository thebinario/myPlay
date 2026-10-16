# Leitor de PDF — arquitetura e estado

> A leitura é local-first: o PDF é renderizado no dispositivo, sem upload e sem
> IA. O backend só guarda o **estado de leitura** (ver
> [`READING_PROGRESS.md`](READING_PROGRESS.md)).

## 1. Objetivo

Exibir PDFs catalogados com paginação, zoom e persistência de posição, tolerando
arquivos temporariamente indisponíveis (HD desconectado) sem travar a UI.

## 2. Camadas no frontend

```text
client/src/features/documents/
├── application/
│   └── usePdfReader.ts        # estado + pdf.js + persistência (hook)
└── presentation/
    ├── PdfViewer.tsx          # composição visual (fino)
    ├── PdfToolbar.tsx         # navegação, zoom, modo de cor
    ├── PdfPageViewport.tsx    # viewport/scroll
    ├── PdfTextPage.tsx        # camada de texto
    └── PdfUnavailableState.tsx# estado offline/erro
```

O acesso a dados passa pelo contrato `LibraryRepository`
(`client/src/core/contracts/library-repository.ts`; `core/ports/` hoje, renome no
P8), que compõe
`ReadingStateRepository` (persistência) e `PageProvider` (páginas). **Nenhum
componente visual fala direto com pdf.js ou com HTTP/IPC.**

## 3. Estado atual (parcial)

**Implementado**

- Renderização real com **pdf.js** (`pdfjs-dist`) e worker local
  (`pdf.worker.min.mjs?url`) — ver `usePdfReader.ts`.
- Navegação (próxima/anterior), zoom (`0.75..2.0`), alternância de cor
  (`dark`/`original`) e scroll relativo.
- Renderização em `<canvas>` com `devicePixelRatio`; `renderTask.cancel()` no
  cleanup evita renderizações concorrentes.
- Estado offline: `isUnavailable` + `PdfUnavailableState` + `handleReconnect`.
- Carregamento em janela curta de páginas em torno da atual
  (`fetchPageRange(page-1 .. page+1)`).

**Parcial / planejado**

- `PageProvider` e `ReadingStateRepository` têm implementação **mock**
  (`mockLibraryRepository`, localStorage). Ainda não há adaptador HTTP/IPC para o
  backend.
- **HTTP Range / streaming**: o `getDocument({ url })` depende de o servidor
  suportar Range; o adaptador real deve servir o arquivo com suporte a Range para
  evitar baixar o PDF inteiro.
- **Renderização contínua/progressiva**: hoje renderiza uma página por vez
  (`viewMode` do backend prevê `paged`\|`continuous`, mas o client ainda não
  implementa o modo contínuo).
- Testes de renderização rodam sob jsdom, que não implementa canvas — o
  `IS_JSDOM` desliga o render real e mantém os testes verdes.

## 4. Contratos previstos

- `PageProvider.fetchPageRange(docId, startPage, endPage)` → `PdfPageChunk[]`
  (texto/metadados por página), para o modo contínuo e busca interna.
- `ReadingStateRepository` → mapear para `progress.saveReading`/`getReading`
  (ver mapeamento de campos em [`READING_PROGRESS.md`](READING_PROGRESS.md) §4).

## 5. Decisão arquitetural

A escolha de renderizar no cliente (pdf.js + canvas) e manter o backend apenas
com o estado de leitura está registrada em
[`adr/0005-pdf-reader.md`](adr/0005-pdf-reader.md).
