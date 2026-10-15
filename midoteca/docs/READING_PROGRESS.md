# Progresso de Leitura — estado do leitor de PDF

> Progresso é ancorado no **documento lógico**, nunca no arquivo físico.

## 1. Modelo (backend, implementado)

`core/progress/entities.ts` → `ReadingProgress`:

| campo         | tipo            | notas                                              |
| ------------- | --------------- | -------------------------------------------------- |
| `id`          | string (UUID)   | PK                                                 |
| `documentId`  | string          | FK → `documents` (CASCADE), UNIQUE (1 linha/doc)   |
| `page`        | number          | 1-based, `>= 1`                                    |
| `scrollRatio` | number          | deslocamento normalizado na página, `0..1`         |
| `zoom`        | number          | fator (`> 0`; `1` = 100%)                          |
| `theme`       | string \| null  | preferência de tema (ex.: `dark` \| `original`)    |
| `viewMode`    | string \| null  | modo de leitura (`paged` \| `continuous`)          |
| `completedAt` | string \| null  | ISO quando marcado como lido; NULL enquanto aberto |
| `updatedAt`   | string          | ISO                                                |

Uma linha por documento (upsert em `saveReading`, `ON CONFLICT(document_id)`).

## 2. Casos de uso

`ProgressRepository` (`core/progress/repository.ts`):

- `saveReading(input)` → grava/atualiza e devolve o estado persistido;
- `getReading(documentId)` → estado atual ou `null`.

Validação em `progress.repository.sqlite.ts`: `page >= 1`, `0 <= scrollRatio <= 1`,
`zoom > 0`, `theme`/`viewMode` normalizados (string opcional), `completedAt`
normalizado como ISO-8601 ou `null`.

## 3. Migração

`view_mode` e `completed_at` foram adicionados em `0003-course-organization`
(ver [`DATABASE.md`](DATABASE.md) §9). Ambas aditivas, sem operação de arquivo.

## 4. Estado no frontend (parcial)

O leitor do client (`client/src/features/documents/application/usePdfReader.ts`)
já persiste estado de leitura via o port `ReadingStateRepository`, mas:

- o port usa `colorMode` (`dark`\|`original`) e `relativeScrollPosition`, enquanto
  o backend usa `theme` e `scrollRatio`;
- **não há `viewMode`** no domínio do client ainda;
- a implementação atual é `mockLibraryRepository` (localStorage), sem ponte para
  o backend SQLite.

**Integração pendente** (planejado): mapear `colorMode↔theme`,
`relativeScrollPosition↔scrollRatio`, introduzir `viewMode` no client e ligar o
port a um adaptador HTTP/IPC que fale com `progress.saveReading`/`getReading`.
Isso é uma tarefa de integração, não de domínio — a persistência do backend já
está pronta e testada.

## 5. Testes

`test/progress.spec.ts` cobre: gravação/leitura, upsert de linha única, validação
de limites, persistência após reabrir o banco, `viewMode`/`completedAt` e os
valores padrão `null`.
