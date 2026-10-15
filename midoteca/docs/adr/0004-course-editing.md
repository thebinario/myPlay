# ADR 0004 — Edição e organização de cursos

- **Status**: Aceito
- **Contexto**: Fase 4 (organização de cursos, associações e leitor)
- **Relacionado**: [`../COURSE_ORGANIZATION.md`](../COURSE_ORGANIZATION.md),
  [`../LIBRARY_INDEXING.md`](../LIBRARY_INDEXING.md),
  [`../DATABASE.md`](../DATABASE.md),
  [`0002-indexing-strategy.md`](0002-indexing-strategy.md)

## Contexto

A indexação (Fase 2) cria a árvore curso→módulo→aula a partir do filesystem e
**recalcula `sort_order` a cada rescan** — o ADR 0002 registrou explicitamente
"reordenação manual fina fica para depois". O usuário precisa renomear, reordenar
e mover aulas/módulos sem que um rescan desfaça seu trabalho, e sem que a edição
toque arquivos físicos.

## Decisão

1. **Proveniência de ordem** (`sort_source`: `detected`\|`manual`), análoga a
   `title_source`. Uma vez `manual`, um rescan **nunca** sobrescreve
   `sort_order`. `upsertModule`/`upsertLesson` passam a respeitar isso.

2. **Regras puras em `core/courses/organization.ts`**: `normalizeReorder`,
   `planLessonMove` e `assertOrganizationCoversCourse` validam e calculam ordens
   sem IO nem SQL.

3. **Casos de uso explícitos** em `CourseOrganizationService` (renomear,
   criar/excluir módulo, reordenar módulos/aulas, mover aula, salvar snapshot).

4. **Operações atômicas** no adaptador SQLite, cada uma em uma transação; o
   `SaveCourseOrganization` aplica ordem + títulos + movimentos de uma vez.

5. **Ids imutáveis**: reordenar/mover altera apenas `sort_order`/`module_id`,
   preservando o vínculo do progresso (ancorado em `lesson_id`).

6. **Somente catálogo**: nenhuma operação de organização toca arquivos físicos;
   excluir módulo remove apenas linhas (aulas em cascata).

7. **Undo no cliente, antes de salvar**: a UI mantém uma pilha de snapshots
   (`useCourseEditor`) e descarta/restaura sem round-trip. O backend não guarda
   histórico de organização.

## Alternativas consideradas

| Alternativa                                        | Motivo da rejeição                                  |
| -------------------------------------------------- | --------------------------------------------------- |
| Recalcular ordem sempre no rescan                  | Desfaz a curadoria do usuário                       |
| Ordem implícita pela posição do array do plano     | Não sobrevive a rescan; sem proveniência            |
| Reordenar renumerando/regerando ids                | Perde progresso e vínculos de mídia                 |
| Undo persistido no backend                         | Complexidade e schema extra sem ganho imediato      |
| Salvar cada arrasto como transação separada        | Muitas escritas; snapshot único é mais consistente  |
| Validar cobertura apenas no serviço (não no porto) | Adaptadores alternativos reimplementariam a regra   |

## Consequências

**Positivas**

- Rescans não destroem organização manual (módulos e aulas).
- Operações atômicas: falha de validação → rollback total.
- Domínio puro e testável; adaptador fino.
- Progresso preservado por id após reordenação/movimento.

**Negativas / trade-offs**

- Um `sort_source` a mais para manter coerente em futuras migrações.
- `saveOrganization` exige o snapshot completo (cobertura exata) — a UI deve
  enviar a árvore inteira.
- Undo limitado à sessão do editor (não sobrevive a reload).

## Revisão futura

- Histórico/undo persistido, se houver demanda.
- Reordenação que também reflita em `.midoteca/course.json` (opcional, reversível).
