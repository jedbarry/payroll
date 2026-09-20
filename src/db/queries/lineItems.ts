import { getDb } from '../index';
import { LineItem } from '../../domain/types';
import { generateId } from '../utils';

interface LineItemRow {
  id: string;
  payroll_run_id: string;
  type: string;
  label: string;
  amount: number;
}

function mapLineItemRow(row: LineItemRow): LineItem {
  return {
    id: row.id,
    payroll_run_id: row.payroll_run_id,
    type: row.type as 'inclusion' | 'deduction',
    label: row.label,
    amount: row.amount,
  };
}

export async function insertLineItem(
  item: Omit<LineItem, 'id'> & { id?: string },
): Promise<LineItem> {
  const db = getDb();
  const id = item.id ?? generateId();

  await db.runAsync(
    `INSERT INTO line_items (id, payroll_run_id, type, label, amount)
     VALUES (?, ?, ?, ?, ?);`,
    [id, item.payroll_run_id, item.type, item.label, item.amount],
  );

  return {
    id,
    payroll_run_id: item.payroll_run_id,
    type: item.type,
    label: item.label,
    amount: item.amount,
  };
}

export async function getLineItemsByRun(payrollRunId: string): Promise<LineItem[]> {
  const db = getDb();
  const rows = await db.getAllAsync<LineItemRow>(
    'SELECT * FROM line_items WHERE payroll_run_id = ?;',
    [payrollRunId],
  );
  return rows.map(mapLineItemRow);
}

export async function deleteLineItemsByRun(payrollRunId: string): Promise<number> {
  const db = getDb();
  const result = await db.runAsync('DELETE FROM line_items WHERE payroll_run_id = ?;', [
    payrollRunId,
  ]);
  return result.changes;
}

export async function getDistinctLineItemLabels(): Promise<string[]> {
  const db = getDb();
  const rows = await db.getAllAsync<{ label: string }>(
    'SELECT DISTINCT label FROM line_items ORDER BY label COLLATE NOCASE;',
  );
  return rows.map((r) => r.label);
}
