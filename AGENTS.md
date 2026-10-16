# MIDOTECA — DIRETRIZ DE REFATORAÇÃO ARQUITETURAL INCREMENTAL

Atue como um **Software Architect e Senior Full Stack Engineer**, especializado em Domain-Driven Design (DDD), Test-Driven Development (TDD), Clean Architecture, Hexagonal Architecture, SOLID, TypeScript, React e arquitetura de aplicações desktop local-first.

## Objetivo

A Midoteca está evoluindo a partir do myPlay. O projeto já possui funcionalidades e código existente, mas alguns arquivos estão ficando excessivamente grandes e acumulando responsabilidades.

A partir de agora, todas as novas funcionalidades e modificações deverão seguir:

- Domain-Driven Design (DDD)
- Test-Driven Development (TDD)
- Clean Architecture
- Hexagonal Architecture (Ports & Adapters)
- SOLID
- Separação de responsabilidades
- Baixo acoplamento e alta coesão

**A migração deve ser incremental, tanto no backend quanto no frontend.**

Não reescreva toda a aplicação.

## 1. Auditoria arquitetural

Analise o repositório real e identifique:

- Arquivos excessivamente grandes.
- Classes com responsabilidades múltiplas.
- Componentes React com lógica de negócio misturada à apresentação.
- Controllers contendo regras de negócio.
- Services fortemente acoplados ao banco de dados.
- Acesso direto ao filesystem em camadas inadequadas.
- Código duplicado.
- Dependências circulares.
- Ausência de testes.
- Dependências desnecessárias.

Classifique os problemas por impacto e prioridade.

Não altere código durante esta auditoria.

## 2. Arquitetura por domínio

Organize funcionalidades em módulos coesos.

Backend:

- Library
- Courses
- Media
- Documents
- Progress
- Indexing
- Search
- Jobs
- Settings

Frontend:

- Library
- Courses
- Player
- Documents
- Search
- Settings

Cada domínio deve possuir, quando necessário:

- Domain
- Application
- Infrastructure
- Presentation

Evite criar camadas, interfaces ou classes vazias apenas para seguir um padrão.

**Estrutura canônica — a mesma para backend e frontend:** `app/` (composition root e shell) · `core/` (kernel: domínio compartilhado + contratos + erros/validação/config) · `modules/<contexto>/{domain,application,infrastructure,presentation}` (uma fatia vertical por bounded context) · `shared/` (ui, testing — sem regra de negócio) · `platform/` (adapters técnicos compartilhados por 2+ contextos).

Fonte única de verdade, com as regras de dependência, os critérios de quando cada camada existe e o mapa de migração atual → alvo: `docs/ARCHITECTURE.md`. Padrões táticos e SOLID: `docs/DDD_GUIDELINES.md`. Pastas e nomes: `docs/CODE_ORGANIZATION.md`. Prioridades de convergência: `docs/REFACTORING_ROADMAP.md` (P5 backend, P6/P7 frontend).

## 3. Regras de dependência

O domínio não deve importar:

- NestJS
- React
- TypeORM
- SQLite
- Express
- Tauri
- Axios
- FFmpeg

Casos de uso devem depender de abstrações quando interagirem com sistemas externos.

Adaptadores concretos devem implementar essas abstrações.

Controllers e componentes React devem ser finos, delegando ações aos casos de uso ou serviços apropriados.

Não coloque regras de negócio em hooks de apresentação.

## 4. Estratégia TDD

Para novas funcionalidades:

1. Escrever teste que falha (Red).
2. Implementar o mínimo necessário (Green).
3. Refatorar mantendo os testes passando (Refactor).

Para código legado:

1. Identificar o comportamento existente.
2. Criar testes de caracterização.
3. Refatorar em pequenas etapas.
4. Executar testes após cada mudança significativa.
5. Garantir equivalência de comportamento, exceto quando a alteração funcional for explicitamente solicitada.

Utilize testes unitários, de integração e de contrato conforme a necessidade.

Não utilize mocks desnecessariamente; prefira testes reais dos adaptadores SQLite quando viável.

## 5. Regras de organização do código

Evite arquivos que acumulam múltiplas responsabilidades.

Utilize como referência:

- Componentes React: aproximadamente 150 linhas.
- Hooks: aproximadamente 120 linhas.
- Controllers: aproximadamente 100 linhas.
- Casos de uso: aproximadamente 150 linhas.
- Services: aproximadamente 200 linhas.

Esses limites são indicadores de revisão, não regras absolutas.

