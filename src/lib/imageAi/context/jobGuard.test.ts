import { describe, expect, it } from "vitest";

import { JobGuard } from "./workers/jobGuard";

describe("JobGuard", () => {
  it("starts idle", () => {
    const guard = new JobGuard();
    expect(guard.idle).toBe(true);
    expect(guard.currentJobId).toBeNull();
  });

  it("issues a unique id per job", () => {
    const guard = new JobGuard();
    expect(guard.start()).not.toBe(guard.start());
  });

  it("only recognises the current job", () => {
    const guard = new JobGuard();
    const first = guard.start();
    expect(guard.isCurrent(first)).toBe(true);
    const second = guard.start();
    expect(guard.isCurrent(first)).toBe(false);
    expect(guard.isCurrent(second)).toBe(true);
  });

  it("rejects a stale result after a new job starts", () => {
    // The scenario: a visitor loads a second image while the first analysis is
    // still running, and the first finishes afterwards.
    const guard = new JobGuard();
    const slowJob = guard.start();
    guard.start();
    expect(guard.isCurrent(slowJob)).toBe(false);
  });

  it("rejects a result that arrives after cancellation", () => {
    const guard = new JobGuard();
    const job = guard.start();
    guard.cancel(job);
    expect(guard.isCurrent(job)).toBe(false);
    expect(guard.idle).toBe(true);
  });

  it("ignores a late cancel aimed at a superseded job", () => {
    const guard = new JobGuard();
    const first = guard.start();
    const second = guard.start();
    guard.cancel(first);
    expect(guard.isCurrent(second)).toBe(true);
  });

  it("cancels whatever is current when given no id", () => {
    const guard = new JobGuard();
    guard.start();
    guard.cancel();
    expect(guard.idle).toBe(true);
  });

  it("never treats undefined or null as the current job", () => {
    const guard = new JobGuard();
    guard.start();
    expect(guard.isCurrent(undefined)).toBe(false);
    expect(guard.isCurrent(null)).toBe(false);
  });

  it("uses an injectable, monotonic id source", () => {
    const guard = new JobGuard({ createId: (n) => `analysis-${n}` });
    expect(guard.start()).toBe("analysis-1");
    expect(guard.start()).toBe("analysis-2");
  });
});
