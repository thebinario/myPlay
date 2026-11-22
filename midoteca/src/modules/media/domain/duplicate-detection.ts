/**
 * Duplicate content groups. `exact`: same bytes (sha256). `perceptual`: at
 * least one member was matched by fingerprint (a re-encode). Groups are the
 * transitive closure of both relations.
 */
export type DuplicateKind = 'exact' | 'perceptual';

export interface HashedMedia {
  id: string;
  sha256: string | null;
}

export interface PerceptualLink {
  a: string;
  b: string;
  similarity: number;
}

export interface DuplicateGrouping {
  kind: DuplicateKind;
  mediaFileIds: string[];
}

class DisjointSet {
  private readonly parent = new Map<string, string>();

  find(id: string): string {
    const parent = this.parent.get(id) ?? id;
    if (parent === id) return id;
    const root = this.find(parent);
    this.parent.set(id, root);
    return root;
  }

  union(a: string, b: string): void {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA !== rootB)
      this.parent.set(rootB < rootA ? rootA : rootB, rootB < rootA ? rootB : rootA);
  }
}

export function groupDuplicates(
  media: readonly HashedMedia[],
  links: readonly PerceptualLink[],
): DuplicateGrouping[] {
  const sets = new DisjointSet();
  const byHash = new Map<string, string>();
  for (const item of media) {
    sets.find(item.id);
    if (!item.sha256) continue;
    const first = byHash.get(item.sha256);
    if (first) sets.union(first, item.id);
    else byHash.set(item.sha256, item.id);
  }
  const perceptualIds = new Set<string>();
  for (const link of links) {
    sets.union(link.a, link.b);
    perceptualIds.add(link.a);
    perceptualIds.add(link.b);
  }

  const groups = new Map<string, string[]>();
  for (const id of new Set([...media.map((item) => item.id), ...perceptualIds])) {
    const root = sets.find(id);
    groups.set(root, [...(groups.get(root) ?? []), id]);
  }

  return [...groups.values()]
    .filter((ids) => ids.length > 1)
    .map((ids) => ids.sort())
    .map((ids) => ({
      kind: ids.some((id) => perceptualIds.has(id)) ? ('perceptual' as const) : ('exact' as const),
      mediaFileIds: ids,
    }))
    .sort((x, y) => x.mediaFileIds[0].localeCompare(y.mediaFileIds[0]));
}
