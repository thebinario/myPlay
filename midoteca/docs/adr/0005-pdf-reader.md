# ADR 0005 — Leitor de PDF no cliente + estado no backend

- **Status**: Aceito (parcialmente implementado)
- **Contexto**: Fase 4 (leitor de PDF)
- **Relacionado**: [`../PDF_READER.md`](../PDF_READER.md),
  [`../READING_PROGRESS.md`](../READING_PROGRESS.md),
  [`../DATABASE.md`](../DATABASE.md)

## Contexto

A Midoteca cataloga PDFs em HDs externos, que podem ser desconectados. Precisamos
ler esses arquivos localmente (sem upload, sem IA) e retomar a leitura de onde o
usuário parou — sem que o backend precise processar o conteúdo do PDF.

## Decisão

1. **Renderização no cliente com pdf.js** (`pdfjs-dist` + worker local) em
   `<canvas>`. O backend **não** renderiza nem extrai páginas; guarda apenas o
   estado de leitura.

2. **Estado de leitura por documento** (`reading_progress`): `page`,
   `scroll_ratio`, `zoom`, `theme`, `view_mode`, `completed_at`. Uma linha por
   documento (upsert). Campos `view_mode`/`completed_at` adicionados na migração
   0003.

3. **Acesso via portas**: `PageProvider` (páginas) e `ReadingStateRepository`
   (estado). Componentes visuais nunca falam direto com pdf.js/HTTP/IPC.

4. **Tolerância a indisponibilidade**: `isUnavailable` + `PdfUnavailableState` +
   `handleReconnect`, sem travar a navegação.

5. **HTTP Range (planejado)**: o adaptador real deve servir o arquivo com suporte
   a Range para evitar baixar o PDF inteiro; o `PageProvider` habilita o modo
   contínuo e busca interna.

## Alternativas consideradas

| Alternativa                                  | Motivo da rejeição                              |
| -------------------------------------------- | ----------------------------------------------- |
| Renderizar/extrair no backend                | Custo de IO/CPU; contraria local-first          |
| Guardar o PDF inteiro no banco               | Duplicaria arquivos; peso e sincronização       |
| Usar `<iframe>`/plugin do navegador          | Sem controle de zoom/cor/persistência           |
| Persistir apenas no localStorage             | Não sobrevive a troca de dispositivo/limpeza    |
| Estado de leitura por arquivo físico         | Quebra ao mover/renomear/remontar               |

## Consequências

**Positivas**

- Sem upload; funciona offline; privacidade preservada.
- Backend leve (só metadados de leitura) e testável.
- Estado ancorado no documento lógico, resiliente a mudanças de arquivo.
- UI fina; lógica isolada em `usePdfReader`.

**Negativas / trade-offs**

- Sem suporte a Range, PDFs grandes baixam inteiros (mitigável no adaptador).
- Modo contínuo/renderização progressiva ainda não implementado no client.
- Divergência de campos client↔backend (`colorMode`/`theme`,
  `relativeScrollPosition`/`scrollRatio`) exige mapeamento na integração.

## Revisão futura

- Adaptador HTTP/IPC real com Range e integração com `progress.saveReading`.
- `view_mode = continuous` com virtualização de páginas.
- Extração de texto para busca interna (FTS) — Fase 5+.
