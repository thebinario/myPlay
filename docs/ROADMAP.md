# Roadmap mestre — Midoteca / myPlay

> Plano mestre **2026–2027**. Desktop · **offline-first** · DDD + TDD + Clean
> Architecture + Hexagonal.
>
> Documento de produto e de arquitetura. Para o recorte de **refatoração
> incremental** (o que migrar primeiro no código existente), ver
> [`REFACTORING_ROADMAP.md`](REFACTORING_ROADMAP.md). Regras permanentes em
> [`../AGENTS.md`](../AGENTS.md); fronteiras em [`ARCHITECTURE.md`](ARCHITECTURE.md)
> e [`DDD_GUIDELINES.md`](DDD_GUIDELINES.md).

A Midoteca será uma **biblioteca pessoal inteligente** para vídeos, filmes,
cursos e documentos, capaz de organizar conteúdo de HDs internos e externos,
preservar o progresso de reprodução e leitura e, futuramente, usar armazenamento
em nuvem.

O objetivo **não é apenas ter um player**. É construir uma aplicação desktop
**confiável, extensível e fácil de usar**, mantendo a interface minimalista
mesmo quando as funcionalidades internas ficarem sofisticadas.

O projeto é dividido em **15 fases** distribuídas em **quatro versões**. Não se
deve tentar concluir tudo numa única implementação nem transformar todos os
arquivos legados de uma vez.

---

## 1. Visão geral das versões

| Versão | Tema | Escopo |
| --- | --- | --- |
| **v0.1 — Fundação** | base em evolução contínua | Arquitetura progressiva, testes, Storybook, estado consistente e serviços desacoplados |
| **v0.5 — Biblioteca local funcional** | produto | Indexação de HDs, catálogo persistente, cursos, player real, leitor PDF e recuperação de fontes |
| **v1.0 — Lançamento estável** | distribuição | Instalação desktop, onboarding, central de novidades com badge, modal de grandes mudanças, preferências no SQLite, desempenho e recuperação |
| **v2.0 — Expansão** | pós-MVP | Armazenamento em nuvem, múltiplas fontes de mídia, sincronização opcional, gestão de contas/perfis (Admin/Usuário), controle de acesso a conteúdos, submissão de PDFs para avaliação com notas, edição avançada de PDFs e recursos inteligentes |

## 2. Estado atual do projeto

Snapshot revisado em **18/10/2026**. O produto atingiu com sucesso o marco da
**v1.0 — Lançamento estável (MVP concluído e validado)**. Todas as
funcionalidades fundamentais das Fases 00 a 11 estão integradas e testadas em
produção com persistência unificada no SQLite via IPC. A instalação desktop foi
validada em máquina real com Windows 11.

