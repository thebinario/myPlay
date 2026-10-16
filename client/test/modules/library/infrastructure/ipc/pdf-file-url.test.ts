import { describe, expect, it } from 'vitest';
import type { DocumentSummary, MediaFile } from '@midoteca/core';
import { mapDocumentSummary } from '@/modules/library/infrastructure/ipc/map-catalog';

describe('PDF file URL from the library', () => {
  it('preserves reserved characters when projecting a real indexed PDF', () => {
    const summary: DocumentSummary = {
      id: 'doc-1',
      title: 'Guia #1?rev=2.pdf',
      mediaFileId: 'media-1',
      titleSource: 'detected',
      pageCount: 2,
    };
    const media: MediaFile = {
      id: 'media-1',
      sourceId: 'source-1',
      relativePath: 'PDFs/Guia #1?rev=2.pdf',
      mediaType: 'pdf',
      fileSize: 12,
      durationMs: null,
      modifiedAt: null,
      sha256: null,
      availability: 'available',
      lastSeenAt: null,
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z',
    };
    const document = mapDocumentSummary(
      summary,
      new Map([[media.id, media]]),
      new Map([['source-1', '/Volumes/Study']]),
    );

    expect(document.fileUrl).toBe(
      'file:///Volumes/Study/PDFs/Guia%20%231%3Frev%3D2.pdf',
    );
  });

  it('keeps Windows drive letters and normalizes path separators', () => {
    const summary: DocumentSummary = {
      id: 'doc-2',
      title: 'Guia final.pdf',
      mediaFileId: 'media-2',
      titleSource: 'detected',
      pageCount: 1,
    };
    const media = {
      id: 'media-2',
      sourceId: 'source-2',
      relativePath: 'PDFs\\Guia final.pdf',
      mediaType: 'pdf',
      fileSize: 12,
      durationMs: null,
      modifiedAt: null,
      sha256: null,
      availability: 'available',
      lastSeenAt: null,
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z',
    } satisfies MediaFile;
    const document = mapDocumentSummary(
      summary,
      new Map([[media.id, media]]),
      new Map([['source-2', 'C:\\Library']]),
    );

    expect(document.fileUrl).toBe('file:///C:/Library/PDFs/Guia%20final.pdf');
  });
});
