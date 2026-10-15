// Injectable pg-compatible Pool. No credentials, provisioning or schema execution here.
// Single bounded document deliberately serializes consent, revocation and event writes.
// Suitable only for a small invited cohort; benchmark and migrate to normalized tables
// before raising the 10,000-event cap. Blobs cannot provide this cross-record transaction.
export class PostgresStore {
  constructor(pool) { this.pool = pool; }
  async transaction(fn) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query('SELECT payload FROM investor_portal.state WHERE id = 1 FOR UPDATE');
      if (result.rows.length !== 1) throw new Error('Investor state is not initialized');
      const state = structuredClone(result.rows[0].payload);
      const value = await fn(state);
      await client.query('UPDATE investor_portal.state SET payload = $1::jsonb WHERE id = 1', [JSON.stringify(state)]);
      await client.query('COMMIT');
      return value;
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }
}
