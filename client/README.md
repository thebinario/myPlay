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
├── App.tsx              # shell + navegação + sessão de reprodução
├── types/library.ts     # domínio (tipos/view-models)
├── services/            # contracts (ports) · mockData (adapter) · LibraryContext
├── components/          # features + design system (ui/)
├── features/*/stories/  # Storybook
└── __tests__/           # testes de componente/contrato
```

Detalhes em [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