| Área | Estado verificado | Próximo objetivo | Evidência |
| --- | --- | --- | --- |
| Catálogo e fontes | SQLite e IPC reais para catálogo e fontes; persistência e recuperação validadas | manter monitoramento de integridade e evolução v2.0 | `client/src/modules/library/infrastructure/ipc/`; `midoteca/src/platform/desktop/` |
| Indexação | Varredura real no núcleo com descoberta incremental de vídeos, cursos e PDFs | refinamento de performance para diretórios gigantes | `midoteca/src/modules/indexing/` |
| Cursos e materiais | Organização hierárquica (curso/módulo/aula/documento), reordenação persistente | expansão para recursos colaborativos (v2.0) | `midoteca/src/modules/courses/` |
| Métricas do curso | Duração, contagem de PDFs e percentuais consolidados no read model do SQLite | manter cache e integridade | `CourseTree` e `SqliteCourseRepository` |
| Player | Reprodução local real via `midoteca-media://`, persistência de posição, duração e conclusão no SQLite via `progress.savePlayback` | legendas automáticas e transcrição (v2.0) | `client/src/modules/library/infrastructure/ipc/ipc-library-repository.ts` |
| Leitor PDF | PDF.js real com persistência de página, zoom, rolagem e tema escuro no SQLite via `progress.saveReading` | edição de PDF com seleção de área e texto (v2.0) | `client/src/modules/documents/` e `ipc-library-repository.ts` |
| Busca e Início | Busca unificada e tela inicial conectadas a consultas nativas reais no SQLite | busca semântica / IA (v2.0) | `catalog.search`; `catalog.home` |
| Configurações | Preferências do aplicativo e primeiro acesso (onboarding) persistidos no SQLite via `IpcPreferencesRepository` e `IpcOnboardingRepository` | perfis de usuários e permissões RBAC (Fase 14) | `client/src/modules/settings/infrastructure/ipc/` |
| Validação e testes | 540 testes automatizados passando (402 no frontend e 138 no núcleo backend); ABI nativo do SQLite 100% estabilizado | testes E2E complementares contínuos | `client/test/`, `midoteca/test/` |
| Distribuição desktop | Build de empacotamento testado e instalado com sucesso em máquina real Windows 11 | automação contínua de CI/CD para releases | `client/scripts/desktop-release.cjs` |
| Nuvem / Multi-usuário | Planejado para a v2.0 (Fases 12 a 14) | iniciar desenvolvimento pós-MVP | roadmap v2.0 |

**Fase atual:** v1.0 concluída (MVP pronto e operacional). O projeto está apto
para distribuição desktop estável e preparado para a evolução para a Versão 2.0
(Nuvem, Edição Avançada de PDFs, Multi-usuário e Avaliação).

## 3. Cronograma indicativo

Estimativa para planejamento, **não** promessa de entrega. Uma pessoa
desenvolvendo com auxílio de agentes de IA, integração incremental e testes.
Algumas fases podem correr em paralelo após a estabilização da arquitetura.

Horizonte aproximado: **32 semanas**.

| Fase | Semanas (indicativo) | Versão |
| --- | --- | --- |
| F00 · Auditoria e baseline | S1 | v0.1 |
| F01 · Arquitetura e estado | S1–S3 | v0.1 |
| F02 · Componentes + Storybook | S3–S8 (contínua) | v0.1 |
| F03 · Desktop e catálogo | S8–S11 | v0.5 |
| F04 · Importação incremental | S11–S14 | v0.5 |
| F05 · Cursos e edição real | S14–S17 | v0.5 |
| F06 · Player real | S17–S20 | v0.5 |
| F07 · PDF real | S20–S22 | v0.5 |
| F08 · Busca e início | S22–S24 | v0.5 |
| F09 · Configurações, novidades e recuperação | S24–S27 | v1.0 |
| F10 · QA e performance | S27–S30 | v1.0 |
| F11 · Distribuição desktop | S30–S32 | v1.0 |
| F12 · Nuvem opcional | S32+ | v2.0 |
| F13 · Automação e IA | pós-v1.0 (opcional) | v2.0 |
| F14 · Multi-usuário, permissões e avaliação | pós-v1.0 (v2.0) | v2.0 |

```text
S1        S8             S16            S24         S32
|---------|--------------|--------------|-----------|
 F00-F02 ──► v0.1   F03──F08 ──► v0.5   F09-F11 ──► v1.0   F12-F14 ──► v2.0
```

O calendário real será ajustado após a auditoria e a medição da velocidade de
entrega.

---

## 4. Roadmap detalhado por fase

### Versão 0.1 — Fundação e arquitetura

#### Fase 00 — Auditoria técnica e estabilização · *imediata*

**Objetivo:** estabelecer uma referência confiável antes das mudanças.

**Entregas**

- Inventário de funcionalidades, mocks, componentes e serviços reais.
- Mapa de dependências entre frontend, backend e Tauri.
- Baseline de testes, TypeScript, build e Storybook.
- Identificação de arquivos grandes, duplicações e dependências circulares.
- Registro dos problemas conhecidos, classificados por gravidade.
- Revisão de comandos, credenciais de desenvolvimento e configuração de ambiente.

