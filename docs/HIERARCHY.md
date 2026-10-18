# Hierarquia de Coleções, Cursos e Conteúdos

> Documento de referência para a organização da biblioteca da Midoteca a partir
> de **estruturas de pasta reais e heterogêneas**. Complementa
> [`ARCHITECTURE.md`](ARCHITECTURE.md), [`../midoteca/docs/COURSE_ORGANIZATION.md`](../midoteca/docs/COURSE_ORGANIZATION.md)
> e [`../midoteca/docs/DOMAIN_MODEL.md`](../midoteca/docs/DOMAIN_MODEL.md).

## 1. Motivação

Bibliotecas reais (cursos baixados de Udemy, Alura, Hotmart, Domestika, ...) vêm
com **profundidades e convenções de nomes inconsistentes**. A mesma árvore mistura
níveis, pastas que só têm PDF, pastas que são a própria aula e várias codificações
do mesmo vídeo. Precisamos de regras determinísticas para transformar essa
variação em um catálogo previsível, sem nunca alterar os arquivos originais.

## 2. Evidência: anatomia do path de referência

Raiz analisada: `~/Downloads/colecoes`.

```text
colecoes/                                         ← raiz (fonte)
├── Coleção 01 - Tecnologia/                      ← coleção
│   └── Programação Front-end/                    ← categoria (facet)
│       ├── Udemy/                                ← plataforma (facet)
│       │   └── Curso 01 - Lógica de Programação/ ← curso
│       │       ├── Aulas/                        ← seção (arquivos soltos)
│       │       └── Materiais/Apostilas/          ← seção > subpasta (só PDF)
│       └── Alura/
│           └── Curso 02 - HTML e CSS com Projeto/
│               ├── 01 - Fundamentos/             ← seção
│               │   ├── Módulo 01 - Conceitos/    ← módulo
│               │   │   └── Aula 01 - Apresentação/  ← aula (pasta)
│               │   │       ├── Apostila 01 - Introdução.pdf
│               │   │       └── Aula 04 - Gravação da Aula.mp4
│               │   └── Módulo 02 - Prática/
│               ├── 02 - Projeto Final/
│               └── 03 - Ao Vivo/                 ← seção, arquivos soltos
└── Coleção 02 - Negócios e Criativo/
    ├── Design/Domestika/Curso 04 - Design Gráfico/
    │   ├── Ao Vivo/
    │   └── Semana 01/Unidade 01 - Fundamentos/Aula 01 - Apresentação/
    └── Marketing Digital/Hotmart/Curso 03 - Boas Práticas de Marketing/
        ├── 01 - Introdução/Aula 01 - Boas-vindas/
        ├── 02 - Conteúdo/Aula 01 - Aula Prática/
        └── 03 - Encerramento/Aula 01 - Considerações Finais/
```

### Variações observadas

| Variação | Exemplo | Tratamento |
| --- | --- | --- |
| Profundidade 1–3 níveis entre curso e conteúdo | `Aulas/…`, `Semana 01/Unidade 01/…` | colapso (ver §4) |
| Aula como **pasta** | `Aula 01 - Apresentação/` | vira aula; arquivos internos viram mídia/materiais |
| Aula como **arquivo** direto na seção | `03 - Ao Vivo/Aula 03 ….webm` | módulo implícito `Aulas` |
| Pasta só com PDFs | `Materiais/Apostilas/` | seção/módulo com documentos |
| Prefixos variados | `01 -`, `Módulo NN`, `Unidade NN`, `Semana NN`, `Aula NN` | `cleanName` + papel por contexto |
| Várias codificações do mesmo vídeo | `Aula 03 … 540p.ts/.webm/.avi`, `… (Cópia)` | dedup por título normalizado |
| Ruído de sistema | `.DS_Store` | ignorar na descoberta |

## 3. Hierarquia canônica

Nível físico (arquivos) e nível lógico (catálogo) são separados. O catálogo é:

```text
Fonte → Coleção* → Curso → Seção* → Módulo* → Aula/Conteúdo
```

- **Coleção** (`Collection`) — agrupamento de cursos. Primeira classe.
- **Curso** (`Course`) — unidade catalogável.
- **Seção** (`CourseSection`) — agrupamento de módulos dentro do curso.
- **Módulo** (`CourseModule`) — agrupamento de aulas.
- **Aula/Conteúdo** (`Lesson` + `Document`) — folha com vídeo e/ou arquivos de texto/PDF.

`*` = opcional. As regras abaixo garantem que **qualquer** profundidade caiba
nesse esquema, sem árvore genérica.

