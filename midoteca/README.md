# @midoteca/core — Fundação do Backend (Fase 1)

Núcleo de domínio e persistência da **Midoteca**, uma aplicação desktop
_local-first_ para gerenciar e reproduzir bibliotecas pessoais de cursos, vídeos
e documentos PDF.

Este pacote é a **Fase 1**: contratos de domínio, esquema SQLite versionado e
repositórios. Ele é deliberadamente **agnóstico de transporte** — não depende de
NestJS, Express, HTTP, IPC ou Tauri — para poder ser embarcado em qualquer
runtime no futuro.

> O backend legado do myPlay (`../backend`, NestJS + PostgreSQL) permanece
> intacto como referência. Nada aqui o importa ou modifica.

## Requisitos

- Node.js >= 20 (testado em Node 24)
- Nenhum PostgreSQL, internet ou arquivo multimídia é necessário

## Instalação

```bash
cd midoteca
npm install
```

## Scripts

```bash
npm test            # executa a suíte (Vitest)
npm run test:watch  # modo watch
npm run typecheck   # tsc --noEmit (modo strict)
npm run build       # compila para dist/
npm run db:migrate [caminho.db]   # aplica migrações (requer build)
```

## Uso

```ts
import { createMidoteca } from '@midoteca/core';

const app = createMidoteca(); // banco no diretório de dados do usuário

const source = await app.library.createSource({
  rootPath: '/Volumes/HD-Externo',
  volumeId: 'VOL-123',
});

const media = await app.media.create({
  sourceId: source.id,
  relativePath: 'curso/aula-01.mp4',
  mediaType: 'video',
});

const course = await app.courses.create({ title: 'Meu Curso' });
const mod = await app.courses.createModule({ courseId: course.id, title: 'Módulo 1' });
const lesson = await app.courses.createLesson({ moduleId: mod.id, title: 'Aula 1' });

await app.courses.attachMedia({
  lessonId: lesson.id,
  mediaFileId: media.id,
  role: 'primary',
});

await app.progress.savePlayback({ lessonId: lesson.id, positionMs: 12000 });
console.log((await app.progress.getPlayback(lesson.id))?.positionMs); // 12000

app.close();
```

O caminho do banco pode ser injetado (útil para testes/instalações portáteis):

```ts
const app = createMidoteca({ databaseFile: '/tmp/midoteca.db' });
```

## Estrutura

Layout **canônico** (o mesmo do frontend; migração **P5** concluída sem mudança
de comportamento — ver [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) §3 e §10):

```text
midoteca/
├── src/
│   ├── index.ts             # API pública (re-exporta core/, modules/, platform/)
│   ├── app/                 # composition root: createMidoteca()
│   ├── core/                # kernel: domain compartilhado + erros/validação/ids/clock/JSON
│   ├── modules/<contexto>/  # library, media, courses, documents, progress, jobs,
│   │                        #   settings, indexing, search
│   │   ├── domain/          #   entidades, inputs, ports, regras puras
│   │   ├── application/     #   casos de uso, queries, serviços de orquestração
│   │   └── infrastructure/  #   adapters (ex.: *.repository.sqlite.ts)
│   └── platform/            # persistence/sqlite, fs, events (2+ contextos)
├── test/                    # testes Vitest (bancos temporários)
├── docs/                    # ARCHITECTURE, DATABASE, DOMAIN_MODEL, adr/, MYPLAY_AUDIT
└── scripts/migrate.cjs      # CLI de migração
```

Modelo canônico completo (vale para backend e frontend):
[`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md).

## Documentação

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — visão geral e decisões
- [`docs/DATABASE.md`](docs/DATABASE.md) — esquema, índices, constraints e migrações
- [`docs/DOMAIN_MODEL.md`](docs/DOMAIN_MODEL.md) — entidades, relacionamentos e contratos
- [`docs/adr/0001-backend-runtime.md`](docs/adr/0001-backend-runtime.md) — escolha de runtime
- [`docs/MYPLAY_AUDIT.md`](docs/MYPLAY_AUDIT.md) — auditoria do backend myPlay de referência

## Limitações conhecidas (Fase 1)

- Nenhum player, streaming, transcodificação ou scanner de diretórios.
- Nenhum processamento de IA, fingerprint, transcrição ou busca (RAG/FTS5).
- `indexing` e `search` existem apenas como fronteiras/contratos.
- Fila de `jobs` é persistida, mas **não há worker** executando-a.
- Sem sincronização com Cloudflare D1.

Consulte `docs/ARCHITECTURE.md` para o plano de evolução da Fase 2.