**Aceite:** inventário técnico verificável, testes existentes executados e
nenhuma funcionalidade alterada.

#### Fase 01 — DDD + Clean Architecture + Hexagonal

**Objetivo:** estabelecer limites claros **sem reescrever tudo**.

**Entregas**

- Definição dos contextos de Biblioteca, Cursos, Reprodução, Documentos e Fontes de Mídia.
- Domínio independente de React, NestJS e APIs nativas.
- Casos de uso para comportamentos significativos.
- Portas de persistência e acesso a arquivos.
- Adaptadores mockados que preservem os comportamentos atuais.
- Correção da fonte única de verdade.
- Testes que garantam consistência entre telas.
- Convenções em `AGENTS.md` e `GEMINI.md`, conforme aplicável.

**Aceite:** editar um curso, concluir uma aula e atualizar seu progresso produzem
resultados **consistentes em todas as telas**, sem duplicação de estado.

#### Fase 02 — Componentização e Storybook

**Objetivo:** reduzir responsabilidades concentradas em componentes grandes.

**Entregas**

- Extração de componentes reutilizáveis reais.
- Hooks para lógica de apresentação.
- Componentes isolados para busca, editor, player e PDF.
- Stories de estados `default`, `loading`, `empty` e `error`, quando pertinentes.
- Testes de interação e acessibilidade.
- Consolidação dos tokens de design.
- Verificação visual dos componentes em diferentes larguras.

**Aceite:** as principais partes visuais podem ser testadas isoladamente, e as
funcionalidades anteriores continuam passando nos testes.

> Esta fase inicia na v0.1 e **continua como prática obrigatória** em todas as
> versões seguintes.

### Versão 0.5 — Biblioteca local realmente funcional

#### Fase 03 — Plataforma desktop e catálogo persistente

**Entregas**

- Verificar e consolidar a integração Tauri.
- Comunicação segura entre React e funcionalidades nativas.
- Escolha de diretórios por seletor do sistema.
- Banco de dados local adequado ao modo offline-first.
- Migrações de esquema e integridade transacional.
- Persistência de biblioteca, cursos, fontes, histórico e preferências.
- Identidade estável de itens e fontes, sem depender exclusivamente do caminho do HD.
- Adaptadores que mantenham o código independente do banco escolhido.

**Aceite:** ao fechar e reabrir o aplicativo, biblioteca e progresso permanecem;
desconectar um HD **não apaga** seu catálogo.

#### Fase 04 — Descoberta e indexação incremental

**Entregas**

- Importação de pastas e unidades externas.
- Detecção de formatos de vídeo, pastas de cursos, legendas e PDFs.
- Descoberta incremental: primeiros resultados aparecem antes de terminar a varredura.
- Extração progressiva de metadados e capas.
- Controle de pausa, retomada, cancelamento e retry.
- Detecção de duplicatas por identidade e verificações progressivas.
- Tratamento de arquivos inacessíveis e nomes problemáticos.
- Limites de concorrência, memória e uso de disco.
- Monitoramento de fontes conectadas e desconectadas.

**Aceite:** a pessoa começa a navegar e assistir ao conteúdo já descoberto
enquanto a indexação continua, **sem interferir perceptivelmente** na reprodução.

#### Fase 05 — Cursos e organização real

**Entregas**

- Organização Curso → Módulos → Aulas → Materiais.
- Reconhecimento de estruturas de pastas.
- Renomeação inline e reordenação real por drag-and-drop.
- Movimentação de aulas entre módulos.
- Salvamento persistente, desfazer e tratamento de conflitos.
- Progresso por aula e curso.
- Associação de vídeos, legendas e PDFs.
- Separação entre organização lógica e arquivos físicos.

