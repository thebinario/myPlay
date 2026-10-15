# ADR 0001 — Runtime do backend da Midoteca

- **Status**: Aceito (Fase 1)
- **Data**: 2026-10-15
- **Contexto**: definição do runtime/arquitetura do backend da Midoteca.

## Contexto

A Midoteca é um aplicativo desktop _local-first_. O frontend é React + TypeScript
(e futuramente Tauri). Havia três alternativas para o backend:

1. **Backend NestJS executado localmente** (como o myPlay de referência).
2. **Núcleo Rust/Tauri** (lógica no processo Rust do Tauri).
3. **Arquitetura híbrida** (núcleo de domínio portátil + transporte escolhido).

Restrições relevantes:

- A reprodução/navegação devem funcionar sem IA, internet e indexação.
- Não há, na Fase 1, decisão técnica suficiente para comprometer-se com Rust nem
  com um servidor HTTP local.
- O backend legado (NestJS + PostgreSQL) apresentou problemas estruturais (ver
  `MYPLAY_AUDIT.md`): credenciais embutidas, entidade duplicada, acoplamento
  arquivo↔registro e exclusão física de arquivos.

## Decisão

Implementar a Fase 1 como um **núcleo de domínio + persistência em TypeScript,
desacoplado de transporte** (pacote `@midoteca/core`), usando **SQLite local**
via `better-sqlite3`.

- Nenhum NestJS, Express, HTTP, IPC ou Tauri é importado pelo núcleo.
- O _composition root_ (`createMidoteca`) expõe repositórios; qualquer transporte
  futuro apenas os consome.

## Justificativa

- **Menor compromisso, maior opcionalidade**: o núcleo não escolhe o transporte.
  Um controller NestJS local, comandos Tauri ou um worker podem ser adicionados
  depois sem reescrever domínio/persistência.
- **Local-first de verdade**: SQLite em arquivo no diretório de dados do usuário,
  sem servidor, sem PostgreSQL, sem rede.
- **TypeScript primeiro**: o time e o frontend já são TS; reduz atrito e permite
  compartilhar tipos/conceitos com o client.
- **`better-sqlite3`**: driver maduro, síncrono (ideal para migrações
  transacionais), amplamente usado em apps desktop/Electron.
- **Rust/Tauri agora seria prematuro**: sem requisitos de performance provados
  que justifiquem reescrever a lógica em Rust nesta fase; migrar depois é
  possível porque o domínio está isolado da infra.

## Alternativas consideradas

- **NestJS local já na Fase 1**: rejeitado. Acopla o domínio a um framework HTTP
  e repete os problemas do backend legado; adiciona peso desnecessário para uma
  fundação que deve ser simples e rápida.
- **Núcleo Rust/Tauri desde já**: rejeitado por ora. Sem decisão técnica que
  justifique; o custo de reescrita não se paga antes de validar o produto.
- **Híbrido imediato**: adiado. A Fase 1 é exatamente a fundação portátil que
  habilita o híbrido depois.

## Consequências

- **Positivas**: domínio testável sem transporte; troca de infraestrutura sem
  tocar regras; base para qualquer runtime.
- **Negativas/limitações**: ainda não há servidor nem ponte IPC; o client não
  consome dados reais (continua no mock) até a Fase 2 definir o transporte.
- **Revisão futura**: a decisão de transporte (NestJS local vs. comandos Tauri
  vs. worker) será tomada na Fase 2, sem alterar este núcleo.
