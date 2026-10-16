import type { IndexSummary } from '../../domain/types';
import type { RunScanInput } from '../dto';
import { RunScan, type RunScanDependencies } from '../use-cases/run-scan';

/** Backwards-compatible name for the scan use case dependencies. */
export type IndexerDependencies = RunScanDependencies;

/** Backwards-compatible name for the scan input. */
export type ScanRequest = RunScanInput;

/**
 * Facade over the indexing use cases, preserving the stable `Midoteca.indexer`
 * surface. The scan flow itself lives in `application/use-cases/run-scan.ts`,
 * which orchestrates `reconcile-batch`, `apply-organization` and `apply-tracks`.
 */
export class Indexer {
  private readonly runScanUseCase: RunScan;

  constructor(deps: IndexerDependencies) {
    this.runScanUseCase = new RunScan(deps);
  }

  runScan(request: ScanRequest): Promise<IndexSummary> {
    return this.runScanUseCase.execute(request);
  }
}
