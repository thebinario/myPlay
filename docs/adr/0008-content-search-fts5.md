# ADR 0008 — Busca no conteúdo (PDF, legendas e transcrições) com FTS5

- **Status**: Aceito
- **Data**: 2026-11-21
- **Contexto**: `catalog.search` procurava só em títulos e caminhos (`LIKE`).
  O texto de PDFs e legendas não era pesquisável, e a futura camada de RAG
  (fase 5) precisa de trechos de texto com sua localização.
- **Relacionado**: [`0007-media-analysis-duplicates.md`](0007-media-analysis-duplicates.md).

## Decisão

1. **Extração em segundo plano**, um job `search.extract-content` por fonte,
   agendado em `index:completed` (prioridade abaixo da análise de mídia):
   - **PDF:** `pdfjs-dist` (build legacy) no núcleo, carregado por `require()`
     de ESM, que o Node ≥ 22 e o Electron suportam. Somente leitura.
   - **Legendas:** SRT e WebVTT, com UTF-8 e fallback para Windows-1252.
     Legendas geradas pelo app (`metadata.generated`) ficam de fora, porque a
     transcrição indexa o próprio texto (fase 4).
2. **Chunks com localização** (`content_chunks`):
   - PDF: por página, até ~800 caracteres com sobreposição.
   - Legenda: janelas de ~30 s com `start_ms` e `end_ms`.
   - O chunking é domínio puro (`content-chunking.ts`).
3. **FTS5 external-content** (`content_chunks_fts`, `unicode61 remove_diacritics 2`),
   sincronizado por triggers. Um teste garante que o SQLite empacotado tem FTS5.
   A busca ignora acentos: "producao" encontra "produção".
4. **Consulta segura:** `toFtsQuery` coloca cada termo entre aspas (sem operadores
   vindos do usuário), exige todos os termos e trata o último como prefixo.
   Ordenação por `bm25`; trecho com `snippet()` e marcadores `[[ ]]`.
5. **Versão do arquivo:** `content_extraction_state` guarda tamanho e mtime da
   versão indexada. Arquivos alterados são reextraídos; arquivos com falha não
   são tentados de novo até mudarem.
6. **Método separado `search.content`**, em vez de misturar com `catalog.search`:
   são consultas e modelos de resultado diferentes. A tela de Pesquisa compõe as
   duas seções ("Resultados" e "Trechos encontrados").

## Consequências

- Migração `0008-content-search`, aditiva.
- A interface abre o PDF na página do trecho (`PdfViewer.initialPage`) e a aula
  no instante do trecho (`resumeTime`).
- Arquivos duplicados geram chunks duplicados, porque cada cópia é indexada.
  Agrupar os resultados pelo grupo de duplicatas fica como melhoria futura.
