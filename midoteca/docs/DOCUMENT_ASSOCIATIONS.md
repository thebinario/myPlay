# Associações de Documentos — curso/módulo/aula

> Regra de ouro: desvincular um documento **nunca** remove o arquivo PDF nem a
> linha `documents`. Só o vínculo (`document_links`) é removido.

## 1. Objetivo

Um mesmo PDF pode ser anexado a um curso, a um módulo e/ou a uma aula. O módulo
`documents` mantém o documento lógico (`documents`) separado de seus vínculos
(`document_links`), permitindo:

- anexar um documento a qualquer escopo;
- listar documentos por curso/módulo/aula;
- desvincular sem perder o documento nem o arquivo.

## 2. Camadas

```text
core/documents/
├── entities.ts     # Document, DocumentLink
├── inputs.ts       # CreateDocumentLink, UpdateDocument
├── repository.ts   # porta DocumentRepository (create/list links + queries)
└── service.ts      # DocumentAssociationService (casos de uso)
```

Adaptador: `infra/sqlite/repositories/document.repository.sqlite.ts`.

## 3. Modelo

- `documents`: um documento lógico por arquivo (`media_file_id` UNIQUE).
- `document_links`: `document_id` + **ao menos um** de `course_id`, `module_id`,
  `lesson_id` (`CHECK`). `ON DELETE CASCADE` a partir de documentos e de cada
  alvo.
- `ux_document_links_target` (UNIQUE, migração 0003): impede vínculo duplicado do
  mesmo documento ao mesmo alvo, qualquer que seja o escopo.

## 4. Casos de uso (`DocumentAssociationService`)

| Caso de uso            | Método                                     | Efeito                                        |
| ---------------------- | ------------------------------------------ | --------------------------------------------- |
| Anexar ao curso        | `attachToCourse(documentId, courseId)`     | cria vínculo (idempotente)                    |
| Anexar ao módulo       | `attachToModule(documentId, moduleId)`     | cria vínculo (idempotente)                    |
| Anexar à aula          | `attachToLesson(documentId, lessonId)`     | cria vínculo (idempotente)                    |
| Anexar (genérico)      | `attach(input)`                            | idempotente                                   |
| Listar do curso        | `listCourseDocuments(courseId)`            | documentos vinculados ao curso                |
| Listar do módulo       | `listModuleDocuments(moduleId)`            | documentos vinculados ao módulo               |
| Listar da aula         | `listLessonDocuments(lessonId)`            | documentos vinculados à aula                  |
| Desvincular            | `detach(linkId)`                           | remove só o vínculo                           |
| Desvincular todos      | `detachAll(documentId)`                    | remove todos os vínculos do documento         |
| Detalhes               | `getDocumentDetails(documentId)`           | documento + vínculos, ou `NotFoundError`      |

Renomear um documento (`documents.update`) grava `title_source='manual'`.

## 5. Invariantes

- **Idempotência**: reanexar o mesmo alvo devolve o vínculo existente (não cria
  duplicata). Reforçado pelo índice único e pela checagem em `createLink`.
- **Alvo obrigatório**: um vínculo sem `course/module/lesson` é `ValidationError`.
- **Integridade referencial**: FKs garantem que curso/módulo/aula/documento
  existam; remover qualquer alvo cascateia apenas o vínculo.
- **Sem efeito colateral físico**: nenhuma operação apaga PDF ou linha
  `documents`/`media_files`.

## 6. Consultas

`listByCourse/Module/Lesson` fazem `JOIN` de `documents` com `document_links`,
retornando cada documento uma única vez (`DISTINCT`), ordenados por título.
`findLink` localiza um vínculo por alvo exato (usando `IS NULL` para os escopos
não informados).

## 7. Testes

`test/document.associations.spec.ts` cobre: anexar e listar por escopo;
idempotência; desvincular sem apagar documento/arquivo; `detachAll`; detalhes e
`NotFoundError`; renomear marca `manual`. `test/documents.spec.ts` cobre o
repositório base (criação, vínculo sem alvo rejeitado, cascata de exclusão).
