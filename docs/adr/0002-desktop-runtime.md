# ADR 0002 — Runtime desktop e transporte frontend ↔ núcleo

- **Status**: Aceito
- **Data**: 2026-10-16
- **Contexto**: transformar a Midoteca em aplicativo desktop local-first
  funcional, ligando o frontend React (`client/`) ao núcleo
  [`@midoteca/core`](../../midoteca/) (TypeScript + `better-sqlite3`).
- **Relacionado**: [`0001-backend-runtime.md`](../../midoteca/docs/adr/0001-backend-runtime.md)
  (núcleo agnóstico de transporte), [`../ROADMAP.md`](../ROADMAP.md) Fase 03,
  [`../../client/docs/adr/0001-repository-boundary.md`](../../client/docs/adr/0001-repository-boundary.md).

## Contexto

O núcleo já entrega domínio + persistência SQLite + indexação incremental, mas é
**deliberadamente agnóstico de transporte** (ADR 0001): nenhum IPC, HTTP ou
Tauri é importado por ele. Falta decidir **como** o frontend consome esse núcleo
no desktop.

Restrições que dominam a decisão:

1. O núcleo é **TypeScript + `better-sqlite3`** (módulo nativo Node). Reescrevê-lo
   em Rust não tem justificativa técnica provada e é explicitamente desencorajado.
2. `better-sqlite3` **nunca** pode rodar no processo do browser/renderer.
3. O acesso ao filesystem (seleção de pastas, varredura, leitura de bytes de
   PDF/vídeo) precisa de um processo com privilégios de Node.
4. O produto precisa empacotar um instalável, com o banco no diretório de dados
   do usuário e migrações seguras.
5. A apresentação React já fala com o núcleo por **ports** (`LibraryRepository`,
   `LibrarySourcesRepository`), então o transporte só precisa produzir um
   adapter que implemente esses contratos.

## Decisão

Adotar **Electron** como runtime desktop e um **bridge IPC único** sobre
`@midoteca/core`:

- **Processo principal (main, Node/CJS)**: executa `createMidoteca()` — abre o
  SQLite, roda migrações e hospeda domínio/indexação. `better-sqlite3` vive
  **apenas** aqui.
- **Preload** com `contextIsolation: true`, `nodeIntegration: false`,
  `sandbox: true`: expõe ao renderer **uma única função**
  `window.midoteca.invoke(method, params)` e uma assinatura de eventos
  (`window.midoteca.onEvent`). Nenhuma API do Node vaza para a tela.
- **Renderer (React)**: consome o núcleo por adapters que implementam os ports
  existentes, chamando o bridge. `import type` do contrato do núcleo é permitido
  (apagado no build); **nenhum import de runtime** de `@midoteca/core` no bundle.
- **Contrato do protocolo** mora no núcleo
  (`midoteca/src/platform/desktop/`): nomes de métodos, DTOs (entidades já
  serializáveis) e envelope de resposta/erro. É a **fonte única de verdade** dos
  dois lados.
- **Eventos** (progresso de indexação, mudanças de fonte) fluem main → renderer
  por um canal dedicado; o renderer atualiza o cache e re-renderiza.

### Runtime escolhido: Electron (não Tauri)

O ADR 0001 deixou o transporte em aberto. Optamos por Electron **nesta fase**
porque:

- O núcleo é Node/TypeScript: roda **sem reescrita** no processo principal do
  Electron. Tauri exigiria reimplementar o núcleo em Rust **ou** empacotar um
  sidecar Node — exatamente o custo que o requisito pede para evitar.
- `better-sqlite3` é um módulo nativo Node maduro e amplamente usado em apps
  Electron (citado no próprio ADR 0001).
- `contextBridge` oferece um modelo de segurança equivalente ao de Tauri para o
  nosso caso (sem Node no renderer, superfície mínima e tipada).
- Empacotamento via `electron-builder` cobre instalável e banco em user data.

> **Revisão futura**: a decisão de transporte permanece substituível. Como o
> núcleo não conhece Electron, trocar por Tauri (com sidecar Node) ou por um
> worker HTTP local não toca domínio, casos de uso nem os ports do frontend —
> só o par `main`/`preload` e a injeção do adapter no composition root.

## Consequências

**Positivas**

- Dados reais (SQLite) no desktop **sem** reescrever o núcleo.
- Renderer testável: os adapters são testados contra um bridge fake; o núcleo é
  testado contra SQLite temporário real.
- Mesmo modelo de ports & adapters do resto do projeto (ADR 0001 do client).
- Migrações e integridade transacional reaproveitadas do núcleo.

**Negativas / trade-offs**

- Electron agrega tamanho ao instalável (vs. Tauri).
- O contrato IPC precisa ser mantido serializável (sem `Date`, `Map`, funções).
- Processos separados exigem cuidado com ciclo de vida (fechar o banco ao sair).
- `better-sqlite3` é um módulo nativo: precisa ser **compilado para o ABI do
  Electron** para rodar no `main`. Ver "Runtime nativo" abaixo.

## Runtime nativo (`better-sqlite3` ↔ Electron ABI)

`better-sqlite3` é um addon C++ com bindings por ABI. O ABI do Node da máquina de
desenvolvimento (`NODE_MODULE_VERSION 137`) difere do ABI do Node embutido no
Electron 44 (`149`), então **a mesma cópia não serve aos dois consumidores**:

- Rodar o app Electron: `npm run desktop:rebuild` (no `client/`) recompila
  `better-sqlite3` em `../midoteca` para o ABI do Electron.
- Rodar os testes do núcleo / integração em Node: `npm run desktop:rebuild:node`
  restaura o binding para o ABI do Node.

Requisito de versão: `better-sqlite3 >= 12` (a `11.x` não compila contra o V8 do
Electron 44 — `v8::External::Value` passou a exigir um `tag`). O núcleo fixa
`^12.11.1`; os testes do núcleo (123) seguem verdes nessa versão.

Verificação sem abrir janela (boota o kernel dentro do Electron, roda migrações e
faz um round-trip RPC): `npm run desktop:smoke` (com o ABI do Electron ativo).

Fluxo de desenvolvimento: `npm run desktop:core` (builda `@midoteca/core`),
`npm run dev` (Vite em `:3333`) e, em outro terminal,
`MIDOTECA_DEV_URL=http://localhost:3333 npm run desktop:start`. Produção:
`npm run desktop:prod` (build do núcleo + bundle + Electron carregando `dist/`).

## Segurança

- `contextIsolation` ligado, `nodeIntegration` desligado, `sandbox` ligado.
- Preload expõe apenas `invoke`/`onEvent` com allowlist de métodos do contrato.
- Caminhos do renderer só entram por `dialog.showOpenDialog` (seleção de pasta)
  ou são validados pelo núcleo (`SourceProbe`) antes de qualquer uso.
- O núcleo **nunca** apaga arquivos físicos ao remover catálogo.
