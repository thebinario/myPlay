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

### Corrigido

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
