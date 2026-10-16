# Arquitetura — núcleo (`midoteca/`)

> **Este documento é um ponteiro.** A arquitetura é **única para os dois
> runtimes** e vive em [`../../docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md)
> (camadas, nomes canônicos de arquivo e regras de dependência). Documentos
> derivados: pastas/nomes em
> [`../../docs/CODE_ORGANIZATION.md`](../../docs/CODE_ORGANIZATION.md), padrões
> táticos em [`../../docs/DDD_GUIDELINES.md`](../../docs/DDD_GUIDELINES.md),
> testes em [`../../docs/TESTING_STRATEGY.md`](../../docs/TESTING_STRATEGY.md) e
> migração incremental em
> [`../../docs/REFACTORING_ROADMAP.md`](../../docs/REFACTORING_ROADMAP.md).
> Regra permanente em [`../../AGENTS.md`](../../AGENTS.md).

## Visão em uma frase

Núcleo TypeScript **local-first**, desacoplado de transporte: SQLite local via
`better-sqlite3`, UUIDs (nunca caminho de arquivo), migrações forward-only e um
composition root (`createMidoteca`, em `app/composition-root.ts`) que injeta os
adapters. Regra de ouro: **excluir do catálogo nunca apaga arquivo físico**
(ver [`../../docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) §8).

## Estado atual

`app/` + `core/` + `modules/<ctx>/{domain,application,infrastructure}` +
`platform/`; casos de uso explícitos em `library`, `indexing`, `courses` e
`documents`. Pendências (nomenclatura P8, `presentation/` de transporte e
adapters acima do indicador) em
[`../../docs/REFACTORING_ROADMAP.md`](../../docs/REFACTORING_ROADMAP.md).

## Documentos específicos deste runtime

| Documento | Assunto |
| --- | --- |
| [`DATABASE.md`](DATABASE.md) | schema SQLite e migrações |
| [`FILE_IDENTITY.md`](FILE_IDENTITY.md) | identidade de arquivo físico × conteúdo lógico |
| [`LIBRARY_INDEXING.md`](LIBRARY_INDEXING.md) | descoberta e indexação incremental |
| [`DOMAIN_MODEL.md`](DOMAIN_MODEL.md) | modelo de domínio do núcleo |
| [`COURSE_ORGANIZATION.md`](COURSE_ORGANIZATION.md) | organização/edição de cursos |
| [`DOCUMENT_ASSOCIATIONS.md`](DOCUMENT_ASSOCIATIONS.md) | vínculos de documento |
| [`PDF_READER.md`](PDF_READER.md) · [`READING_PROGRESS.md`](READING_PROGRESS.md) | leitura de PDF e progresso |
| [`MYPLAY_AUDIT.md`](MYPLAY_AUDIT.md) | auditoria do backend legado (descartado) |
| [`adr/`](adr/) | decisões arquiteturais |

## ADRs

- [0001 — runtime do backend](adr/0001-backend-runtime.md)
- [0002 — estratégia de indexação](adr/0002-indexing-strategy.md)
- [0004 — edição de cursos](adr/0004-course-editing.md)
- [0005 — leitor de PDF](adr/0005-pdf-reader.md)
