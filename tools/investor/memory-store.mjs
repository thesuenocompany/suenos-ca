// TEST / LOOPBACK DEVELOPMENT ONLY. No production import may reference this file.
export const emptyState = () => ({ members: {}, consents: {}, sessions: {}, events: [], activeClocks: {} });
export class MemoryStore {
  constructor(initial = emptyState()) { this.state = structuredClone(initial); this.queue = Promise.resolve(); }
  transaction(fn) {
    const run = this.queue.then(async () => { const next = structuredClone(this.state); const value = await fn(next); this.state = next; return structuredClone(value); });
    this.queue = run.catch(() => {}); return run;
  }
}
