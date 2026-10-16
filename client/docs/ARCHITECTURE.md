# Arquitetura — frontend (`client/`)

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

Cliente React 19 + Vite 6 **local-first**. Hoje consome um repositório em memória
com persistência em `localStorage` (`MockLibraryService`); o objetivo é trocar
essa origem por um adapter ligado ao núcleo **sem alterar os componentes**. Toda
leitura/escrita passa pelo **contrato de fronteira** `LibraryRepository`
(`core/contracts/`), obtido via `useLibrary()` / `useLibraryRepository()`.

## Estado atual

`app/` + `core/{domain,contracts,config}` +
`modules/<ctx>/{domain,application,infrastructure,presentation}` + `shared/ui`.
Casos de uso em `application/use-cases/`, hooks em `presentation/hooks/` e
cálculos de interação/apresentação em `domain/` (`courses`, `documents`,
`player`). Regras de negócio autoritativas ficam no backend; essas áreas do
frontend não devem decidir resultados nem duplicar invariantes do backend.
Pendências (mover
contratos para `core/contracts/`, testes para `test/`, adapter IPC/HTTP e remover
`legacy/`) em
[`../../docs/REFACTORING_ROADMAP.md`](../../docs/REFACTORING_ROADMAP.md).

## Fluxo de dados

```text
main.tsx (composition root)
   │  new MockLibraryService(localStorageLibraryStorage)
   ▼
<LibraryProvider repository={…}>  →  useLibrary() · useLibraryRepository() · useLibraryItems()
   ▼
view (presentation) ──► hook (presentation/hooks) ──► caso de uso (application) ──► LibraryRepository (contrato)
                                                                                     ├── MockLibraryService   (hoje)
                                                                                     └── IpcLibraryRepository (futuro → núcleo)
```

- `useLibraryItems()` usa `useSyncExternalStore` sobre `repository.subscribe`; o
  snapshot precisa ser **estável** (não criar array novo a cada leitura).
- **Mutar posição de reprodução/leitura não dispara assinantes** (por contrato);
  só mutações de catálogo notificam.

## Documentos específicos deste runtime

| Documento | Assunto |
| --- | --- |
| [`DOMAIN_MODEL.md`](DOMAIN_MODEL.md) | view-models e contratos do frontend |
| [`adr/`](adr/) | decisões arquiteturais |

## ADRs

- [0001 — fronteira de repositório](adr/0001-repository-boundary.md)
