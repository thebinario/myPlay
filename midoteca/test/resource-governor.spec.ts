import { describe, expect, it } from 'vitest';
import { ResourceGovernor } from '../src/modules/indexing/application/resource-governor';

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

  it('holds background work while any directory analysis runs', async () => {
    const governor = new ResourceGovernor();
    const first = governor.beginPriorityWork();
    const second = governor.beginPriorityWork();
    let released = false;
    const wait = governor.waitWhilePriorityWork().then(() => {
      released = true;
    });

    first();
    first(); // idempotent: releasing twice does not free the other analysis
    await Promise.resolve();
    expect(released).toBe(false);
    expect(governor.isPriorityWorkActive).toBe(true);

    second();
    await wait;
    expect(governor.isPriorityWorkActive).toBe(false);
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
