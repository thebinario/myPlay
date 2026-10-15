# Convenções adotadas (padrões da comunidade)

> Padrões **de facto** da comunidade, aplicados a **backend (`midoteca/`)** e
> **frontend (`client/`)**. Nomenclatura/pastas em
> [`CODE_ORGANIZATION.md`](CODE_ORGANIZATION.md); arquitetura em
> [`ARCHITECTURE.md`](ARCHITECTURE.md).

## 1. Princípio

Não inventamos estilo: adotamos o que a comunidade usa e **seguimos fielmente**
via ferramentas (formatação e lint automatizados). Divergência vira exceção
documentada, nunca hábito.

## 2. Formatação — Prettier

Ferramenta padrão da comunidade para formatação. Config única na raiz
(`.prettierrc.json`), herdada pelos dois pacotes:

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always",
  "bracketSpacing": true,
  "endOfLine": "lf"
}
```

- `.prettierignore` na raiz **e em cada pacote** (`midoteca/`, `client/`) — o
  Prettier lê o `.prettierignore` do diretório onde é executado, por isso cada
  pacote tem o seu (ignora `node_modules`, `dist`, `build`, `storybook-static`,
  `coverage`, `*.md`, lockfiles). No `client/`, o código legado do myPlay também
  é ignorado (ver `docs/REFACTORING_ROADMAP.md` P0).
- Prettier e ESLint não brigam: `eslint-config-prettier` desliga regras de
  estilo do ESLint.

## 3. Editor — EditorConfig

`.editorconfig` na raiz (compatível com todos os editores/IDEs):

- UTF-8, LF, newline final, indent 2 espaços, sem espaços em branco à direita.
- `*.md`: preserva espaços à direita (quebra de linha).

## 4. Lint — ESLint (flat config) + typescript-eslint

Config por pacote (ESLint 9, *flat config*):

| Pacote | Arquivo | Base |
| --- | --- | --- |
| `midoteca/` | `eslint.config.mjs` | `@eslint/js` recommended + `typescript-eslint` recommended + `eslint-config-prettier` |
| `client/` | `eslint.config.js` | idem + `eslint-plugin-react-hooks` (rules-of-hooks = error, exhaustive-deps = warn) |

Regras relevantes:

- `@typescript-eslint/no-unused-vars`: **error** (ignora `_` como prefixo).
- `@typescript-eslint/no-explicit-any`: **warn**.
- `react-hooks/rules-of-hooks`: **error** (regra oficial dos hooks).
- Código legado já excluído do `tsconfig` também é **ignorado no lint**
  (ver `docs/REFACTORING_ROADMAP.md` P0) — não mascara o código ativo.

## 5. Comandos

| Ação | `midoteca/` | `client/` |
| --- | --- | --- |
| Lint | `npm run lint` | `npm run lint` |
| Lint (fix) | `npm run lint:fix` | `npm run lint:fix` |
| Formatar | `npm run format` | `npm run format` |
| Verificar formatação | `npm run format:check` | `npm run format:check` |
| Tipos | `npm run typecheck` | `npm run typecheck` |
| Testes | `npm test` | `npm test` |
| Build | `npm run build` | `npm run build` |

## 6. Commits — Conventional Commits

Padrão adotado: [Conventional Commits 1.0.0](https://www.conventionalcommits.org/).

```text
<tipo>(<escopo opcional>): <descrição no imperativo>

[corpo opcional]

[rodapé opcional: BREAKING CHANGE, Refs #123]
```

Tipos permitidos:

| Tipo | Uso |
| --- | --- |
| `feat` | nova funcionalidade |
| `fix` | correção de bug |
| `docs` | documentação |
| `refactor` | refatoração sem mudar comportamento |
| `perf` | performance |
| `test` | testes |
| `build` | build/dependências |
| `ci` | integração contínua |
| `style` | formatação (sem mudança de lógica) |
| `chore` | tarefas diversas |
| `revert` | reversão |

Escopos sugeridos (domínios): `library`, `media`, `courses`, `documents`,
`progress`, `indexing`, `search`, `jobs`, `settings`, `client`, `docs`, `deps`.

Exemplos:

```text
feat(indexing): reconciliação incremental por run token
fix(courses): não sobrescrever título manual no rescan
docs(architecture): documentar fronteira frontend↔backend
refactor(client): extrair usePlayerSession de VideoPlayerView
test(indexer): cobrir detecção de movimento por size+mtime
```

Mudança incompatível:

```text
feat(core)!: renomear campo relativePath

BREAKING CHANGE: relativePath substitui filePath; ajustar consumidores.
```

## 7. Versionamento e changelog

- **SemVer** (`MAJOR.MINOR.PATCH`): `BREAKING` → MAJOR; `feat` → MINOR;
  `fix`/demais → PATCH.
- **Changelog**: seguir [Keep a Changelog](https://keepachangelog.com/)
  (`CHANGELOG.md`) quando houver release; agrupar por `Added/Changed/Fixed`.

## 8. Definição de pronto (verificável)

Antes de concluir qualquer mudança nos pacotes ativos:

```bash
# backend
cd midoteca && npm run lint && npm run format:check && npm run typecheck && npm test

# frontend
cd client && npm run lint && npm run format:check && npm run typecheck && npm test
```

- [ ] `lint` sem erros (warnings justificados).
- [ ] `format:check` sem divergências.
- [ ] `typecheck` limpo.
- [ ] testes verdes.
- [ ] commit em Conventional Commits.

## 9. Integração contínua (GitHub Actions)

Workflow **`.github/workflows/ci.yml`** roda em `push`/`pull_request` para
`master`/`main`, com dois jobs independentes (backend e frontend) e cancelamento
de execuções obsoletas (`concurrency.cancel-in-progress`):

1. `npm ci`
2. `npm run lint`
3. `npm run format:check`
4. `npm run typecheck`
5. `npm test`
6. `npm run build`

O job do frontend instala o browser do Playwright
(`npx playwright install --with-deps chromium`) antes dos testes, pois as
*stories* rodam em modo browser (Vitest + Storybook addon). Node 20, com cache de
`npm` por `package-lock.json`.

## 10. Referências

- Prettier — <https://prettier.io/>
- ESLint (flat config) — <https://eslint.org/>
- typescript-eslint — <https://typescript-eslint.io/>
- React Rules of Hooks — <https://react.dev/reference/rules/rules-of-hooks>
- EditorConfig — <https://editorconfig.org/>
- Conventional Commits — <https://www.conventionalcommits.org/>
- Semantic Versioning — <https://semver.org/>
- Keep a Changelog — <https://keepachangelog.com/>
