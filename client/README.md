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

A geração e publicação são manuais pela GitHub Action **Release Windows** (`workflow_dispatch`). Informe uma versão SemVer e o canal:

- `beta`: exige versão como `0.5.0-beta.1` e publica como pré-release.
- `stable`: exige versão como `1.0.0` e publica como release estável.

A Action compila o núcleo e o frontend no Windows, empacota o instalador NSIS e a versão portátil x64, e anexa os executáveis à GitHub Release. A primeira release candidate ainda precisa ser instalada e exercitada em uma máquina Windows real, conforme a Fase 11 do roadmap.
