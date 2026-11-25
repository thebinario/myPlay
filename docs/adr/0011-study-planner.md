# ADR 0011 — Cronograma de estudos e registro de tempo

- **Status**: Aceito
- **Data**: 2026-11-25
- **Contexto**: a pessoa quer abrir o app a qualquer hora e já saber **o que
  estudar agora**, sem precisar decidir (e procrastinar). O estudo acontece nos
  cursos da biblioteca e também fora dela: Hack The Box, HackingClub e outras
  plataformas com aulas e labs. O tempo de estudo precisa ser medido por dia,
  com cronômetro, registro manual e o tempo assistido no player.
- **Relacionado**: [`0006-watch-coverage-completion.md`](0006-watch-coverage-completion.md).

## Decisão

1. **Novo bounded context `study`** no núcleo (`midoteca/src/modules/study/`)
   e no desktop (`client/src/modules/study/`). O backend é a fonte de verdade
   de todas as decisões; a interface só apresenta e envia comandos.
2. **Modelo**:
   - **Trilha** (`StudyTrack`): o que se estuda — curso da biblioteca
     (`course`, uma trilha ativa por curso), plataforma externa (`external`,
     com nome da plataforma e link) ou outro (`other`). Trilhas são
     **arquivadas, nunca apagadas**, para manter o histórico de tempo.
   - **Cronograma semanal** (`StudyBlock`): blocos recorrentes por dia da
     semana, com início, duração, atividade (aula, lab, leitura…) e foco. É
     salvo **inteiro** e validado como um todo: sem sobreposição no mesmo dia,
     dentro do dia (não cruza a meia-noite), 5–720 min, só trilhas ativas.
   - **Registro** (`StudySession`): tempo por trilha e **dia local**
     (`AAAA-MM-DD`), com origem `timer`, `manual` ou `player`.
   - **Cronômetro** (`study_timer`): no máximo um, **persistido** (sobrevive a
     fechar o app). Iniciar outra trilha fecha o atual; menos de 1 min é
     descartado; mais de 12 h é limitado (esquecimento).
3. **"O que estudar agora"** (`buildDayPlan`, regra pura): o tempo registrado
   de uma trilha preenche os blocos dela em ordem (adiantar conta). Cada bloco
   fica `done`, `now`, `upcoming` ou `missed`, e o foco é único, nesta ordem:
   bloco em andamento → recuperar o pendente mais antigo → próximo bloco →
   dia concluído; sem blocos, o dia é livre.
4. **Tempo do player**: o contexto `progress` ganhou a porta opcional
   `PlaybackActivityObserver`. Cada trecho realmente reproduzido é creditado à
   trilha do curso no dia (criada ou restaurada no primeiro uso), numa linha
   agregada por trilha e dia. Com o cronômetro ligado, o player não soma de novo.
   Falhas do observador nunca afetam o progresso da aula. Cursos de bibliotecas
   de filmes não contam.
5. **Registro manual**: datas passadas permitidas, futuro não; 1–720 min por
   registro; o total de um dia nunca passa de 24 h.
6. **Semana e sequência**: `study.week` resume segunda a domingo (planejado ×
   feito) e conta os dias seguidos em que todo o planejado foi cumprido. Dias
   sem plano não contam nem quebram; hoje só conta depois de cumprido.
7. **Persistência**: migração `0013-study-planner`, puramente aditiva. A trilha
   de um curso removido mantém o histórico (`course_id` vira `NULL`).
8. **Desktop**: métodos `study.*` no contrato RPC; links externos (`target=_blank`)
   abrem no navegador do sistema (`shell.openExternal`), nunca numa janela do app.

## Consequências

- A tela "Estudos" (ícone de relógio na barra lateral) tem três abas: **Hoje**
  (foco, cronômetro, agenda, registros, semana), **Cronograma** (rascunho local
  da semana, salvo de uma vez) e **Trilhas**.
- A interface relê o dia a cada minuto para o foco acompanhar o relógio; o
  cronômetro "anda" na tela a partir do `elapsedMs` entregue pelo núcleo.

## Limitações conhecidas

- Dias passados são avaliados contra o **cronograma atual** (não há histórico
  de versões do cronograma); mudar a semana pode alterar a sequência exibida.
- O tempo do player é tempo de mídia: em 2× conta o dobro do tempo de relógio.
- Uma sessão de cronômetro que passa da meia-noite fica inteira no dia em que
  começou.
