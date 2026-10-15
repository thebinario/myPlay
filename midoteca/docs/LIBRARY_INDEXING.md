# Indexação de biblioteca — Midoteca (Fase 2)

Este documento descreve como a Midoteca descobre, cataloga e organiza arquivos a
partir de uma `LibrarySource` (tipicamente um HD externo), de forma incremental e
**nunca destrutiva**.

## 1. Princípios

1. **Somente leitura no disco.** O indexador abre diretórios, lê `stat` e (opcional
   e futuramente) o conteúdo para hash. Ele nunca cria, move, renomeia ou apaga
   arquivos do usuário.
2. **Caminhos relativos.** Arquivos são identificados por
   `(source_id, relative_path)`, nunca por caminho absoluto. Remontar o HD em
   outro ponto não invalida o catálogo.
3. **Incremental.** Reescaneamentos custam apenas um `touch` por arquivo
   inalterado; nada é reprocessado do zero.
4. **Não destrutivo.** Arquivos ausentes viram `availability = 'missing'`; linhas
   jamais são apagadas por ausência.

## 2. Formatos suportados

| Categoria | Extensões                                        |
| --------- | ------------------------------------------------ |
| Vídeo     | `.mp4 .mkv .avi .mov .webm .wmv .m4v .mpg .mpeg` |
| PDF       | `.pdf`                                           |
| Legenda   | `.srt .vtt .ass .ssa`                            |

Qualquer outra extensão é ignorada na descoberta.

## 3. Descoberta (`RecursiveFileScanner`)

- Caminhada **iterativa** (pilha), sem recursão profunda.
- **Segura contra ciclos**: diretórios são deduplicados por `realpath`. Links
  simbólicos para diretórios não são seguidos por padrão (`followSymlinks: false`).
- **Tolerante a erros**: diretório ilegível incrementa `errors` e a varredura
  continua.
- **Cancelável**: honra um `AbortSignal` a cada entrada.
- **Progresso**: `onProgress({ matched, visited, directories, errors,
currentPath })`, emitido com throttle (padrão 250 ms).

Saída por arquivo (`DiscoveredFile`): caminho absoluto e relativo (POSIX),
nome, extensão, `kind`, `size`, `modifiedAt` (ISO).

## 4. Reconciliação incremental (run token)

Cada `runScan` gera um `runToken` (UUID) gravado em `media_files.last_seen_at`.

Para cada arquivo descoberto, em lotes (`batchSize`, padrão 200):

| Situação         | Detecção                                                                   | Ação                               |
| ---------------- | -------------------------------------------------------------------------- | ---------------------------------- |
| Novo             | sem linha em `(source, relative_path)` e sem candidato                     | `insert` (`created`)               |
| Inalterado       | linha existe, `size` e `mtime` iguais                                      | `touch` (`unchanged`)              |
| Modificado       | linha existe, `size` ou `mtime` mudou                                      | `touch` (`updated`)                |
| Movido/renomeado | sem linha no caminho, mas **um único** candidato com mesmo `(size, mtime)` | `touch` com novo caminho (`moved`) |

Ao final, `markMissing(runToken)` marca `availability = 'missing'` em toda linha
da fonte não vista nesta execução (índice `ix_media_files_last_seen`).

> **Ambiguidade**: se houver **mais de um** candidato com o mesmo `(size, mtime)`,
> o arquivo é tratado como novo (não como movimento), evitando reassociação
> incorreta.

## 5. Organização (pasta → curso/módulo/aula)

`organize()` é **pura** (sem IO) e produz um `OrganizePlan`:

- Cada **diretório de primeiro nível com vídeos** vira um **curso**.
- Dentro do curso, cada subpasta com vídeos vira um **módulo**; vídeos soltos
  diretamente no curso entram no módulo implícito **"Aulas"**.
- Cada vídeo vira uma **aula**; a aula é vinculada ao arquivo via
  `lesson_media(role='primary')`.
- **PDFs** viram **documentos**: no nível do curso, no nível do módulo, ou
  "soltos" (sem vínculo) quando o diretório não tem vídeos.
- Vídeos na **raiz da fonte** formam um curso sintético (título = rótulo da
  fonte); PDFs na raiz ficam soltos.
- **Legendas** são pareadas ao vídeo irmão pelo nome-base (sufixo de idioma
  opcional) e registradas como `media_tracks(kind='subtitle')`.

### 5.1 Limpeza de nomes

`cleanName()` remove o prefixo de ordenação (`01 `, `01-`, `01.`, `01_`) e
normaliza separadores, produzindo `{ order, title }`. A ordenação usa
`naturalCompare` (numérico): `"Aula 2"` vem antes de `"Aula 10"`.

## 6. Manifesto `.midoteca/course.json`

Arquivo **opcional**, editável à mão, colocado na raiz de um diretório de curso:

```json
{
  "version": 1,
  "course": { "title": "Meu Curso" },
  "modules": { "Curso A/Modulo 1": { "title": "Introdução" } },
  "lessons": { "Curso A/Modulo 1/01 - Intro.mp4": { "title": "Boas-vindas" } }
}
```

- `version` deve ser `1`; versão desconhecida é rejeitada.
- Manifesto ausente, ilegível ou com JSON inválido resolve para `null` e **nunca
  aborta** a varredura.
- As chaves de `modules`/`lessons` são os `relative_path`.

## 7. Precedência de títulos

```
manual  >  manifest  >  detected
```

- **detected**: derivado do nome do arquivo/pasta por `cleanName`.
- **manifest**: vindo do `.midoteca/course.json`.
- **manual**: definido pelo usuário via `courses.update({ title })` (ou inputs
  equivalentes), que grava `title_source = 'manual'`.

Um rescan **nunca** sobrescreve um título `manual`. `detected_title` preserva
sempre o último valor detectado no sistema de arquivos.

## 8. Disponibilidade da fonte

- `probe.inspect(rootPath)` verifica existência, tipo (diretório) e leitura.
- Fonte indisponível → `status = 'offline'`, evento `source:disconnected`,
  `summary.status = 'source-unavailable'`.
- `LibrarySourceService.checkAvailability()` faz o mesmo sob demanda.

## 9. Back-pressure (`ResourceGovernor`)

Sinais cooperativos: `playbackActive`, `diskBusy`, `memoryPressure`, `onBattery`.

- `pause()` / `resume()` — o indexador `await waitWhilePaused()` entre lotes.
- `cancel()` — interrompe a varredura; estado do catálogo é preservado e a fonte
  volta para `active`.
- `throttle()` — pequena espera proporcional aos sinais ativos.

## 10. Eventos

Tipados em `core/indexing/events.ts`, emitidos **após o commit**:

`source:added`, `source:connected`, `source:disconnected`, `media:discovered`,
`media:updated` (`reason: modified|moved`), `media:unavailable`,
`course:organized`, `index:started`, `index:progress`, `index:paused`,
`index:completed`, `index:failed`.

Uma camada desktop (IPC/WebSocket) pode assinar o bus e repassar; o núcleo não
assume transporte.

## 11. Uso

```ts
const source = await app.sources.addSource({ rootPath: '/Volumes/HD Cursos' });
const summary = await app.indexer.runScan({ sourceId: source.id });

console.log(summary); // { status, discovered, created, updated, moved, ... }

const courses = app.queries.listCourses({ sourceId: source.id, limit: 20 });
const hits = app.queries.search('introdução');
```
