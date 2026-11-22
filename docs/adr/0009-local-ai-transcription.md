
# ADR 0009 — IA local sem configuração e transcrição com Whisper

- **Status**: Aceito
- **Data**: 2026-11-21
- **Contexto**: o produto deve oferecer recursos de IA (transcrição, busca
  semântica e assistente) **100% locais e sem configuração**: nada de serviço
  externo, chave de API ou instalação de Ollama. Aulas sem legenda não eram
  pesquisáveis pelo que é falado. O player também não exibia legendas reais (a
  sobreposição de CC mostrava um texto fixo de demonstração).
- **Relacionado**: [`0007-media-analysis-duplicates.md`](0007-media-analysis-duplicates.md),
  [`0008-content-search-fts5.md`](0008-content-search-fts5.md).

## Decisão

1. **Runtime no próprio processo**, sem serviço externo:
   - `@huggingface/transformers` 4.x (onnxruntime-node, CPU, pesos quantizados
     q8), carregado de forma tardia via `require` do build CommonJS.
   - Os modelos são **baixados automaticamente no primeiro uso** para
     `<appData>/models` e depois funcionam offline.
   - A integridade dos downloads fica a cargo do HTTPS e do Hugging Face Hub. O
     plano previa verificação própria de sha256, mas o transformers.js gerencia
     o download; isso fica como dívida.
2. **Whisper `onnx-community/whisper-base`** (~80 MB, multilíngue). Medido em CPU
   neste projeto: cerca de 8x o tempo real em fala de teste.
   - **A v4 não detecta o idioma** (assume inglês). O padrão passa a ser
     português (`ai.transcription.language`), o idioma do produto.
3. **Transcrição em janelas de 30 s** (ffmpeg → PCM 16 kHz mono, só a janela) com
   checkpoint `processed_ms`. Uma interrupção retoma da última janela concluída.
   - Na primeira falha, o job tenta de novo; na segunda, o vídeo é marcado
     `failed` e a fila segue.
   - A transcrição **espera a reprodução parar**
     (`ResourceGovernor.waitWhilePlaybackActive`), em vez de só desacelerar.
4. **Só vídeos com duração conhecida e sem legenda.** Cópias idênticas (mesmo
   sha256 da Fase 2) **reaproveitam** a transcrição, sem gastar CPU de novo.
5. **Nada é gravado junto às mídias**, nem em arquivos `.vtt` (diferente do
   plano): os trechos ficam em `transcript_segments` (migração `0009`, aditiva).
   O backend entrega ao player as legendas já interpretadas por
   `subtitles.forLesson` (arquivos SRT/VTT ao lado do vídeo e a transcrição),
   e o player só exibe o trecho do instante atual.
6. **Busca:** a extração de conteúdo indexa as transcrições prontas (`transcript`)
   como faz com as legendas. Ao fim da transcrição, a extração é reagendada.
7. **Controles:** `ai.status`, `ai.setEnabled` (ligado por padrão) e
   `ai.removeModels` (apaga só a pasta de modelos). O painel "IA local" em
   Processamento mostra o progresso do download e o espaço em disco.
8. **Empacotamento:** `onnxruntime-node`, `sharp` e `@img` em `asarUnpack`. O
   runtime desktop ativa com `createMidoteca({ localAi: true })`;
   `MIDOTECA_AI_CACHE` permite reaproveitar os modelos nos testes E2E.

## Consequências

- O alimentador de features do Whisper roda na thread JS do processo principal
  (dezenas de ms por janela de 30 s). A inferência ONNX roda em threads nativas.
  Mover para `worker_threads` ou `utilityProcess` fica registrado como dívida,
  caso a responsividade do IPC seja afetada em máquinas lentas.
- O modelo `base` erra termos técnicos ("Docker"); o `small` é a evolução
  natural, ao custo de cerca de 3x mais CPU.
- Legendas de arquivo, que antes não apareciam, passam a ser exibidas no player.