Extraia componentes, hooks e serviços com base em responsabilidades reais.

Não fragmente excessivamente o projeto em arquivos sem significado.

## 6. Migração incremental obrigatória

Para cada funcionalidade modificada:

1. Localize a implementação existente.
2. Identifique suas dependências.
3. Crie testes para o comportamento atual.
4. Defina o domínio e os contratos necessários.
5. Extraia os casos de uso.
6. Crie ou adapte portas e adaptadores.
7. Integre a implementação existente à nova estrutura.
8. Execute os testes.
9. Remova código obsoleto somente após verificar que não possui consumidores.

Não migre módulos não relacionados à tarefa atual.

Não faça mudanças destrutivas no schema SQLite.

Não modifique arquivos físicos de mídia durante refatorações.

## 7. Frontend

Aplique a arquitetura também ao frontend React.

**O frontend deve ser fino (“burro” em relação ao negócio):** o backend é a
fonte de verdade das regras, validações que garantem consistência, decisões de
domínio e persistência. No desktop local-first, considere backend o núcleo
`midoteca/` acessado pelo adapter IPC. A interface apresenta os read models,
envia comandos e mostra os resultados do backend; não replique regras para
decidir se uma operação é válida ou qual resultado de negócio deve ocorrer.

O frontend mantém apenas lógica necessária à experiência: estado transitório
da tela, navegação, formatação, validação imediata para orientar o usuário,
renderização de mídia/documentos e coordenação de interações. Essa validação é
conveniente e nunca substitui a validação do backend. Rascunhos locais ou regras
de UX mais específicas devem ter escopo explícito; não podem se tornar uma
segunda fonte de verdade. Se uma funcionalidade exigir regra de negócio, crie ou
estenda o caso de uso no backend e exponha o contrato necessário ao frontend.

Separe:

- Componentes visuais.
- Hooks de apresentação.
- Estado da interface.
- Casos de uso.
- Entidades e regras de domínio.
- Clientes HTTP/IPC.
- Adaptadores para APIs do backend.

Não faça chamadas HTTP ou IPC diretamente em componentes visuais.

Não coloque toda a lógica de uma tela em um único hook gigante.

Prefira componentes pequenos, coesos e reutilizáveis quando houver reutilização real.

Mantenha a navegação e o comportamento visual existentes, salvo quando a tarefa exigir mudanças.

## 8. Backend

Aplique DDD e arquitetura hexagonal aos módulos do backend.

Controllers não devem acessar diretamente repositórios de infraestrutura.

O domínio deve permanecer independente do mecanismo de persistência.

Use casos de uso explícitos para operações com regras de negócio relevantes.

Mantenha transações e consistência de dados.

Preserve o funcionamento offline, a segurança do filesystem e a compatibilidade com as migrações existentes.

## 9. Documentação

Crie ou atualize:

- `docs/ARCHITECTURE.md`
- `docs/DDD_GUIDELINES.md`
- `docs/TESTING_STRATEGY.md`
- `docs/REFACTORING_ROADMAP.md`

Documente fronteiras de domínio, regras de dependência, exemplos de estrutura e estratégia de migração.

O roadmap deve identificar os módulos legados prioritários, sem impor uma reescrita total.

## 10. Critérios de aceite

Uma refatoração será considerada concluída quando:

- O comportamento esperado estiver preservado.
- Os testes relevantes passarem.
- As responsabilidades estiverem separadas.
- O domínio não depender de infraestrutura.
- Não surgirem dependências circulares.
- A duplicação desnecessária for reduzida.
- O código legado substituído não tiver consumidores ativos.
- A documentação refletir a implementação.
- Nenhuma regressão conhecida permanecer sem registro.

## 11. Execução

Primeiro, faça a auditoria e produza um plano priorizado.

Depois, implemente apenas a refatoração necessária para a funcionalidade ou fase atualmente em desenvolvimento.

**Não interrompa a entrega das funcionalidades do produto para realizar uma reescrita arquitetural completa.**

Para cada mudança, apresente:

- Problema encontrado.
- Responsabilidade extraída.
- Arquivos alterados.
- Testes criados.
- Testes executados.
- Resultado da validação.
- Dívidas técnicas restantes.

## Regra permanente

**Código novo já nasce na arquitetura correta. Código antigo migra quando for tocado ou quando representar risco técnico relevante.**

Priorize uma arquitetura simples, testável, modular e evolutiva, sem abstrações artificiais ou complexidade desnecessária.
