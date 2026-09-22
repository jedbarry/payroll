import { getDb } from '../index';
import { Payslip } from '../../domain/types';
import { generateId } from '../utils';

interface PayslipRow {
  id: string;
  payroll_run_id: string;
  employee_id: string;
  generated_at: string;
  signature_data: string | null;
  signed_at: string | null;
}

function mapPayslipRow(row: PayslipRow): Payslip {
  return {
    id: row.id,
    payroll_run_id: row.payroll_run_id,
    employee_id: row.employee_id,
    generated_at: row.generated_at,
    signature_data: row.signature_data ?? null,
    signed_at: row.signed_at ?? null,
  };
}

export async function insertPayslip(
  payslip: Omit<Payslip, 'id' | 'generated_at' | 'signature_data' | 'signed_at'> & { id?: string; generated_at?: string },
): Promise<Payslip> {
  const db = getDb();
  const id = payslip.id ?? generateId();
  const generated_at = payslip.generated_at ?? new Date().toISOString();

  await db.runAsync(
    `INSERT INTO payslips (id, payroll_run_id, employee_id, generated_at)
     VALUES (?, ?, ?, ?);`,
    [id, payslip.payroll_run_id, payslip.employee_id, generated_at],
  );

  return {
    id,
    payroll_run_id: payslip.payroll_run_id,
    employee_id: payslip.employee_id,
    generated_at,
    signature_data: null,
    signed_at: null,
  };
}

export async function getPayslipsByYear(year: number): Promise<Payslip[]> {
  const db = getDb();
  const yearPattern = `${year}-%`;
  const rows = await db.getAllAsync<PayslipRow>(
    `SELECT p.* FROM payslips p
     JOIN payroll_runs r ON r.id = p.payroll_run_id
     WHERE r.period_start LIKE ?
     ORDER BY r.period_start DESC;`,
    [yearPattern],
  );
  return rows.map(mapPayslipRow);
}

export async function getPayslipYears(): Promise<number[]> {
  const db = getDb();
  const rows = await db.getAllAsync<{ year: number }>(
    `SELECT DISTINCT CAST(substr(r.period_start, 1, 4) AS INTEGER) AS year
     FROM payslips p
     JOIN payroll_runs r ON r.id = p.payroll_run_id
     ORDER BY year DESC;`,
  );
  return rows.map((r) => r.year);
}

export async function getPayslipById(id: string): Promise<Payslip | null> {
  const db = getDb();
  const row = await db.getFirstAsync<PayslipRow>('SELECT * FROM payslips WHERE id = ?;', [id]);
  return row ? mapPayslipRow(row) : null;
}

export async function savePayslipSignature(id: string, signatureData: string): Promise<void> {
  const db = getDb();
  const signed_at = new Date().toISOString();
  await db.runAsync(
    'UPDATE payslips SET signature_data = ?, signed_at = ? WHERE id = ?;',
    [signatureData, signed_at, id],
  );
}

export async function deletePayslip(id: string): Promise<void> {
  const db = getDb();
  await db.runAsync('DELETE FROM payslips WHERE id = ?;', [id]);
}