### Facets (não são níveis estruturais)

- **Categoria** (ex.: `Programação Front-end`) e **Plataforma** (ex.: `Udemy`)
  são **tags** do curso, não pastas estruturais. Aparecem como filtros/chips na
  UI e evitam inflar o schema com níveis que variam por origem.

## 4. Regras de normalização (colapso)

A partir de uma lista plana de arquivos relativos:

1. **Aula**: a menor pasta que contém mídia. Se a mídia está direto na
   seção/curso, a aula é o próprio arquivo (a pasta-mãe é módulo/seção).
2. **Módulo**: a pasta imediatamente acima da aula **dentro do curso**. Se um
   vídeo é filho direto da seção/curso, cria-se o módulo implícito `Aulas`.
3. **Seção**: 1+ níveis acima do módulo, ainda dentro do curso. Níveis extras
   colapsam no **título** da seção (breadcrumb), preservando a ordem detectada.
4. **Curso**: a pasta sob a coleção/facets que contém a árvore de aulas.
5. **Coleção**: a pasta no topo da fonte cujos filhos são cursos (ou outras
   coleções). Quando a fonte já é um curso (sem coleção), o nível é omitido.
6. **Ordem**: derivada do prefixo numérico (`01`, `1`, `1.`) via `cleanName`,
   com desempate `naturalCompare`. Ordem definida pelo usuário (`manual`) nunca é
   sobrescrita por rescan.

### Dedup de codificações

Vídeos com o mesmo título normalizado (ignorando resolução e sufixos como
`(Cópia)`, `1080p`, `360p`) apontam para **uma** aula com múltiplos arquivos
(`LessonMedia`), preferindo a maior resolução/qualidade como `primary`.

### Formatos suportados

| Classe | Extensões |
| --- | --- |
| Vídeo | `.mp4`, `.mkv`, `.webm`, `.avi`, `.mov`, `.m4v`, `.wmv`, `.mpg`, `.mpeg`, `.ts` |
| Texto/PDF | `.pdf` (e, no futuro, `.txt`, `.md`, `.epub`) |
| Legenda | `.srt`, `.vtt`, `.ass`, `.ssa` |
| Ignorados | `.DS_Store`, `Thumbs.db`, temporários |

> `MediaKind` no núcleo precisa aceitar `.ts` como vídeo (hoje ausente em
> `classifyExtension`).

## 5. UI — organização enxuta

Princípio: **mostrar só o necessário**. Poucos níveis visíveis ao mesmo tempo,
com drill-down e breadcrumb.

```text
[ Fontes ] › [ Coleções ] › [ Curso ] › [ Seção ] › [ Módulo ] › [ Aula ]
```

- **Coleções**: grade de cards (título, nº de cursos, duração, progresso).
  Sem descrição longa nem metadados redundantes.
- **Curso**: cabeçalho com progresso e chips de categoria/plataforma; seções
  colapsáveis; dentro da seção, módulos e aulas.
- **Aula**: linha com título, duração e indicador de conclusão (PDFs como
  segunda linha, mesma hierarquia).
- Chips de **Categoria/Plataforma** funcionam como filtros, não como telas.
- Estados vazios, carregando e indisponível padronizados.

### Regras de conteúdo visual

| Mostrar | Evitar |
| --- | --- |
| Título, contagem de vídeos/PDFs, progresso | Descrições longas em listas |
| Breadcrumb curto (2–4 níveis) | Repetir a mesma tag em cada item |
| Chips de filtro | Painéis com dezenas de facetas |
| Ícone + 1 linha de contexto na aula | Blocos densos de metadados |

## 6. Fronteira FE ↔ núcleo

O **núcleo `midoteca/` é a fonte de verdade**: ele descobre, normaliza e fornece
o read model (coleções, cursos, seções, módulos, aulas, contagens, progresso). O
frontend apenas apresenta e envia comandos; não recalcula hierarquia.

## 7. Migração incremental

1. **Válida agora**: `organize()` no núcleo passa a emitir
   `Coleção → Curso → Seção → Módulo → Aula` com colapso, dedup e formatos.
2. **Persistência**: novas tabelas `collections` e `course_sections` +
   `courses.collection_id` / `course_modules.section_id` (migração aditiva,
   sem alterar dados existentes).
3. **Cliente**: tipos + read models e mocks realistas (esta entrega), depois
   ligação por IPC.
4. **UI**: navegação por breadcrumb e listas colapsáveis.

Código novo já nasce na arquitetura correta; o legado migra quando tocado.

