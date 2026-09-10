import { getDb } from '../index';
import { PayrollRun } from '../../domain/types';
import { generateId } from '../utils';

interface PayrollRunRow {
  id: string;
  employee_id: string;
  period_start: string;
  period_end: string;
  base_amount: number;
  gross_pay: number;
  net_pay: number;
  status: string;
  created_at: string;
}

function mapPayrollRunRow(row: PayrollRunRow): PayrollRun {
  return {
    id: row.id,
    employee_id: row.employee_id,
    period_start: row.period_start,
    period_end: row.period_end,
    base_amount: row.base_amount,
    gross_pay: row.gross_pay,
    net_pay: row.net_pay,
    status: row.status as 'draft' | 'committed',
    created_at: row.created_at,
  };
}

export async function insertPayrollRun(
  run: Omit<PayrollRun, 'id' | 'created_at'> & { id?: string; created_at?: string },
): Promise<PayrollRun> {
  const db = getDb();
  const id = run.id ?? generateId();
  const created_at = run.created_at ?? new Date().toISOString();

  await db.runAsync(
    `INSERT INTO payroll_runs (id, employee_id, period_start, period_end, base_amount, gross_pay, net_pay, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      id,
      run.employee_id,
      run.period_start,
      run.period_end,
      run.base_amount,
      run.gross_pay,
      run.net_pay,
      run.status,
      created_at,
    ],
  );

  return {
    id,
    employee_id: run.employee_id,
    period_start: run.period_start,
    period_end: run.period_end,
    base_amount: run.base_amount,
    gross_pay: run.gross_pay,
    net_pay: run.net_pay,
    status: run.status,
    created_at,
  };
}

export async function getPayrollRunsByEmployee(employeeId: string): Promise<PayrollRun[]> {
  const db = getDb();
  const rows = await db.getAllAsync<PayrollRunRow>(
    'SELECT * FROM payroll_runs WHERE employee_id = ? ORDER BY period_start DESC;',
    [employeeId],
  );
  return rows.map(mapPayrollRunRow);
}

export async function getPayrollRunById(id: string): Promise<PayrollRun | null> {
  const db = getDb();
  const row = await db.getFirstAsync<PayrollRunRow>('SELECT * FROM payroll_runs WHERE id = ?;', [
    id,
  ]);
  return row ? mapPayrollRunRow(row) : null;
}

export async function updatePayrollRun(
  id: string,
  updates: Partial<Omit<PayrollRun, 'id' | 'created_at'>>,
): Promise<PayrollRun | null> {
  const db = getDb();
  const existing = await getPayrollRunById(id);
  if (!existing) {
    return null;
  }

  const updated: PayrollRun = {
    ...existing,
    ...updates,
  };

  await db.runAsync(
    `UPDATE payroll_runs
     SET employee_id = ?, period_start = ?, period_end = ?, base_amount = ?, gross_pay = ?, net_pay = ?, status = ?
     WHERE id = ?;`,
    [
      updated.employee_id,
      updated.period_start,
      updated.period_end,
      updated.base_amount,
      updated.gross_pay,
      updated.net_pay,
      updated.status,
      id,
    ],
  );

  return updated;
}
