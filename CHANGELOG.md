# Changelog

Todas as mudanças relevantes da Midoteca. Formato baseado em
[Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/), versões em
[SemVer](https://semver.org/lang/pt-BR/).

**Regras:**

- **Todo PR** registra o que adicionou, alterou ou corrigiu em `## [Unreleased]`
  (seções *Adicionado*, *Alterado*, *Corrigido*, *Removido*). Não mexe na versão.
- **Release** (build distribuído, inclusive beta de teste): um PR sobe a versão em
  `client/package.json` e renomeia `[Unreleased]` para `## [versão] - data`,
  abrindo um `[Unreleased]` vazio. Funcionalidade nova → *minor*; só correções →
  *patch*; incompatível → *major*. Enquanto o empacotado não for validado, a
  versão leva `-beta.N`, e N sobe a cada build de teste distribuído (não a cada PR).
- O CI (`npm run release:check`) bloqueia PRs que não cumprem isso.

## [Unreleased]

### Alterado

- **Pre-commit roda os testes:** além de formatar com Prettier, o hook roda os
  testes relacionados aos arquivos do commit (`midoteca/` e os projetos
  `unit`/`integration` de `client/`) e interrompe o commit se algum falhar.
  Funciona com o `better-sqlite3` compilado tanto para o Node quanto para o
  Electron.
- **ffmpeg configurável:** `MIDOTECA_FFMPEG_PATH` e `MIDOTECA_FFPROBE_PATH`
  apontam para outro ffmpeg/ffprobe (o padrão continua sendo o empacotado). A
  CI (Ubuntu 24.04) usa o ffmpeg da distribuição, porque o binário estático
  6.0 do `ffmpeg-static` dá SIGSEGV ao converter MPEG-TS para MP4 lá; o app
  para Windows não é afetado.

### Corrigido

- **Vídeo .ts não convertido no Windows:** se o antivírus (ou o indexador)
  segurava por um instante o MP4 recém-gerado, a cópia para o cache falhava e
  o player recebia o MPEG-TS original. Agora a operação é repetida algumas
  vezes, e quando a preparação falha o motivo vem junto do resultado.
- Testes do núcleo que falhavam no Windows (separador de caminho e criação de
  link simbólico) agora rodam em qualquer sistema.

## [1.2.0] - 2026-11-25

### Adicionado

- **Estudos: trilha de uma biblioteca inteira.** Ao criar uma trilha, o nome
  da biblioteca na lista também pode ser escolhido ("Biblioteca inteira"). O
  tempo assistido em qualquer curso dela entra nessa trilha (a trilha de um
  curso específico, se existir, tem prioridade) e "Continuar" abre a próxima
  aula do curso assistido por último na biblioteca. Migração 0014 (aditiva).

## [1.1.0] - 2026-11-25

### Adicionado

- **Estudos: cronograma e registro de tempo** (ícone de relógio na barra
  lateral). A aba **Hoje** responde "o que estudar agora" a qualquer hora —
  bloco em andamento, o que ficou pendente, o próximo ou "meta cumprida" — com
  atalho para continuar a próxima aula do curso ou abrir a plataforma. Tem
  cronômetro (que sobrevive a fechar o app), agenda do dia com progresso,
  registros do dia, resumo da semana e sequência de dias cumpridos. A aba
  **Cronograma** monta a semana em blocos (dias, horário, duração, atividade e
  foco); a aba **Trilhas** cadastra cursos da biblioteca e plataformas externas
  (atalhos para Hack The Box, HackingClub, TryHackMe e PortSwigger Academy).
  Ao criar a trilha de um curso, os cursos aparecem agrupados pela biblioteca
  (Biblioteca › Coleção › Curso, com módulos e aulas) e podem ser pesquisados
  pelo nome do curso, da coleção ou da biblioteca, sem diferenciar acentos.
  O tempo assistido no player entra sozinho no dia; o tempo estudado fora do
  app pode ser registrado manualmente. Links externos abrem no navegador do
  sistema.

### Alterado

- **A análise de pastas vem primeiro**: enquanto uma fonte é escaneada
  (importação ou "Reescanear"), transcrição, extração de texto, busca
  inteligente, análise de mídia e organização com IA esperam; quem já estava
  rodando pausa no próximo ponto seguro e continua quando o scan termina.

- **Nova barra lateral** (fiel ao protótipo): marca "Midoteca", Início,
  Biblioteca e Pesquisa (com o atalho `Ctrl K`), e no rodapé Configurações,
  "Recolher menu" e "Minha conta". O item atual fica em fundo neutro com uma
  marca branca na borda. Recolhida, mostra só os ícones, com o nome no tooltip;
  a escolha é lembrada entre aberturas do app. "Minha conta" indica
  "Sincronizado" ou "Atualizando…" (quando o núcleo está processando) e mostra a
  versão do app no tooltip.
- **Atividade virou um menu suspenso** no canto superior direito: botão redondo
  que gira enquanto há trabalho e abre o painel "Atividade" com o que está em
  andamento (com percentual), a fila e os últimos processos encerrados
  ("Concluído · há 2 min", "Falhou · há 1 h"). O núcleo guarda os últimos 5
  processos (escaneamentos e jobs) e passa a nomeá-los como "Transcrição ·
  Cursos", "Atualizando biblioteca · Cursos" etc.; trabalho sem nada a
  processar não entra no histórico.
- **Ícone próprio do app** (selo lilás com livro aberto, o mesmo da barra
  lateral) na janela, na barra de tarefas e no instalador, no lugar do ícone
  padrão do Electron.

### Corrigido

- **Curso importado pela própria pasta aparecia como vários cursos:** quando as
  pastas da raiz de uma biblioteca se chamam como módulos ("Módulo 1…",
  "01 Modulo 00…", "Section 2"…), a raiz agora é o curso e essas pastas viram
  seus módulos (antes cada módulo virava um curso). Ao reescanear, os cursos
  antigos são unidos ao novo, preservando progresso, conclusão e títulos
  editados; nenhum arquivo é alterado.
- **Biblioteca com um único curso abria direto nas aulas:** agora mostra o card
  do curso, como as demais bibliotecas.
- **Processamento parado em bibliotecas antigas:** a análise de duplicados, a
  extração de texto (busca) e a transcrição só eram agendadas ao fim de um
  escaneamento, então bibliotecas indexadas antes dessas funções ficavam com
  "0 analisados" e tudo na fila para sempre (e os modelos de IA nunca eram
  baixados). Agora o núcleo retoma esse processamento de cada biblioteca ao
  abrir o app; cada etapa só processa o que ainda está pendente.
- **Histórico de atividade por aula, com o motivo das falhas:** o menu
  "Atividade" passa a mostrar cada aula transcrita pelo título ("Transcrição ·
  Boas-vindas"), no lugar de uma linha genérica por biblioteca. Aulas, jobs e
  escaneamentos que falharam mostram a mensagem real do erro (ex.: "Áudio
  ilegível: Invalid data found…"), para diagnóstico.
- **Selo de transcrição na lista de aulas:** cada aula mostra "Transcrita",
  "Transcrevendo…" ou "Falha na transcrição" (com o motivo no tooltip), lido do
  estado persistido pelo núcleo — o diagnóstico sobrevive ao fechar o app.
- **`npm run dev` no Windows:** a verificação do better-sqlite3 e a
  recompilação para o Electron falhavam sempre (o Node recusa executar `.cmd`
  sem shell). O modo dev agora chama Electron, npm e Vite pelos executáveis
  reais e avisa para fechar o Midoteca se a recompilação falhar.

- **Ordem do catálogo:** cursos, coleções, seções, módulos e aulas seguem a
  numeração do nome: "Módulo 2" vem antes de "Módulo 10", e itens sem número
  ("Bônus", "Extras") vão para o fim da lista. A comparação ignora acentos e
  maiúsculas ("Modulo 2" fica junto de "Módulo 1" e "Módulo 3"). A ordem manual
  definida pelo usuário continua tendo prioridade. Quem decide é o núcleo; vale
  para as bibliotecas já indexadas, sem precisar reescanear.
- O player abre direto no diagnóstico certo quando o núcleo já sabe que o
  arquivo não toca: "Arquivo de vídeo danificado ou incompleto" (com orientação
  para copiar novamente o original) ou o codec incompatível exato.
- Um `.webm`/`.mp4` que não abre deixou de exibir "converta para MP4 ou WebM";
  a mensagem agora aponta arquivo danificado ou codec interno incompatível.

### Adicionado

- **Módulos em pastas planas**: cursos com todos os vídeos numa pasta só deixam
  de virar uma lista única. A indexação separa os módulos pelo que os nomes já
  dizem — "Lives", séries (`Websérie - … - Ep.N`) e marcadores
  `Aula NN - Módulo N` — e anexa cada material `Aula NN` ao módulo da aula.
  Bibliotecas já indexadas são reagrupadas no próximo rescan sem perder o
  progresso; aulas movidas pelo usuário ficam onde estão.
- **Reorganizar com IA**: na página do curso, a IA local (offline) propõe
  módulos por assunto para cursos que chegam como uma lista única. Roda em
  segundo plano (aparece em Atividade como "Organizando curso com IA"), mostra
  a proposta com as aulas de cada módulo e só muda algo quando você clica em
  "Aplicar sugestão". O progresso das aulas é mantido e os arquivos não são
  tocados; depois dá para ajustar em Editar Curso. Em máquinas com 16 GB de
  RAM o app passa a usar o Qwen 2.5 7B (4,7 GB) como modelo local.
- **Reescanear fonte**: botão "Reescanear" no card de cada fonte em
  Configurações. Analisa de novo só aquela pasta (o progresso aparece no painel
  de importação) e aplica a organização atual sem reimportar a biblioteca.
- Versão do app visível no rodapé da barra lateral; um clique abre
  Configurações, onde fica o Sobre.
- **Atividade em segundo plano:** um ícone animado na barra lateral mostra
  quantas tarefas estão rodando. Ao passar o mouse, aparece a lista do que está
  sendo processado: escaneamento de bibliotecas, análise de mídias, transcrição,
  indexação de textos e preparação da busca inteligente. Cada item mostra o
  arquivo atual e o percentual, e as tarefas na fila aparecem como "Na fila".
  O indicador some quando nada está em processamento.
- Rótulos, percentuais e ordem vêm prontos do núcleo (`activity.list` e o
  evento `activity:changed`); a interface só apresenta.
- **Verificação dos vídeos:** em segundo plano, o núcleo lê cada vídeo com o
  ffprobe (sem decodificar nem alterar o arquivo) e classifica como
  reproduzível, formato incompatível (ex.: HEVC, AC-3, AVI) ou danificado.
  Bibliotecas já indexadas também são verificadas automaticamente. O
  progresso aparece no indicador de atividade como "Verificando vídeos".
- Selo "Arquivo danificado" / "Formato incompatível" na lista de aulas.

## [1.1.0-beta.2] - 2026-11-21

### Adicionado

- **Conteúdo duplicado:** análise em segundo plano (duração, hash e impressão
  perceptual) detecta cópias idênticas e vídeos recodificados.
- Aviso "Já assistido em…" na aula, com "Marcar como vista" por ação explícita.
- Painel de duplicatas em Configurações → Processamento.
- A análise pausa enquanto um vídeo está sendo reproduzido.

## [1.1.0-beta.1] - 2026-11-21

### Alterado

- **Aula concluída só quando realmente assistida:** a conclusão automática
  passou a exigir ≥ 90% da mídia reproduzida. Arrastar até o fim não conclui mais;
  quem decide é o núcleo, não o player.
- A tela de fim do vídeo mostra "Fim do vídeo", separado de "Concluída".
- Aulas concluídas antes desta versão permanecem concluídas (origem `legacy`).

### Adicionado

- Selo "Assistido N%" nas aulas e marcação manual de conclusão com a origem
  registrada (`watched`, `manual`, `legacy`).
- A versão exibida em Configurações → Sobre vem do `package.json`.

## [1.0.0] - 2026-10-18

- Lançamento do MVP desktop: bibliotecas locais, cursos, player, leitor PDF,
  busca, configurações e instalador Windows.
