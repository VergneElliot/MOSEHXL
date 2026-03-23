import { pool } from '../../app';

/**
 * Live "monthly stats" for the closure dashboard.
 * Calculations are based on orders (ongoing month), while closure_count comes from closure_bulletins.
 */
export class MonthlyLiveStatsRepository {
  static async getOrdersTotalsForPeriod(params: {
    establishmentId: string;
    start: Date;
    end: Date;
  }): Promise<{
    total_transactions: number;
    total_amount: number;
    total_vat: number;
    tips_total: number;
    change_total: number;
  }> {
    const { establishmentId, start, end } = params;

    const result = await pool.query(
      `
      SELECT total_amount, total_tax, tips, change
      FROM orders
      WHERE created_at >= $1
        AND created_at <= $2
        AND status IN ('completed', 'paid')
        AND establishment_id = $3
      `,
      [start, end, establishmentId]
    );

    const rows = result.rows as Array<{
      total_amount: string | number | null;
      total_tax: string | number | null;
      tips: string | number | null;
      change: string | number | null;
    }>;

    let total_amount = 0;
    let total_vat = 0;
    let tips_total = 0;
    let change_total = 0;

    for (const row of rows) {
      const a = parseFloat(String(row.total_amount ?? 0));
      if (Number.isFinite(a)) total_amount += a;

      const v = parseFloat(String(row.total_tax ?? 0));
      if (Number.isFinite(v)) total_vat += v;

      const t = parseFloat(String(row.tips ?? 0));
      if (Number.isFinite(t)) tips_total += Math.max(0, t);

      const c = parseFloat(String(row.change ?? 0));
      if (Number.isFinite(c)) change_total += Math.max(0, c);
    }

    return {
      total_transactions: rows.length,
      total_amount,
      total_vat,
      tips_total,
      change_total,
    };
  }

  static async countDailyClosuresForPeriod(params: {
    establishmentId: string;
    start: Date;
    end: Date;
  }): Promise<{ closure_count: number }> {
    const { establishmentId, start, end } = params;

    const result = await pool.query(
      `
      SELECT COUNT(*)::int AS closure_count
      FROM closure_bulletins
      WHERE closure_type = 'DAILY'
        AND period_start >= $1
        AND period_start <= $2
        AND establishment_id = $3
      `,
      [start, end, establishmentId]
    );

    const closure_count = result.rows[0]?.closure_count ?? 0;
    return { closure_count };
  }
}

