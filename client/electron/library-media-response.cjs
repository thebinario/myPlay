// @ts-check
const { createReadStream } = require('node:fs');
const { stat } = require('node:fs/promises');
const { Readable } = require('node:stream');
const path = require('node:path');

const CONTENT_TYPES = {
  '.mkv': 'video/x-matroska',
  '.mov': 'video/quicktime',
  '.mp4': 'video/mp4',
  '.pdf': 'application/pdf',
  '.srt': 'text/plain; charset=utf-8',
  '.vtt': 'text/vtt; charset=utf-8',
  '.webm': 'video/webm',
};

function parseByteRange(header, size) {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || size === 0) return false;

  const suffixLength = match[1] ? null : Number(match[2]);
  const start = suffixLength === null ? Number(match[1]) : Math.max(0, size - suffixLength);
  const end = suffixLength === null ? Number(match[2] || size - 1) : size - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= size || end < start) {
    return false;
  }
  return { start, end: Math.min(end, size - 1) };
}

async function createLibraryMediaResponse(filePath, request) {
  const file = await stat(filePath);
  const range = parseByteRange(request.headers.get('range'), file.size);
  const headers = new Headers({
    'Accept-Ranges': 'bytes',
    'Content-Type':
      CONTENT_TYPES[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream',
  });

  if (range === false) {
    headers.set('Content-Range', `bytes */${file.size}`);
    return new Response(null, { status: 416, headers });
  }
  if (request.method === 'HEAD') {
    headers.set('Content-Length', String(file.size));
    return new Response(null, { status: 200, headers });
  }

  const start = range?.start ?? 0;
  const end = range?.end ?? file.size - 1;
  headers.set('Content-Length', String(file.size === 0 ? 0 : end - start + 1));
  if (range) headers.set('Content-Range', `bytes ${start}-${end}/${file.size}`);
  const body = file.size === 0 ? null : Readable.toWeb(createReadStream(filePath, { start, end }));
  return new Response(body, { status: range ? 206 : 200, headers });
}

module.exports = { createLibraryMediaResponse };