**Aceite:** reorganizar um curso inteiro **sem mover ou renomear** os arquivos
originais; tudo é restaurado após reiniciar.

#### Fase 06 — Player de vídeo real

**Entregas**

- Reprodução de arquivos locais usando a arquitetura desktop.
- Suporte aos formatos e codecs compatíveis com o motor escolhido.
- Streaming com suporte a intervalos de bytes quando necessário.
- Play, pause, seek, volume, velocidade e tela cheia.
- Retomada da posição por vídeo e aula.
- Controles automáticos de próximo/anterior.
- Legendas externas e seleção por menu CC flutuante.
- Ajuste de idioma, atraso e preferências de legendas.
- Estados de buffering, falha e arquivo indisponível.
- Política de desempenho que priorize a reprodução.

**Aceite:** vídeos reais reproduzem com navegação, retomada e legendas; formatos
não suportados mostram mensagens claras, **sem prometer compatibilidade universal**.

#### Fase 07 — Leitor PDF real

**Entregas**

- Integração com mecanismo real de renderização (ex.: PDF.js).
- Acesso parcial ao arquivo, quando suportado pela fonte.
- Renderização sob demanda, sem carregar páginas desnecessárias.
- Memória e cache controlados.
- Zoom, paginação e rolagem.
- Retomada precisa de página, posição relativa e zoom.
- Modo escuro que realmente modifica a representação visual do documento.
- Alternância para cores originais.
- Tratamento de arquivos grandes, corrompidos e indisponíveis.

**Aceite:** abrir um PDF real, ler parte de uma página, fechar e retornar ao
**mesmo ponto** com zoom e aparência preservados.

#### Evolução futura — Edição de PDF · *pós-MVP*

**História de usuário:**
- *Como usuário do projeto, quero poder editar um PDF selecionando uma área e editar em texto, fazer notas e etc.*

**Entregas planejadas**

- Seleção de área específica da página/documento (caixa delimitadora / retângulo de interesse).
- Edição e inserção de texto na área selecionada, com suporte a tipografia, cores e alinhamento.
- Criação e gestão de notas (sticky notes, anotações contextuais, comentários e marcações).
- Anotações, marcações e destaques associados às páginas do documento.
- Persistência das alterações entre sessões e na biblioteca local (camada não destrutiva).
- Exportação de uma cópia editada, mantendo o PDF de origem intacto.
- Indicação clara de alterações pendentes e tratamento de falhas ao salvar.
- Integração da cópia editada com o fluxo de submissão para avaliação (Fase 14).

**Aceite:** selecionar uma área do PDF, editar/inserir texto e notas, salvar mantendo o arquivo original protegido, reabrir preservando as edições e poder exportar a versão editada.

#### Fase 08 — Pesquisa universal e Início

**Entregas**

- Pesquisa unificada de cursos, módulos, aulas, filmes e PDFs.
- Índice local persistente e atualizado incrementalmente.
- Filtros simples e resultados agrupados.
- Atalho Ctrl/Cmd + K.
- Pesquisa funcional **mesmo com HD desconectado**.
- Página Início com “Continuar assistindo” e “Continuar lendo”.
- Conteúdos recentes e acesso rápido.
- Estados vazios realmente úteis.

**Aceite:** encontrar qualquer conteúdo catalogado e navegar até ele **sem
depender de mocks**.

### Versão 1.0 — Confiabilidade e distribuição

#### Fase 09 — Onboarding, configurações, novidades e recuperação

**Histórias de usuário:**

- **Como usuário do projeto:** quero ver um ícone com badge de notificação quando algo novo for feito ou atualizado no projeto, e que a badge desapareça após eu visualizar essas novidades.
- **Como usuário do projeto:** quando houver uma alteração grande que mude a forma de mexer no produto (nova tela, novo menu ou nova ação), quero ver um modal explicativo ensinando como interagir, com breves descrições e gerado automaticamente a partir das alterações, sem exigir capturas de tela manuais.

