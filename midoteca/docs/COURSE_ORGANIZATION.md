# Organização de Cursos — edição de curso/módulo/aula

> Regra de ouro: renomear, reordenar ou mover **nunca** toca arquivos físicos.
> Toda operação é somente de catálogo. Ver [`../docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md)
> e o ADR [`adr/0004-course-editing.md`](adr/0004-course-editing.md).

## 1. Objetivo

Permitir que o usuário organize um curso importado da biblioteca:

- renomear curso, módulo e aula;
- criar um módulo vazio;
- reordenar módulos;
- reordenar aulas dentro de um módulo;
- mover uma aula para outro módulo do mesmo curso;
- salvar toda a organização de uma vez (ordem + títulos + movimentos).

As operações preservam a identidade (UUID) de módulos e aulas, de modo que o
progresso de reprodução (por aula) permaneça ancorado após qualquer edição.

## 2. Camadas

```text
core/courses/
├── entities.ts        # Course, CourseModule, Lesson (com sortSource), LessonMedia
├── inputs.ts          # UpdateCourseModule, UpdateLesson, MoveLessonToModule,
│                      #   SaveCourseOrganization
├── organization.ts    # regras puras: normalizeReorder, planLessonMove,
│                      #   assertOrganizationCoversCourse
├── repository.ts      # porta CourseRepository (inclui reorder/move/save)
└── service.ts         # CourseOrganizationService (casos de uso)
```

- **Domínio puro** (`organization.ts`): valida e calcula ordens sem IO nem SQL.
  Testável isoladamente (`test/course.organization.spec.ts`).
- **Porta** (`repository.ts`): cada operação atômica tem um método explícito.
- **Adaptador** (`infra/sqlite/repositories/course.repository.sqlite.ts`):
  executa cada operação dentro de **uma transação** e reindexa em lote.
- **Aplicação** (`service.ts`): orquestra os casos de uso e lança `NotFoundError`
  quando o agregado não existe. É fino de propósito.

## 3. Casos de uso (`CourseOrganizationService`)

| Caso de uso                  | Método                                  | Efeito                                                |
| ---------------------------- | --------------------------------------- | ----------------------------------------------------- |
| Renomear curso               | `renameCourse(courseId, title)`         | título `manual`; rescan não sobrescreve               |
| Renomear módulo              | `renameModule(moduleId, title)`         | título `manual`                                       |
| Renomear aula                | `renameLesson(lessonId, title)`         | título `manual`                                       |
| Criar módulo                 | `createModule(courseId, title)`         | módulo vazio ao final (`sort_source='manual'`)        |
| Excluir módulo               | `deleteModule(moduleId)`                | só catálogo; aulas em cascata; arquivos intactos      |
| Reordenar módulos            | `reorderModules(courseId, orderedIds)`  | reindexa 0..n-1; `sort_source='manual'`               |
| Reordenar aulas              | `reorderLessons(moduleId, orderedIds)`  | reindexa 0..n-1; `sort_source='manual'`               |
| Mover aula de módulo         | `moveLessonToModule(lessonId, target…)` | move + reindexa origem e destino numa transação       |
| Salvar organização completa  | `saveCourseOrganization(snapshot)`      | ordem + títulos + movimentos numa transação           |
| Ler árvore                   | `getCourseTree(courseId)`               | `CourseTree` materializado ou `NotFoundError`         |

## 4. Invariantes

- **Ids imutáveis**: reordenar/mover troca apenas `sort_order`/`module_id`.
- **Cobertura exata**: um `SaveCourseOrganization` deve conter exatamente os
  módulos do curso e cobrir cada aula exatamente uma vez (sem órfãs, sem
  duplicatas, sem ids desconhecidos) — `assertOrganizationCoversCourse`.
- **Mesmo curso**: uma aula só pode migrar para um módulo do mesmo curso.
- **Sem duplicação**: mover para um módulo que já contém a aula é rejeitado.
- **Atomicidade**: qualquer falha de validação faz rollback da transação inteira;
  nada é parcialmente aplicado.

## 5. Precedência de ordem: `sort_source`

Análogo posicional de `title_source` (ver
[`LIBRARY_INDEXING.md`](LIBRARY_INDEXING.md)):

| valor      | significado                                            |
| ---------- | ------------------------------------------------------ |
| `detected` | ordem derivada do filesystem; rescan pode reescrevê-la |
| `manual`   | ordem definida pelo usuário; rescan **nunca** altera   |

No `SqliteIndexingStore`, `upsertModule`/`upsertLesson` só gravam `sort_order`
quando a linha está em `detected`. Ao mover/reordenar, o adaptador grava
`sort_source='manual'`.

## 6. Persistência

Cada operação usa `db.transaction(...)` (better-sqlite3, síncrono):

- `reorderModules` / `reorderLessons`: lê as linhas, valida via
  `normalizeReorder`, atualiza `sort_order`/`sort_source` e devolve a lista já
  reindexada.
- `moveLessonToModule`: valida origem/destino, calcula o plano puro com
  `planLessonMove` e reindexa ambos os lados.
- `saveOrganization`: valida a cobertura, aplica títulos/ordens/movimentos e
  relê a árvore dentro da mesma transação.

## 7. Limites e escopo

- **Undo** é responsabilidade da UI **antes de salvar** (snapshots em memória no
  client). O backend não mantém histórico de organização — ver ADR 0004.
- Excluir um módulo remove apenas o catálogo (aulas em cascata). Nenhum arquivo
  físico é removido; mídias referenciadas continuam em `media_files`.
- A edição de aulas que envolva arquivos físicos (importar/remover mídia) fica
  fora deste módulo.

## 8. Testes

`test/course.organization.spec.ts` cobre:

- regras puras (reordenação, plano de movimento, cobertura);
- renomear marca `manual`;
- reordenar mantém ids e reindexa; entrada inválida não altera nada;
- mover reindexa origem/destino; mover entre cursos é rejeitado;
- salvar snapshot aplica ordem/título/movimento; snapshot incompleto é rejeitado.

`test/indexer.spec.ts` (bloco _manual order precedence_) garante que um rescan
não sobrescreve ordem manual de módulos nem de aulas.
