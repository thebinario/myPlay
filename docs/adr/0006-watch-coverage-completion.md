# ADR 0006 — Conclusão de aulas por cobertura real

- **Status**: Aceito
- **Data**: 2026-11-21
- **Contexto**: a aula era marcada como concluída quando o `<video>` disparava
  `ended`, e quem gerava `completedAt` era o frontend. Arrastar a linha do tempo
  até o fim contava como "assistido", e a regra vivia na interface, contra o
  AGENTS.md §7.
- **Relacionado**: [`../ARCHITECTURE.md`](../ARCHITECTURE.md) §4.3,
  [`../TESTING_STRATEGY.md`](../TESTING_STRATEGY.md) §6.1.

## Decisão

1. **O backend decide a conclusão.** O renderer só encaminha trechos realmente
   reproduzidos (`progress.recordSegment {lessonId, fromMs, toMs, durationMs?}`),
   a cada ~10 s de mídia e ao pausar, buscar, trocar de aula ou desmontar.
2. **Cobertura em tempo de mídia.** `WatchCoverage` junta os intervalos (com
   tolerância de 1 s para a granularidade do `timeupdate`); reassistir não conta
   duas vezes, e a velocidade de reprodução não importa.
3. **Política:** concluída quando ≥ 90% da duração foi realmente reproduzida.
   Sem duração conhecida, a aula nunca conclui sozinha. A regra de "tolerância
   de créditos" foi descartada: os 10% restantes já cobrem abertura e créditos,
   e ela deixaria vídeos curtos permissivos demais.
4. **Duração:** a catalogada (`media_files.duration_ms`, do probe) tem
   prioridade; enquanto não existe probe, vale a informada pelo elemento de mídia.
5. **Origem da conclusão:** `completion_source` = `watched` | `manual` |
   `duplicate` | `legacy`. Uma conclusão existente nunca é desfeita pela
   cobertura; desmarcar limpa a conclusão e mantém a cobertura.
6. **Compatibilidade:** a migração `0006-watch-coverage` é aditiva; as linhas já
   concluídas viram `legacy`. `progress.savePlayback` continua existindo, mas só
   guarda o ponto de retomada (uma conclusão enviada pelo renderer é ignorada).
7. **Validação de entrada:** trechos com mais de 120 s são rejeitados, porque não
   podem vir de reprodução contínua com envio a cada ~10 s.

## Consequências

- "Assistido 62%" vem do read model (`watchedRatio` na árvore do curso e no
  `PlaybackProgress`); a interface só formata.
- O status do player no fim do vídeo mostra "Concluída" apenas quando o backend
  confirmou; caso contrário, "Fim do vídeo".
- A cobertura é a base para avisar sobre conteúdo duplicado já assistido
  (fase 2 do plano).
- Não é antifraude: um cliente modificado ainda pode enviar trechos falsos. O
  objetivo é refletir o uso honesto, não auditar.