**Entregas**

- Primeiro uso guiado sem excesso de etapas.
- Adicionar, remover e gerenciar fontes de biblioteca.
- Preferências de Player, PDF, aparência e indexação persistidas no SQLite.
- **Ícone e Badge de Novidades ("O que há de novo"):**
  - Ícone na interface com indicador visual (badge/notificação) indicando novas atualizações ou recursos disponíveis.
  - Ao abrir e visualizar o resumo de novidades, a badge é dispensada automaticamente (estado `last_seen_version` persistido no SQLite).
- **Modal Guiado de Grandes Mudanças / Feature Tour Automatizado (escopo MVP):**
  - Componente modal reutilizável disparado ao abrir versão com grandes alterações de fluxo ou interface (nova tela, novo menu ou novas ações).
  - Conteúdo gerado de forma declarativa/automática a partir de um registro de metadados das novidades (título, breve descrição objetiva e ação em destaque), sem dependência de prints/screenshots manuais.
  - Possibilidade de dispensar ou rever o guia a qualquer momento pelo menu de ajuda/configurações.
- HD desconectado com catálogo preservado.
- Reconexão que reconheça a unidade **sem duplicar** conteúdo.
- Tratamento de permissões e caminhos alterados.
- Mensagens discretas de recuperação.
- Estados globais de erro, carregamento e indisponibilidade.
- Exportação e restauração de catálogo e preferências.

**Aceite:** desconectar e reconectar unidades, reiniciar o aplicativo, recuperar falhas comuns sem perda de organização, receber indicador visual de novas atualizações (badge dispensável ao visualizar) e ser guiado por modal explicativo ao ocorrerem mudanças estruturais de navegação, telas ou menus.

#### Fase 10 — Qualidade, desempenho e acessibilidade

**Entregas**

- Testes unitários e de domínio.
- Testes de contrato entre portas e adaptadores.
- Testes de integração com banco e sistema de arquivos isolado.
- Testes E2E com Playwright.
- Storybook com cobertura dos componentes compartilhados importantes.
- Testes de teclado e acessibilidade.
- Cenários de biblioteca vazia, grande, parcialmente offline e corrompida.
- Profiling de memória, CPU e I/O.
- Proteção contra regressões visuais.
- Verificação de segurança de caminhos, permissões e dados locais.

**Aceite:** os principais fluxos funcionam de maneira repetível, inclusive após
falhas controladas, com orçamento de desempenho definido a partir de **medições
reais**.

#### Fase 11 — Empacotamento e lançamento desktop

**Entregas**

- Instalador e executável para os sistemas operacionais escolhidos.
- Verificação das dependências nativas de mídia.
- Identidade visual final e ícones.
- Assinatura de código quando necessária e viável.
- Processo de atualização seguro, com rollback quando aplicável.
- README técnico atualizado.
- Guia de instalação e resolução de problemas.
- Release candidate testada em máquinas reais.
- Licenças e obrigações de dependências verificadas.

**Aceite:** instalar, abrir, importar, assistir, ler e recuperar a biblioteca
**sem precisar configurar manualmente** um servidor de desenvolvimento.

**Estado (Concluído e Validado ✅):** Pipeline de release (`desktop:release`)
ativo e integrado. Empacotamento com NSIS e versão portátil gerados com
verificação automatizada de integridade (hashes SHA256) e smoke test do
executável real. **Instalação e execução validadas com sucesso em máquina real com
Windows 11**, operando perfeitamente sem necessidade de ambiente de
desenvolvimento. Aceite da Fase 11 e do marco v1.0 (MVP) atingido.

### Versão 2.0 — Recursos opcionais

#### Fase 12 — Armazenamento em nuvem e múltiplas fontes

**Entregas**

