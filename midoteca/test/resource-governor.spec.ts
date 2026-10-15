import { describe, expect, it } from 'vitest';
import { ResourceGovernor } from '../src/core/indexing/resource-governor';

describe('ResourceGovernor', () => {
  it('holds indexing while paused and resumes cleanly', async () => {
    const governor = new ResourceGovernor();
    governor.pause();

    let resumed = false;
    const wait = governor.waitWhilePaused().then(() => {
      resumed = true;
    });

    await Promise.resolve();
    expect(resumed).toBe(false);

    governor.resume();
    await wait;
    expect(resumed).toBe(true);
  });

  it('releases waiters on cancel', async () => {
    const governor = new ResourceGovernor();
    governor.pause();
    const wait = governor.waitWhilePaused();
    governor.cancel();
    await wait;
    expect(governor.isCancelled).toBe(true);
  });

  it('throttles only when a resource signal is present', async () => {
    const governor = new ResourceGovernor({ throttleMs: 1 });
    expect(governor.isThrottled).toBe(false);
    await governor.throttle();

    governor.updateSignals({ playbackActive: true });
    expect(governor.isThrottled).toBe(true);
    const start = Date.now();
    await governor.throttle();
    expect(Date.now() - start).toBeGreaterThanOrEqual(1);
  });

  it('reset clears pause/cancel state for a new run', () => {
    const governor = new ResourceGovernor();
    governor.pause();
    governor.cancel();
    governor.reset();
    expect(governor.isPaused).toBe(false);
    expect(governor.isCancelled).toBe(false);
  });
});
