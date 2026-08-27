/**
 * Stale-job protection.
 *
 * The failure this prevents: a visitor starts an analysis, changes their mind,
 * loads a second image, and the first analysis finishes afterwards and paints
 * its result over the second one. The result is not wrong, it is just about a
 * different image — which is worse than an error, because nothing looks broken.
 *
 * The rule is simple and enforced in one place: only the current job may
 * update anything. Starting a job invalidates the previous one, cancelling
 * invalidates the current one, and every inbound message is checked against
 * `isCurrent` before it is allowed to touch state.
 *
 * Pure and synchronous, so the behaviour is unit tested rather than assumed.
 */

export interface JobGuardOptions {
  /** Injectable id source. The default is monotonic, not random. */
  createId?: (sequence: number) => string;
}

export class JobGuard {
  private sequence = 0;

  private current: string | null = null;

  private readonly createId: (sequence: number) => string;

  constructor(options: JobGuardOptions = {}) {
    this.createId = options.createId ?? ((n) => `job-${n}`);
  }

  /** Begin a new job, invalidating any job already running. */
  start(): string {
    this.sequence += 1;
    this.current = this.createId(this.sequence);
    return this.current;
  }

  /** The job allowed to update state, or null when nothing is running. */
  get currentJobId(): string | null {
    return this.current;
  }

  /** True only for the job that is currently allowed to update state. */
  isCurrent(jobId: string | undefined | null): boolean {
    return jobId !== undefined && jobId !== null && jobId === this.current;
  }

  /**
   * Cancel the current job, or a specific one. Cancelling a job that is
   * already superseded is a no-op, so a late cancel cannot kill a newer run.
   */
  cancel(jobId?: string): void {
    if (jobId === undefined || jobId === this.current) this.current = null;
  }

  /** True when no job is active. */
  get idle(): boolean {
    return this.current === null;
  }
}