- Porta `CloudStorageProvider`.
- Adaptadores S3 compatíveis.
- Prova de conceito com Backblaze B2 ou alternativa contratada.
- Upload em partes, retomada e verificação de integridade.
- Reprodução por streaming com autenticação.
- Cache local controlado.
- Seleção automática entre HD e nuvem.
- Indicadores de disponibilidade e custos de tráfego.
- Política explícita de privacidade e upload autorizado.
- Armazenamento seguro das credenciais.

**Aceite:** um vídeo próprio ou autorizado pode ser reproduzido da nuvem quando
sua cópia local não está disponível, **sem alterar os controles do Player**.

#### Fase 13 — Automação de documentação e recursos inteligentes

**Entregas (opcionais)**

- Documentação automática integrada ao Storybook.
- Changelog semiautomático e atualização controlada do README.
- Capturas reais de telas em pipeline.
- CI/CD e relatórios por pull request.
- Transcrição de áudio e legendas geradas.
- Tradução de legendas.
- Pesquisa por conteúdo transcrito.
- Enriquecimento local de metadados.
- Recursos inteligentes executados localmente quando possível.

**Aceite:** cada recurso opcional possui **custo, privacidade, desempenho e
experiência validados** antes de ser incorporado ao produto.

> Blockchain, IPFS, Telegram e distribuição P2P ficam **fora do caminho
> crítico**. Só devem ser considerados se resolverem um problema que provedores
> convencionais não resolvam.

#### Fase 14 — Gestão de contas, controle de acesso e avaliação de PDFs

**Objetivo:** Suportar múltiplos perfis de usuário (administrador e usuário comum), controle de permissões de acesso a conteúdos e fluxo avaliativo com submissão de PDFs editados e atribuição de notas.

**Histórias de usuário:**

- **Como usuário administrador:** quero ter a possibilidade de ser administrador e criar contas nesse projeto.
- **Como usuário não administrador:** quero usar conteúdos que o administrador me deu acesso.
- **Como usuário não administrador:** quero poder enviar algo que fiz em PDF editado para o administrador avaliar e dar uma nota.
- **Como usuário administrador:** quero poder avaliar o PDF editado enviado pelo usuário e atribuir uma nota com parecer/feedback.

**Entregas**

- Módulo de autenticação e perfis de usuário (RBAC: Administrador e Usuário comum).
- Gestão de contas: criação, listagem, edição de credenciais e desativação de contas pelo administrador.
- Controle de acesso granular a conteúdos: concessão de permissões pelo administrador por curso, módulo, documento ou mídia.
- Visão restrita para usuário não administrador: catálogo, buscas e navegação filtram estritamente os conteúdos aos quais o usuário recebeu permissão explícita.
- Módulo de submissão de atividades: envio do PDF editado pelo usuário não administrador com registro de data, versão e status.
- Painel de avaliação do administrador: fila de submissões pendentes, visualização do PDF editado entregue, atribuição de nota (numérica/conceito) e parecer avaliativo.
- Consulta de avaliação: interface para o usuário não administrador consultar a nota recebida, observações do administrador e histórico de submissões.

**Aceite:** um usuário administrador cria uma conta para um usuário não administrador e concede acesso a conteúdos específicos; o usuário autenticado visualiza apenas esses conteúdos, edita um PDF e o envia para avaliação; o administrador visualiza a entrega, atribui nota e devolve o feedback, que fica visível ao usuário.

---

## 5. Arquitetura-alvo

> **Fonte única de verdade do alvo:** [`ARCHITECTURE.md`](ARCHITECTURE.md) — o
> mesmo modelo vale para **backend e frontend** (camadas, pastas e regras de
> dependência idênticas). O que segue é o resumo.

Implementada por **contextos de domínio**, com as dependências voltadas para as
regras do sistema.

