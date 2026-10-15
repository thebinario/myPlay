# @midoteca/core — Fundação do Backend (Fase 1)

Núcleo de domínio e persistência da **Midoteca**, uma aplicação desktop
*local-first* para gerenciar e reproduzir bibliotecas pessoais de cursos, vídeos
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

```text
midoteca/
├── src/
│   ├── core/                # domínio puro (sem dependência de infra)
│   │   ├── library/         # LibrarySource
│   │   ├── media/           # MediaFile, MediaTrack
│   │   ├── courses/         # Course, CourseModule, Lesson, LessonMedia
│   │   ├── documents/       # Document, DocumentLink
│   │   ├── progress/        # PlaybackProgress, ReadingProgress
│   │   ├── jobs/            # Job (fila persistida)
│   │   ├── settings/        # AppSetting
│   │   ├── indexing/        # fronteira + tipos de job (Fase 2)
│   │   ├── search/          # fronteira + contrato (Fase 2)
│   │   └── shared/          # ids, erros, validação, JSON, caminhos
│   └── infra/sqlite/        # driver, migrações e repositórios SQLite
├── test/                    # testes Vitest (bancos temporários)
├── docs/                    # ARCHITECTURE, DATABASE, DOMAIN_MODEL, adr/, MYPLAY_AUDIT
└── scripts/migrate.cjs      # CLI de migração
```

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
