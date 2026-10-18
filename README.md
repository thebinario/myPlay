# MIDOTECA (ex-myPlay)

Biblioteca **local-first** de mídia para desktop: cursos em vídeo, filmes e
documentos PDF. Roda a partir de arquivos no próprio dispositivo (pendrive/HD
externo), com catálogo navegável offline, histórico de reprodução/leitura e
persistência local.

## Estrutura do repositório

```
Midoteca/
├── client/     # App desktop (React 19 + TypeScript + Vite) — app real
├── midoteca/   # Núcleo/backend local-first (TypeScript + SQLite) — DDD/hexagonal
├── backend/    # myPlay legado (NestJS + PostgreSQL) — descartado, NÃO migrar
└── docs/       # modelo canônico de arquitetura, DDD, testes e roadmap
```

**Um só modelo de arquitetura para os dois lados.** Camadas, pastas e regras de
dependência são idênticas em `midoteca/` e `client/`; a fonte única de verdade é
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Frontend (`client/`)

Aplicação React 19 + TypeScript (strict) + Vite 6. Interface própria no design
system da Midoteca (fundo `#0D111B`, destaque violeta `#A594FF`), sem biblioteca
de UI externa.

**Tecnologias**

- React 19 + TypeScript
- Vite 6 (dev server e build)
- `lucide-react` (ícones)
- HTML5 `<video>` nativo para reprodução de MP4
- `pdfjs-dist` para leitura de PDF real
- Vitest + Testing Library (jsdom) e Storybook (vitest addon + Playwright)

**Arquitetura (modelo canônico, igual ao backend — `docs/ARCHITECTURE.md`)**

- `src/app/` — composition root (`main.tsx`) e shell (`App.tsx`).
- `src/core/contracts/library-repository.ts` — contratos (`LibraryRepository` e
  contratos menores de catálogo, reprodução, leitura, páginas e pesquisa).
- `src/core/domain/library.ts` — domínio/view-models do app.
- `src/modules/<contexto>/{domain,application,infrastructure,presentation}` —
  contextos (`library`, `home`, `courses`, `player`, `documents`, `search`,
  `settings`). Casos de uso em `application/use-cases/`; hooks em
  `presentation/hooks/`; regras puras em `domain/`.
- `src/shared/ui/` — design system (átomos + stories).
- Componentes visuais finos; lógica em hooks e no repositório.
- Mídia real em `client/public/media/{videos,docs}`.
- ⏳ Convergência pendente: testes `src/__tests__/` → `test/`
  (`docs/REFACTORING_ROADMAP.md` P6).

**Scripts** (npm — o mesmo da CI)

```bash
npm run dev              # servidor de desenvolvimento (porta 3333)
npm run build            # tsc + vite build
npm test                 # Vitest (unidade + stories)
npm run test:coverage    # cobertura
npm run typecheck        # tsc --noEmit
npm run lint             # ESLint
npm run storybook        # Storybook em http://localhost:6006
npm run build-storybook  # build estático do Storybook
```

## Backend (`midoteca/`)

Núcleo local-first em **TypeScript + SQLite** (`better-sqlite3`), **sem framework
HTTP** (não usa NestJS nem PostgreSQL): domínio/aplicação em `core/`, adapters em
`infra/` e composition root em `createMidoteca()`. Organizado pelos contextos
Library, Media, Courses, Documents, Progress, Indexing, Search, Jobs e Settings,
seguindo o modelo canônico de [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
Consulte `midoteca/README.md` e `midoteca/docs/`.

## Backend legado (`backend/`)

Implementação original do myPlay (NestJS + PostgreSQL + FFmpeg). **Não é mais a
base de código**; os conceitos úteis estão registrados em
`midoteca/docs/MYPLAY_AUDIT.md`. Não migrar.

## Documentação

- [`docs/ROADMAP.md`](docs/ROADMAP.md) — plano mestre (15 fases / 4 versões)
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/DDD_GUIDELINES.md`](docs/DDD_GUIDELINES.md)
- [`docs/CODE_ORGANIZATION.md`](docs/CODE_ORGANIZATION.md)
- [`docs/CONVENTIONS.md`](docs/CONVENTIONS.md)
- [`docs/TESTING_STRATEGY.md`](docs/TESTING_STRATEGY.md)
- [`docs/REFACTORING_ROADMAP.md`](docs/REFACTORING_ROADMAP.md)
- [`AGENTS.md`](AGENTS.md) — diretrizes de arquitetura e refatoração

## Licença

UNLICENSED.
