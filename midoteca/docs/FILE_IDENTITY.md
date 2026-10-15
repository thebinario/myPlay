# Identidade de arquivos — Midoteca

Como a Midoteca reconhece arquivos físicos entre execuções, mesmo quando o HD é
remontado, arquivos são renomeados ou movidos. Este documento consolida as
regras; a indexação incremental está em
[`LIBRARY_INDEXING.md`](LIBRARY_INDEXING.md).

## 1. Regra central

> A identidade primária é **UUIDv4** (coluna `TEXT PRIMARY KEY`).
> Caminhos **nunca** são chaves.

Caminhos entram apenas como _atributo de correlação_: `(source_id,
relative_path)` é `UNIQUE` em `media_files`, mas não é a identidade — é o índice
usado para casar descoberta ↔ linha existente.

## 2. Por que não usar o caminho como chave

| Problema                    | Se a chave fosse o caminho   |
| --------------------------- | ---------------------------- |
| HD remontado em outro ponto | todas as linhas "mudam"      |
| Arquivo renomeado           | linha órfã + duplicata       |
| Mover para outra pasta      | linha órfã + duplicata       |
| Símbolos/acentos no volume  | instabilidade entre sistemas |

Com UUID + caminho relativo, o catálogo sobrevive a tudo isso.

## 3. Níveis de identidade

1. **Fonte** — `library_sources.id` (UUID). Reconhecimento do _volume_ por
   `volume_id` (derivado de `stat.dev` + plataforma; `null` quando indisponível).
2. **Arquivo** — `media_files.id` (UUID), correlacionado por
   `(source_id, relative_path)`.
3. **Conteúdo** — `media_files.sha256` (índice **não** único). Serve para dedup e
   fingerprint; **não** é identidade (duplicatas legítimas existem).

## 4. Casamento na reconciliação

Ordem de tentativa, por arquivo descoberto:

1. **Caminho exato**: existe linha com `(source_id, relative_path)`?
   - Sim → comparar `size`/`modified_at` → `unchanged` ou `updated`.
2. **Movimento**: existe **exatamente um** candidato com mesmo `(file_size,
modified_at)` que **não** foi visto nesta execução?
   - Sim → `moved` (atualiza `relative_path`).
   - Não (zero ou ≥2) → tratar como **novo**.

### 4.1 Por que exigir candidato único

Dois arquivos diferentes podem compartilhar tamanho e mtime (cópias, arquivos
gerados em lote). Reassociar cegamente produziria vínculos errados. Exigir
unicidade torna o movimento **conservador**: prefere-se uma duplicata a um
falso-positivo que corrompe o catálogo.

### 4.2 Limitação conhecida

Se um arquivo for movido **e** modificado ao mesmo tempo (`size`/`mtime` mudam),
ele não é reconhecido como movimento e aparece como novo (a linha antiga vira
`missing`). É uma troca deliberada: prioriza-se a integridade sobre a
adivinhação. A Fase 3 pode refinar isso com `sha256`.

## 5. Ausência ≠ exclusão

Um arquivo não visto numa execução:

- `availability = 'missing'`;
- **a linha permanece** (progresso, vínculos e histórico intactos);
- se o arquivo reaparecer, o `touch` o marca `available` de novo.

Nada no pipeline de identidade apaga arquivos físicos ou linhas por ausência.

## 6. Verificação de comportamento

Cobertura em `test/indexer.spec.ts`:

- arquivo inalterado não é duplicado (`unchanged`, contagem estável);
- modificação detectada por `size`/`mtime` (`updated`);
- movimento por `(size, mtime)` único (`moved`, uma única linha, novo caminho);
- arquivo removido vira `missing` sem deleção;
- rescan **nunca** sobrescreve título `manual`.
