# Auditoria do myPlay (repositório de referência)

Escopo: `backend/` do myPlay (NestJS + TypeORM + PostgreSQL). O frontend
`client/` já é o **midoteca-desktop** (React + Vite) e foi preservado.

## Problemas identificados — verificados no código

| #   | Problema                                         | Evidência                                                                                                                                                                                                                                                                                                     | Confirmado                           |
| --- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| 1   | Duas entidades `Video` com estruturas diferentes | `src/video/entities/video.entity.ts` (UUID, `filePath`, `lastPosition`) **em uso** por `app.module` → `video/video.module`; `src/modules/video/entities/video.entity.ts` (id numérico, `path`, `last_position`) referenciada apenas por `config/database.config.ts`, que **não é importado** por `app.module` | Sim — `modules/video` é código morto |
| 2   | Associação direta entre vídeo e caminho físico   | coluna `filePath`/`path` na própria entidade; `findByPath`, `importVideosFromDirectory` usam o caminho como identidade                                                                                                                                                                                        | Sim                                  |
| 3   | PostgreSQL com credenciais embutidas             | `config/database.config.ts` hardcoda `postgres/postgres` e `myplay/myPlay`, cria banco/role no boot; defaults iguais em `typeorm.config.ts`/`data-source.ts`                                                                                                                                                  | Sim                                  |
| 4   | Serviço de vídeo com muitas responsabilidades    | `src/video/video.service.ts` (458 linhas): CRUD, streaming por range, orquestração de transcodificação, scan de diretório, caches LRU                                                                                                                                                                         | Sim                                  |
| 5   | Remoção de registro pode excluir arquivo físico  | `video.service.ts` `remove()` chama `fs.promises.unlink(video.filePath)` antes de remover a linha                                                                                                                                                                                                             | Sim                                  |
| 6   | Progresso dentro da própria entidade de vídeo    | coluna `lastPosition` e `savePosition()` gravando na entidade `Video`                                                                                                                                                                                                                                         | Sim                                  |

Observações adicionais: `backend/backend/src/migrations/` (diretório aninhado
espúrio), `src/debug-db.ts`, múltiplas migrações `AddAliasColumn` duplicadas e
`config/database.config.ts` com bootstrap destrutivo de banco.

## Classificação dos componentes

| Componente                                                     | Classificação               | Observação                                                                   |
| -------------------------------------------------------------- | --------------------------- | ---------------------------------------------------------------------------- |
| `client/` (midoteca-desktop)                                   | **Reaproveitar**            | Frontend da Midoteca; preservado intacto                                     |
| `backend/src/config/app.config.ts`                             | **Reaproveitar (conceito)** | Lista de extensões e parâmetros de transcodificação servem de referência     |
| Ideias de streaming por range e cache LRU (`video.service.ts`) | **Reaproveitar (conceito)** | Úteis na Fase 2 (player/streaming)                                           |
| Estratégia de migrações versionadas                            | **Reaproveitar (conceito)** | Reimplementada para SQLite                                                   |
| `backend/src/video/entities/video.entity.ts`                   | **Substituir**              | Mistura conteúdo lógico, arquivo físico, transcodificação e progresso        |
| `backend/src/video/video.service.ts`                           | **Substituir**              | Responsabilidades demais; quebrar em módulos (media/progress/streaming/jobs) |
| `backend/src/video/video.controller.ts`                        | **Substituir**              | HTTP/transcodificação; nova camada de transporte na Fase 2                   |
| `backend/src/modules/video/**`                                 | **Descartar**               | Código morto (não registrado em `app.module`)                                |
| `backend/src/config/database.config.ts`                        | **Descartar**               | PostgreSQL + credenciais embutidas + bootstrap destrutivo                    |
| `backend/src/config/typeorm.config.ts`, `data-source.ts`       | **Descartar**               | Específicos de PostgreSQL/TypeORM                                            |
| `backend/src/migrations/**`                                    | **Descartar**               | Schema PostgreSQL do myPlay                                                  |
| `backend/backend/**`, `debug-db.ts`, `scripts/**`, `test/**`   | **Descartar**               | Artefatos/experimentos; sem valor para a fundação                            |
| `backend/src/main.ts`, `app.module.ts`, `app.controller.ts`    | **Descartar**               | Bootstrap NestJS do player antigo                                            |

## Conclusão

O backend do myPlay foi **descartado como base de código**, mas **reaproveitado
como referência conceitual** (formatos, parâmetros de transcodificação, ideias de
streaming). Nenhum arquivo do myPlay foi alterado. A fundação da Midoteca foi
construída em um pacote novo e isolado (`midoteca/`), sem PostgreSQL e sem
acoplar caminhos físicos a registros.
