import { pool } from '../../app';

export async function resetJournalDevOnly(establishmentId: string): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw Object.assign(new Error('Journal reset not allowed in production'), { statusCode: 403 });
  }

  // Bypass the immutability trigger only for this single transaction so we
  // can still delete by tenant scope. SET LOCAL session_replication_role is
  // transaction-scoped and auto-restored on COMMIT/ROLLBACK. The production
  // guard above keeps this path unreachable outside dev/test environments.
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL session_replication_role = 'replica'");
    await client.query('DELETE FROM legal_journal WHERE establishment_id = $1', [
      establishmentId,
    ]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
