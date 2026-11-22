import { readFile } from 'node:fs/promises';
import type { DocumentTextExtractor } from '../domain/ports';

interface TextItem {
  str?: string;
  hasEOL?: boolean;
}

interface PdfJsModule {
  getDocument(params: {
    data: Uint8Array;
    useSystemFonts?: boolean;
    isEvalSupported?: boolean;
    disableFontFace?: boolean;
    verbosity?: number;
  }): {
    promise: Promise<{
      numPages: number;
      getPage(n: number): Promise<{
        getTextContent(): Promise<{ items: TextItem[] }>;
        cleanup(): void;
      }>;
    }>;
    destroy(): Promise<void>;
  };
}

// pdf.js ships ESM only. The core compiles to CommonJS and runs on Node >= 22
// (and Electron's Node), where `require()` of a synchronous ES module is
// supported natively; it is loaded lazily, only when a PDF is indexed.
let pdfjs: PdfJsModule | null = null;

function loadPdfJs(): PdfJsModule {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  pdfjs ??= require('pdfjs-dist/legacy/build/pdf.mjs') as PdfJsModule;
  return pdfjs;
}

/** Extracts the text of every page with pdf.js (Node legacy build). Read-only. */
export class PdfJsTextExtractor implements DocumentTextExtractor {
  async extractPages(absolutePath: string): Promise<string[]> {
    const lib = loadPdfJs();
    const data = new Uint8Array(await readFile(absolutePath));
    const task = lib.getDocument({
      data,
      useSystemFonts: false,
      isEvalSupported: false,
      disableFontFace: true,
      verbosity: 0,
    });
    try {
      const document = await task.promise;
      const pages: string[] = [];
      for (let number = 1; number <= document.numPages; number++) {
        const page = await document.getPage(number);
        const content = await page.getTextContent();
        pages.push(
          content.items.map((item) => `${item.str ?? ''}${item.hasEOL ? '\n' : ' '}`).join(''),
        );
        page.cleanup();
      }
      return pages;
    } finally {
      await task.destroy();
    }
  }
}