## 8. Status de implementação (núcleo)

Concluído no núcleo `midoteca/`:

- `indexing/domain/organization.ts` emite `Coleção → Curso → Seção → Módulo → Aula`
  com detecção por path/nome, facets (categoria = 1º nível entre coleção e curso,
  provedor = último), colapso de níveis e dedup de codificações
  (`540p`, `(Cópia)`).
- Detecção **na raiz da fonte** (`rootKind`, inferido do nome da pasta raiz):
  fonte cuja raiz é a própria coleção (`Coleção …`) abre a coleção na raiz
  (`relativePath = ''`) e lê facets/curso a partir do 1º nível; fonte cuja raiz é
  o próprio curso (`Curso …`) vira o curso (raiz), com os níveis abaixo
  classificados como seção/módulo. Sem isso, importar apontando direto para uma
  coleção/curso criava cursos com `collection_id` NULL ou um curso espúrio
  (`Aulas`). `apply-organization` vincula a coleção de raiz (path vazio) ao curso.
- Scanner reconhece `.ts` como vídeo.
- Migração `0005-collections`: tabelas `collections` e `course_sections`,
  colunas `courses.collection_id`/`category`/`provider` e
  `course_modules.section_id` (aditiva).
- `IndexingStore.upsertCollection` / `upsertSection`; `apply-organization`
  persiste a hierarquia completa.
- Read models `CollectionSummary` / `CollectionTree` expostos via
  `catalog.listCollections` e `catalog.getCollectionTree` (JSON-able).
- `catalog.getCourseTree` passou a incluir `course.collectionId` e `sections`
  (agrupamento de módulos), mantendo `modules` achatado por compatibilidade.
- `Course` (read model) expõe `category`/`provider` (colunas gravadas pelo
  indexer); `catalog.getCourseTree` e `courses.list` passam a devolvê-los.
- `CollectionSummary` (`catalog.listCollections`) passou a trazer os agregados
  `totalDurationSeconds` e `progress` (aulas + PDFs vinculados), calculados
  no backend — o grid de coleções não recalcula duração/progresso.

Concluído no cliente `client/` (consumo em produção):

- `load-library-catalog` lê `catalog.listCollections` e monta o read model de
  coleções (`buildCollections`), consumindo `totalDurationSeconds`/`progress`
  diretamente do backend (sem recalcular na UI).
- `map-catalog` projeta `collectionId`, `sections`, `category` e `provider` em
  `Course`; `tags` derivam de `metadata.tags` quando presentes, senão de
  `[category, provider]` (convenção do catálogo). `coverUrl` permanece vazio para
  conteúdo descoberto (não há imagem no filesystem).
- `LibraryCatalogRepository.getCollections()` (+ `MockLibraryService` e
  `IpcLibraryRepository`); `useLibrary()`/`useLibraryCollections()` reativos.
- Drill-down da **fonte** (`LibraryView`): ao abrir uma fonte, mostra as
  **coleções dessa fonte** (`CollectionsGrid` filtrado por `sourceId`); abrir uma
  coleção mostra os cards de curso (`CollectionDetail`/`CoursesGrid`). Fontes sem
  coleção mostram os cursos como cards (vários) ou o conteúdo do curso único.
  Antes, a fonte "achatava" os cursos e renderizava cada um como bloco de módulos
  (`LibraryCourseContents`), parecendo módulos.
- `LibraryView` renderiza `CollectionsGrid` na home. Ao abrir uma coleção:
  - **um único curso** → mostra a listagem de módulos desse curso
    (`LibraryCourseContents`), sem passo extra;
  - **vários cursos** → mostra a grade de `CourseCard`s (`CoursesGrid`) e o
    clique abre o detalhe do curso. O clique no curso reusa o fluxo já
    existente (navegação aditiva, sem alterar o fluxo por fonte).
- Módulos são exibidos com **numeração contínua + nome detectado** (ex.:
  `Módulo 1 · Módulo 01 - Conceitos`), na grade do curso e na listagem da
  coleção/curso único. A numeração contínua distingue módulos de mesmo título em
  seções diferentes.
- `CourseDetailsView` agrupa os módulos **por seção** quando o curso tem
  `sections` (fallback plano quando não tem). Necessário porque módulos de
  seções distintas compartilham o mesmo título (ex.: `Aulas`) na projeção plana
  `course.modules`, o que os exibia duplicados/errados.

Próximo incremento: enriquecer `getCollectionTree` com aulas/duração caso a UI
passe a abrir a coleção direto do backend (hoje o detalhe vem de `getCourseTree`).
