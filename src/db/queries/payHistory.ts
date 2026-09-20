import { getDb } from '../index';
import { PayHistory } from '../../domain/types';
import { generateId } from '../utils';

interface PayHistoryRow {
  id: string;
  employee_id: string;
  monthly_rate: number;
  effective_from: string;
  effective_to: string | null;
}

function mapRow(row: PayHistoryRow): PayHistory {
  return {
    id: row.id,
    employee_id: row.employee_id,
    monthly_rate: row.monthly_rate,
    effective_from: row.effective_from,
    effective_to: row.effective_to ?? null,
  };
}

export async function insertPayHistory(
  item: Omit<PayHistory, 'id'> & { id?: string },
): Promise<PayHistory> {
  const db = getDb();
  const id = item.id ?? generateId();
  await db.runAsync(
    `INSERT INTO pay_history (id, employee_id, monthly_rate, effective_from, effective_to)
     VALUES (?, ?, ?, ?, ?);`,
    [id, item.employee_id, item.monthly_rate, item.effective_from, item.effective_to ?? null],
  );
  return { id, ...item, effective_to: item.effective_to ?? null };
}

export async function getPayHistoryByEmployee(employeeId: string): Promise<PayHistory[]> {
  const db = getDb();
  const rows = await db.getAllAsync<PayHistoryRow>(
    'SELECT * FROM pay_history WHERE employee_id = ? ORDER BY effective_from ASC;',
    [employeeId],
  );
  return rows.map(mapRow);
}

/**
 * Close the current open pay history row (effective_to = NULL) for an employee.
 * Called before inserting a new rate entry.
 */
export async function closeOpenPayHistory(
  employeeId: string,
  effectiveTo: string,
): Promise<void> {
  const db = getDb();
  await db.runAsync(
    `UPDATE pay_history SET effective_to = ? WHERE employee_id = ? AND effective_to IS NULL;`,
    [effectiveTo, employeeId],
  );
}

export async function updatePayHistory(
  id: string,
  updates: { monthly_rate?: number; effective_from?: string; effective_to?: string | null },
): Promise<void> {
  const db = getDb();
  const fields: string[] = [];
  const values: any[] = [];
  if (updates.monthly_rate !== undefined) { fields.push('monthly_rate = ?'); values.push(updates.monthly_rate); }
  if (updates.effective_from !== undefined) { fields.push('effective_from = ?'); values.push(updates.effective_from); }
  if ('effective_to' in updates) { fields.push('effective_to = ?'); values.push(updates.effective_to ?? null); }
  if (fields.length === 0) return;
  values.push(id);
  await db.runAsync(`UPDATE pay_history SET ${fields.join(', ')} WHERE id = ?;`, values);
}

export async function deletePayHistory(id: string): Promise<void> {
  const db = getDb();
  await db.runAsync('DELETE FROM pay_history WHERE id = ?;', [id]);
}

/**
 * Make a row "current": clear its effective_to, and close all other open rows for the same employee.
 */
export async function makePayHistoryCurrent(id: string, employeeId: string): Promise<void> {
  const db = getDb();
  // Close any other open row
  await db.runAsync(
    `UPDATE pay_history SET effective_to = (SELECT effective_from FROM pay_history WHERE id = ?) WHERE employee_id = ? AND effective_to IS NULL AND id != ?;`,
    [id, employeeId, id],
  );
  // Open this row
  await db.runAsync(`UPDATE pay_history SET effective_to = NULL WHERE id = ?;`, [id]);
}

/**
 * Return the monthly_rate in effect for a given period_start date.
 * Finds the row where effective_from <= periodStart AND (effective_to IS NULL OR effective_to >= periodStart).
 * Falls back to the earliest row if none strictly match (e.g. period predates history).
 */
export async function getRateForPeriod(
  employeeId: string,
  periodStart: string,
): Promise<number | null> {
  const db = getDb();

  // Best match: row that covers the period start
  const row = await db.getFirstAsync<{ monthly_rate: number }>(
    `SELECT monthly_rate FROM pay_history
     WHERE employee_id = ?
       AND effective_from <= ?
       AND (effective_to IS NULL OR effective_to >= ?)
     ORDER BY effective_from DESC
     LIMIT 1;`,
    [employeeId, periodStart, periodStart],
  );
  if (row) return row.monthly_rate;

  // Fallback: earliest row (period predates all history)
  const earliest = await db.getFirstAsync<{ monthly_rate: number }>(
    `SELECT monthly_rate FROM pay_history
     WHERE employee_id = ?
     ORDER BY effective_from ASC
     LIMIT 1;`,
    [employeeId],
  );
  return earliest?.monthly_rate ?? null;
}
