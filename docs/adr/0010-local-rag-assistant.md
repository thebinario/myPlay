# ADR 0010 — Busca semântica e assistente local com citações (RAG)

- **Status**: Aceito
- **Data**: 2026-11-21
- **Contexto**: com o texto de PDFs, legendas e transcrições indexado (ADRs 0008
  e 0009), a pessoa quer perguntar em linguagem natural e receber respostas
  baseadas na própria biblioteca, **localmente e sem configuração**.
- **Relacionado**: [`0009-local-ai-transcription.md`](0009-local-ai-transcription.md).

## Decisão

1. **Embeddings locais:** `Xenova/multilingual-e5-small` (384 dimensões, ~120 MB
   q8, bom em português, prefixos `query:`/`passage:`), via transformers.js. O
   job `search.embed-chunks` (global, deduplicado) roda depois de cada extração
   e espera a reprodução parar.
2. **Índice vetorial em força bruta:** vetores float32 em `chunk_embeddings`
   (migração `0010`, aditiva, `ON DELETE CASCADE` com o chunk) e cosseno sobre um
   cache em memória, recarregado quando a tabela muda. Uma biblioteca pessoal
   (dezenas de milhares de trechos) cabe em poucos ms; trocar por `sqlite-vec`
   afeta só `SqliteEmbeddings`.
3. **Recuperação híbrida** (`RetrieveContext`):
   - BM25 em qualquer termo relevante (com stopwords removidas) mais a
     similaridade vetorial, fundidos por Reciprocal Rank Fusion.
   - **Portão de relevância:** sem nenhum acerto por palavra, só contam
     resultados vetoriais acima do `minSimilarity` do modelo. Para o E5, a
     medição com o modelo real em português deu 0,77–0,82 para trechos sem
     relação e 0,85–0,90 para relacionados; o limiar é 0,845. Assim, perguntas
     fora da biblioteca não recuperam nada.
   - Escopo opcional por curso, aula ou documento (vídeos das aulas e PDFs
     vinculados).
4. **Geração local:** `node-llama-cpp` (llama.cpp com binários pré-compilados;
   GPU via Vulkan/CUDA quando há, senão CPU) com Qwen2.5-Instruct GGUF Q4_K_M:
   - 3B com ≥ 8 GB de RAM, senão 1.5B (`MIDOTECA_LLM_MODEL` sobrescreve, por
     exemplo nos testes).
   - Baixado no primeiro uso; uma geração por vez; contexto de 4096 tokens,
     até 512 tokens de resposta, temperatura 0,2.
5. **Respostas fundamentadas** (`modules/assistant`):
   - O prompt traz os trechos numerados e exige "somente as fontes, citar [n]".
   - `extractCitations` descarta citações a fontes não recuperadas.
   - Sem fontes, a resposta é "Não encontrei…" **sem chamar o modelo**.
   - Cada citação traz `lessonId` + `startMs` ou `documentId` + `page`.
6. **Streaming:** `assistant.ask` devolve `{ requestId }` na hora; tokens e
   resultado chegam pelos eventos `assistant:token`, `assistant:done` e
   `assistant:error`, já repassados ao renderer. `assistant.cancel` interrompe a
   geração.
7. **Interface:** "Perguntar à biblioteca" na Pesquisa, composto pelo shell por
   slot (sem import entre apresentações de contextos diferentes). As citações
   abrem o vídeo no instante ou o PDF na página.

## Consequências

- Download total no primeiro uso: ~2,3 GB (LLM 3B mais embeddings mais
  Whisper). O painel "IA local" mostra progresso e espaço, e permite remover.
- Os eventos do assistente entraram no `LibraryEvent` do contexto `indexing`,
  que hoje faz o papel de barramento da aplicação. Mover o barramento para
  `platform/events` com tipos por contexto fica como dívida.
- O atalho no player com escopo da aula atual ficou para depois; o contrato já
  aceita `scope.lessonId`.
