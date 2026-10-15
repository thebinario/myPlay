# ADR 0002 — Estratégia de indexação incremental

- **Status**: Aceito
- **Contexto**: Fase 2 (biblioteca, descoberta e indexação incremental)
- **Relacionado**: [`0001-backend-runtime.md`](0001-backend-runtime.md),
  [`../LIBRARY_INDEXING.md`](../LIBRARY_INDEXING.md),
  [`../FILE_IDENTITY.md`](../FILE_IDENTITY.md)

## Contexto

A Midoteca cataloga bibliotecas grandes em HDs externos, potencialmente
remontados em pontos diferentes, com arquivos renomeados/movidos e volumes
ocasionalmente offline. Reindexar tudo do zero a cada abertura é inviável
(custo de IO) e arriscado (perda de títulos manuais e progresso). Precisamos de
uma estratégia que seja **incremental**, **não destrutiva** e **observável**,
reaproveitando a fundação SQLite da Fase 1.

## Decisão

Adotamos **reconciliação incremental por _run token_** com as seguintes escolhas:

1. **Token de execução** (`runToken` = UUID) gravado em
   `media_files.last_seen_at`. Toda linha vista no run recebe o token; ao final,
   linhas com token diferente são marcadas `missing`. Detecção de ausência é um
   índice (`ix_media_files_last_seen`), não uma varredura de tabela.

2. **Identidade por UUID + caminho relativo**, nunca caminho absoluto. Casamento
   por `(source_id, relative_path)`; movimento detectado por `(size, mtime)`
   **somente com candidato único**.

3. **Não destrutivo**: ausência → `missing`; nenhum arquivo físico ou linha de
   catálogo é apagado por ausência.

4. **Organização pura** (`organize()`), separada do IO: pasta→curso/módulo/aula,
   PDFs→documentos, legendas→trilhas. Testável sem sistema de arquivos.

5. **Persistência síncrona em lote** via `IndexingStore` (better-sqlite3) dentro
   de uma transação por lote. Repositórios assíncronos não participam de
   transações de lote.

6. **Eventos após o commit** em um bus in-process tipado; nenhum transporte é
   assumido.

7. **Precedência de título** `manual > manifest > detected`, registrada em
   `title_source`. `manual` nunca é sobrescrito por rescan.

8. **Back-pressure cooperativo** (`ResourceGovernor`) para não competir com
   reprodução/IO.

## Alternativas consideradas

| Alternativa                                               | Motivo da rejeição                                           |
| --------------------------------------------------------- | ------------------------------------------------------------ |
| Reindexar do zero a cada abertura                         | IO proibitivo; perde títulos manuais                         |
| Usar caminho absoluto como chave                          | Quebra ao remontar/renomear/mover                            |
| Detectar ausência por varredura completa de `media_files` | O(n) desnecessário; sem noção de "visto neste run"           |
| `sha256` como identidade                                  | Duplicatas legítimas; hashing é caro (Fase 3)                |
| Assíncrono/`async` no lote                                | better-sqlite3 é síncrono; misturar async quebra a transação |
| Emitir eventos dentro da transação                        | Evento inconsistente se o commit falhar                      |
| Sobrescrever título sempre pelo detectado                 | Perde curadoria do usuário                                   |

## Consequências

**Positivas**

- Rescans são baratos: arquivos inalterados custam um `touch`.
- Catálogo resistente a remontagem, renomeação e movimento.
- Sem risco de perda de dados por ausência de volume.
- Núcleo puro e testável (organização sem IO); eventos desacoplados.
- UI responsiva via governor.

**Negativas / trade-offs**

- Movimento+modificação simultâneos não são reconhecidos (viram novo + missing);
  mitigável na Fase 3 com `sha256`.
- `IndexingStore` síncrono exige cuidado para não ser chamado fora de transação.
- `sort_order` é recalculado no rescan (reordenação manual fina fica para depois).

## Revisão futura

- Hashes opcionais para dedup e reconhecimento robusto de movimento (Fase 3).
- Suporte a `.midoteca/course.json` também no nível de módulo.
- Estratégias de paralelismo/IO limitado por device.