```text
MIDOTECA
│
├── app/                     # composition root + shell
├── core/                    # kernel: domain compartilhado + contratos + erros/validação/config
├── modules/                 # um por bounded context (backend e frontend)
│   ├── library/  courses/  documents/  media/  progress/
│   ├── indexing/  search/  jobs/  settings/
│   ├── home/  player/       # contextos de interface (frontend)
│   └── <contexto>/{domain,application,infrastructure,presentation}
├── shared/                  # ui/ · providers/ (seams de DI) · testing/ (sem regra de negócio)
└── platform/                # adapters técnicos compartilhados por 2+ contextos
    ├── persistence/ · fs/ · events/
    └── desktop/ · cloud/
```

Dentro de um módulo relevante:

```text
courses/
├── domain/                  # entities.ts · types.ts · errors.ts · events.ts
│   ├── repositories.ts      #   contratos de repositório + comandos (CreateX)
│   ├── contracts.ts         #   demais contratos externos
│   └── organization.ts      #   regra pura / domain service
├── application/
│   ├── use-cases/           # escrita: 1 arquivo por operação (+ input/output)
│   ├── queries/             # leitura: 1 arquivo por consulta (+ read model)
│   ├── dependencies.ts      # deps compartilhadas por 2+ operações
│   └── services/            # orquestração/fachada (opcional)
├── infrastructure/          # adapters do contexto
└── presentation/            # BE: controllers/ · FE: views/ · components/ · providers/ (local) · hooks/ · stories/
```

> Referência, **não** obrigação de criar todos os diretórios antecipadamente:
> camada sem responsabilidade real não deve existir
> ([`ARCHITECTURE.md`](ARCHITECTURE.md) §10). A convergência incremental do
> código atual está em [`REFACTORING_ROADMAP.md`](REFACTORING_ROADMAP.md) —
> backend **P5/P8/P10**, frontend **P6/P7/P9**.

### Regras técnicas permanentes

- **DDD:** modelar regras reais do domínio, respeitando os limites dos contextos.
- **TDD:** testes antes de novas regras e testes de caracterização antes de refatorações.
- **Clean Architecture:** domínio e casos de uso independentes da infraestrutura concreta.
- **Hexagonal:** serviços externos acessados por contratos e adaptadores.
- **Storybook:** componentes visuais relevantes com stories e estados verificáveis.
- **Componentização:** responsabilidade única e composição antes da duplicação.
- **Offline-first:** catálogo e histórico disponíveis sem internet.
- **Segurança de dados:** nenhuma modificação dos arquivos originais sem permissão explícita.

Mapeamento para o repositório atual (backend `midoteca/` já segue Fases 1–2):
ver [`ARCHITECTURE.md`](ARCHITECTURE.md) e
[`../midoteca/docs/ARCHITECTURE.md`](../midoteca/docs/ARCHITECTURE.md).

---

## 6. Critérios de qualidade (todas as fases)

**Definition of Done** — aplicável a todo PR:

- [ ] Testes de domínio e casos de uso passam.
- [ ] TypeScript e builds aplicáveis passam.
- [ ] Nenhuma regressão conhecida dos fluxos anteriores.
- [ ] Componentes relevantes possuem stories atualizadas.
- [ ] Dependências arquiteturais respeitam os limites estabelecidos.
- [ ] Erros, estados vazios e carregamento são tratados.
- [ ] Dados e arquivos originais permanecem protegidos.
- [ ] README e contratos afetados refletem a implementação real.

> Cada fase tem ainda critérios de **aceite próprios** (acima). A cobertura de
> testes deve ser acompanhada, mas **não** é usada isoladamente como medida de
> qualidade. Ver [`TESTING_STRATEGY.md`](TESTING_STRATEGY.md) e
> [`CONVENTIONS.md`](CONVENTIONS.md).

---

## 7. Riscos e decisões arquiteturais

