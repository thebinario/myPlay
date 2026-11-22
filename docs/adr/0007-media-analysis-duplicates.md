# ADR 0007 — Análise de mídia, executor de jobs e conteúdo duplicado

- **Status**: Aceito
- **Data**: 2026-11-21
- **Contexto**: a F04 previa "detecção de duplicatas por identidade", mas só
  existiam a coluna `media_files.sha256` e o nome de job `HASH_MEDIA`; nenhum
  executor de jobs rodava, e a duração das aulas dependia do player.
- **Relacionado**: [`0006-watch-coverage-completion.md`](0006-watch-coverage-completion.md).

## Decisão

1. **Executor de jobs persistido** (`modules/jobs/application/job-runner.ts`):
   - Executa um job por vez, para nunca competir com a reprodução.
   - Faz retry até 3 tentativas e salva checkpoint.
   - Reenfileira jobs que ficaram `running` em uma sessão interrompida.
   - Respeita a pausa e o recuo do `ResourceGovernor`.
   - Só o runtime desktop inicia o loop (`createMidoteca({ backgroundJobs: true })`); os testes usam `drain()`.
2. **Um job por fonte** (`media.analyze-source`), agendado no evento
   `index:completed`, em vez de um job por arquivo. A fila de trabalho é a própria
   coluna `analyzed_at IS NULL`: retomar é natural, e um arquivo modificado
   (tamanho ou mtime) é invalidado pelo scan e reanalisado.
3. **Análise em camadas, da mais barata para a mais cara**, sempre somente leitura:
   1. Probe da duração (ffprobe), que vira a duração oficial da aula.
   2. Hash parcial: sha256 do tamanho mais o primeiro e o último MiB.
   3. SHA-256 completo, só para arquivos com mesmo tamanho e mesmo hash parcial.
   4. Impressão perceptual (16 quadros 9×8 em tons de cinza, dHash), só para
      vídeos com duração parecida (±2 s) e hash diferente.
   - É recodificação quando pelo menos 90% dos quadros têm Hamming ≤ 10.
4. **Grupos são o fecho transitivo** de "mesmo sha256" e "vínculo perceptual"
   (`groupDuplicates`, puro). Tipo `exact` quando todos são cópias; `perceptual`
   quando algum membro foi casado por impressão.
5. **Nada é propagado automaticamente.** A árvore do curso expõe
   `watchedElsewhere` (a duplicata mais assistida, quando a aula não está
   concluída). Reaproveitar a conclusão é um comando explícito
   (`progress.markDuplicateAsWatched`), que o backend valida (as aulas precisam
   estar no mesmo grupo e a de origem precisa estar concluída) e grava com
   `completion_source = 'duplicate'`.
6. **Binários:** `ffmpeg-static` e `ffprobe-static` como dependências do núcleo,
   em `asarUnpack` no instalador; o caminho `app.asar` é trocado por
   `app.asar.unpacked` em tempo de execução.
7. **Reprodução tem prioridade:** o renderer envia `system.setPlaybackActive`, e o
   governor desacelera os jobs enquanto há vídeo tocando.

## Consequências

- Migração `0007-media-analysis`, aditiva: `partial_hash`, `analyzed_at`,
  `analysis_error`, `media_fingerprints` e `media_duplicate_links`.
- PDFs idênticos também são agrupados por hash; o agrupamento perceptual vale
  só para vídeos.
- A preferência `pauseTasksDuringPlayback` ainda não é lida pelo backend: o
  recuo é sempre aplicado. Ficou registrado como dívida.
