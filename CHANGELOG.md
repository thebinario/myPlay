# Changelog

Todas as mudanças relevantes da Midoteca. Formato baseado em
[Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/), versões em
[SemVer](https://semver.org/lang/pt-BR/).

**Regra:** todo PR sobe a versão em `client/package.json` (funcionalidade nova
compatível → *minor*; correção → *patch*; mudança incompatível → *major*; antes de
validar o release empacotado → `-beta.N`) e acrescenta aqui a seção da nova
versão. O CI (`npm run release:check`) bloqueia PRs sem isso.

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
