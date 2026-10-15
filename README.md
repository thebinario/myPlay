# MIDOTECA (ex-myPlay)

Biblioteca **local-first** de mídia para desktop: cursos em vídeo, filmes e
documentos PDF. Roda a partir de arquivos no próprio dispositivo (pendrive/HD
externo), com catálogo navegável offline, histórico de reprodução/leitura e
persistência local.

## Estrutura do repositório

```
myPlay/
├── client/     # Aplicação desktop (React 19 + TypeScript + Vite) — app real
├── midoteca/   # Novo backend (NestJS + SQLite), arquitetura DDD/hexagonal
├── backend/    # myPlay legado (NestJS + PostgreSQL) — descontinuado
└── docs/       # Arquitetura, DDD, testes e roadmap de refatoração
```

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

**Arquitetura (Ports & Adapters)**

- `src/services/contracts.ts` — contratos (`LibraryRepository`, catálogo,
  reprodução, leitura, provedor de páginas, pesquisa).
- `src/services/LibraryContext.tsx` — `LibraryProvider` e hooks
  (`useLibrary`, `useLibraryRepository`); fonte única de verdade reativa via
  `useSyncExternalStore`.
- `src/services/libraryStorage.ts` — porta de persistência + adapter
  `localStorage` (composição do repositório persistente).
- Componentes visuais finos; lógica em hooks (`usePdfReader`,
  `useUniversalSearch`, `useCourseEditor`, `useVideoPlayer`) e no repositório.
- Mídia real em `client/public/media/{videos,docs}`.

**Scripts** (Yarn)

```bash
yarn dev               # servidor de desenvolvimento (porta 3333)
yarn build             # tsc + vite build
yarn test              # Vitest (unidade + stories)
yarn test:storybook    # apenas testes de stories (chromium)
yarn test:coverage     # cobertura
yarn storybook         # Storybook em http://localhost:6006
yarn build-storybook   # build estático do Storybook
```

## Backend (`midoteca/`)

Novo núcleo em NestJS + SQLite, organizado por domínios (Library, Courses,
Media, Documents, Progress, Indexing, Search, Jobs, Settings) com Clean
Architecture. Consulte `midoteca/README.md` e `midoteca/docs/`.

## Backend legado (`backend/`)

Implementação original do myPlay (NestJS + PostgreSQL + FFmpeg). **Não é mais a
base de código**; os conceitos úteis estão registrados em
`midoteca/docs/MYPLAY_AUDIT.md`. Não migrar.

## Documentação

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/DDD_GUIDELINES.md`](docs/DDD_GUIDELINES.md)
- [`docs/CODE_ORGANIZATION.md`](docs/CODE_ORGANIZATION.md)
- [`docs/TESTING_STRATEGY.md`](docs/TESTING_STRATEGY.md)
- [`docs/REFACTORING_ROADMAP.md`](docs/REFACTORING_ROADMAP.md)
- [`AGENTS.md`](AGENTS.md) — diretrizes de arquitetura e refatoração

## Licença

UNLICENSED.
