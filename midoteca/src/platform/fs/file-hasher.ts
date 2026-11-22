import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { open } from 'node:fs/promises';
import type { FileHasher } from '../../modules/media/domain/analysis';

const EDGE_BYTES = 1024 * 1024;

/** Read-only hashing with bounded memory (streams, 1 MiB edges). */
export class NodeFileHasher implements FileHasher {
  async partialHash(absolutePath: string): Promise<string> {
    const handle = await open(absolutePath, 'r');
    try {
      const { size } = await handle.stat();
      const hash = createHash('sha256').update(`size:${size};`);
      const head = Buffer.alloc(Math.min(EDGE_BYTES, size));
      await handle.read(head, 0, head.length, 0);
      hash.update(head);
      if (size > EDGE_BYTES) {
        const tailLength = Math.min(EDGE_BYTES, size - EDGE_BYTES);
        const tail = Buffer.alloc(tailLength);
        await handle.read(tail, 0, tailLength, size - tailLength);
        hash.update(tail);
      }
      return hash.digest('hex');
    } finally {
      await handle.close();
    }
  }

  fullHash(absolutePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = createHash('sha256');
      createReadStream(absolutePath, { highWaterMark: EDGE_BYTES })
        .on('data', (chunk) => hash.update(chunk))
        .on('error', reject)
        .on('end', () => resolve(hash.digest('hex')));
    });
  }
}