| Risco | Impacto | Estratégia |
| --- | --- | --- |
| Refatoração extensa demais | Regressões e atrasos | Migrar apenas módulos afetados |
| Estado duplicado | Perda ou inconsistência de alterações | Fonte única de verdade |
| Arquivos grandes e acoplados | Manutenção difícil | Componentes e casos de uso coesos |
| Indexação pesada | Reprodução prejudicada | Prioridade ao Player e limites de I/O |
| HD removido | Vídeos indisponíveis | Catálogo offline e reconexão |
| Formatos variados | Falhas de reprodução | Matriz real de codecs suportados |
| PDF muito grande | Memória elevada | Renderização sob demanda e cache |
| Armazenamento em nuvem | Custos e privacidade | Opt-in, cotas e provedores substituíveis |
| Infraestrutura legada | Complexidade desnecessária | Reutilizar apenas o que agrega valor |

**Decisão registrada:** o catálogo usa SQLite local (`better-sqlite3`) e a
aplicação atual integra o núcleo por IPC do Electron. O ADR 0001 ainda descreve
essa decisão de transporte como futura; atualizá-lo é uma pendência documental
da F03. O backend NestJS/PostgreSQL legado não faz parte do runtime desktop.

---

## 8. MVP vs pós-MVP

| MVP (v1.0) | Pós-MVP (v2.0+) |
| --- | --- |
| Biblioteca local, cursos, filmes, Player, legendas, leitura de PDFs, pesquisa, importação incremental, catálogo offline, persistência, recuperação e aplicativo instalável | Edição avançada de PDFs (seleção de área, texto e notas), gestão de contas e perfis (Admin/Usuário), controle de acesso por permissão, submissão e avaliação de PDFs com notas, Backblaze B2, Google Drive, sincronização entre dispositivos, P2P, Telegram, IA, transcrição, tradução e automação avançada da documentação |

---

## 9. Organização no GitHub

Quatro **milestones**:

| Milestone | Fases | Resultado |
| --- | --- | --- |
| `v0.1-foundation` | 00–02 | Arquitetura estabilizada |
| `v0.5-local-library` | 03–08 | Biblioteca local real |
| `v1.0-desktop` | 09–11 | Produto instalável e confiável |
| `v2.0-extended` | 12–14 | Nuvem, multi-usuário, avaliação e extensões |

Para cada fase, criar **issues pequenas** com objetivo, escopo, dependências,
testes e critérios de aceite. Idealmente, **um PR resolve uma mudança coerente**,
não um módulo inteiro de uma vez.

> A automação completa de documentação fica adiada. Corrigir um README incorreto
> e manter os contratos modificados documentados continua sendo qualidade básica.

---

## 10. Próxima entrega recomendada — Sprint 01 · Fundação do Catálogo

**Objetivo:** começar a migração progressiva com uma melhoria concreta e de alto
impacto.

1. Registrar o baseline dos testes e componentes existentes.
2. Definir o contexto `catalog` e os contratos de acesso aos dados.
3. Escrever testes para edição, conclusão e atualização de itens.
4. Eliminar a duplicação de estado entre `App.tsx` e `MockLibraryService`.
5. Extrair componentes e hooks **somente onde a alteração exigir**.
6. Atualizar stories relevantes e validar as telas.

**Resultado esperado:** Biblioteca, Detalhes, Editor e Início enxergam
consistentemente os mesmos dados, mantendo o comportamento atual. **Ainda não
envolve** migração de banco, nuvem ou indexação real.

Detalhamento técnico no [`REFACTORING_ROADMAP.md`](REFACTORING_ROADMAP.md).

---

## Orientação geral

O sucesso da Midoteca deve ser medido primeiro por **três resultados**:

1. conseguir **catalogar conteúdo real**;
2. **reproduzi-lo ou lê-lo sem dificuldade**;
3. **preservar a organização** mesmo depois de desligar o aplicativo ou
   desconectar os HDs.

A arquitetura existe para tornar esses resultados **confiáveis** — não para
aumentar desnecessariamente a quantidade de código.
