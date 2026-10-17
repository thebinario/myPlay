# midoteca-desktop

Cliente desktop da Midoteca (React 19 + Vite + TypeScript). Local-first: hoje
consome um repositório em memória através de uma fronteira de contratos; o
objetivo é trocar a origem por um adapter IPC/HTTP ligado ao núcleo `midoteca/`
sem alterar os componentes.

## Documentação

- [Arquitetura do frontend](docs/ARCHITECTURE.md)
- [Modelo de domínio (frontend)](docs/DOMAIN_MODEL.md)
- [ADR 0001 — Fronteira de repositório](docs/adr/0001-repository-boundary.md)
- Visão unificada do projeto: [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md)
- Diretrizes DDD: [`../docs/DDD_GUIDELINES.md`](../docs/DDD_GUIDELINES.md)
- Estratégia de testes: [`../docs/TESTING_STRATEGY.md`](../docs/TESTING_STRATEGY.md)
- Roadmap de refatoração: [`../docs/REFACTORING_ROADMAP.md`](../docs/REFACTORING_ROADMAP.md)

## Scripts

```bash
npm run dev              # servidor de desenvolvimento (Vite)
npm run build            # tsc && vite build
npm test                 # vitest run
npm run test:watch       # vitest (watch)
npm run storybook        # catálogo visual (Storybook)
npm run build-storybook  # build estático do Storybook
```

## Estrutura (resumo)

```text
src/
├── app/                     # composition root (main.tsx) + shell (App.tsx)
├── core/                    # domain (view-models) · ports (contratos) · config
├── features/<contexto>/     # application · infrastructure · presentation
│                            #   (library, home, courses, player, documents, search, settings)
├── shared/ui/               # design system (átomos + stories)
├── __tests__/               # testes (alvo: test/ espelhando a árvore)
└── legacy/ · stories/       # código morto do CRA/myPlay — fora do build
```

Estrutura canônica de destino (idêntica à do backend): `app/`, `core/`,
`modules/<contexto>/{domain,application,infrastructure,presentation}`, `shared/`,
`platform/` — ver [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) §4 e o
passo **P6** de [`../docs/REFACTORING_ROADMAP.md`](../docs/REFACTORING_ROADMAP.md).

Detalhes em [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
## Release Windows

A geração e publicação são manuais pela GitHub Action **Release Windows** (`workflow_dispatch`).
Informe uma versão SemVer inédita, sem o prefixo `v`, e o canal:

- `beta`: exige versão como `0.5.0-beta.1` e publica como pré-release.
- `stable`: exige versão como `1.0.0` e publica como release estável.

A release executa primeiro a CI de qualidade. Depois, no Windows Server 2022 com
Node 24, Python 3.12 e Visual Studio 2022, usa `npm run desktop:release` para
compilar o núcleo e o frontend, preparar um app isolado e gerar NSIS e portátil x64.
O addon SQLite é reconstruído para a versão exata do Electron do lockfile.

O comando também abre o executável empacotado em modo smoke: inicializa SQLite
real, aplica migrações e executa `system.info` por RPC, com dados temporários.
Somente após esse sucesso os instaladores, `SHA256SUMS` e `build-info.json` são
publicados em **Releases**. Beta é pré-release; stable é marcada como latest.
Uma tag existente é rejeitada para preservar versões já publicadas.

A CI de push/PR executa o mesmo empacotamento Windows, após as verificações de
qualidade, e guarda os arquivos como artifacts por 14 dias, sem publicar release.

Para reproduzir o empacotamento na máquina local (Node 24 recomendado):

```bash
cd midoteca
npm ci --ignore-scripts
cd ../client
npm ci --ignore-scripts
npm run desktop:release -- 0.5.0-beta.1 beta --dir
```

`--dir` gera o app sem instalador e executa o smoke; no Windows, remova essa
opção para gerar NSIS e portátil. Em outro sistema, o build local valida o
pacote desse sistema; a compatibilidade Windows é verificada pelo runner Windows.
As pastas `release/core`, `release/app` e `release/artifacts` são recriadas a cada
execução. Manifestos e lockfiles do checkout não são alterados pelo comando.

O smoke valida o boot e a dependência nativa, mas o aceite da Fase 11 ainda exige
instalar e exercitar os fluxos de importação, reprodução, leitura e recuperação
num Windows 11 real. Assinatura e atualização automática seguem pendentes.
