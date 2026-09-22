import { getDb } from '../db/index';

export interface SnapshotTable {
  departments: any[];
  employees: any[];
  payroll_runs: any[];
  line_items: any[];
  payslips: any[];
  pay_history: any[];
}

export interface Snapshot {
  version: 1;
  exportedAt: string;
  tables: SnapshotTable;
}

export async function dumpToSnapshot(): Promise<Snapshot> {
  const db = getDb();

  const departments = await db.getAllAsync('SELECT * FROM departments');
  const employees = await db.getAllAsync('SELECT * FROM employees');
  const payroll_runs = await db.getAllAsync('SELECT * FROM payroll_runs');
  const line_items = await db.getAllAsync('SELECT * FROM line_items');
  const payslips = await db.getAllAsync('SELECT * FROM payslips');
  const pay_history = await db.getAllAsync('SELECT * FROM pay_history');

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    tables: { departments, employees, payroll_runs, line_items, payslips, pay_history },
  };
}

export async function restoreFromSnapshot(snapshot: Snapshot): Promise<void> {
  const db = getDb();

  const { departments = [], employees = [], payroll_runs = [], line_items = [], payslips = [], pay_history = [] } = snapshot.tables;

  await db.withExclusiveTransactionAsync(async (tx) => {
    // Delete in FK-safe order: children before parents
    await tx.execAsync('DELETE FROM payslips;');
    await tx.execAsync('DELETE FROM pay_history;');
    await tx.execAsync('DELETE FROM line_items;');
    await tx.execAsync('DELETE FROM payroll_runs;');
    await tx.execAsync('DELETE FROM employees;');
    await tx.execAsync('DELETE FROM departments;');

    for (const row of departments) {
      await tx.runAsync(
        'INSERT INTO departments (id, name) VALUES (?, ?);',
        [row.id, row.name],
      );
    }

    for (const row of employees) {
      await tx.runAsync(
        `INSERT INTO employees
           (id, name, monthly_rate, pay_schedule, pay_day_config, department_id, is_active, start_date, archive_date, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [row.id, row.name, row.monthly_rate, row.pay_schedule, row.pay_day_config ?? null,
         row.department_id ?? null, row.is_active, row.start_date ?? null, row.archive_date ?? null, row.created_at],
      );
    }

    for (const row of payroll_runs) {
      await tx.runAsync(
        `INSERT INTO payroll_runs
           (id, employee_id, period_start, period_end, base_amount, gross_pay, net_pay, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [row.id, row.employee_id, row.period_start, row.period_end,
         row.base_amount, row.gross_pay, row.net_pay, row.status, row.created_at],
      );
    }

    for (const row of line_items) {
      await tx.runAsync(
        `INSERT INTO line_items (id, payroll_run_id, type, label, amount, subtype)
         VALUES (?, ?, ?, ?, ?, ?);`,
        [row.id, row.payroll_run_id, row.type, row.label, row.amount, row.subtype ?? null],
      );
    }

    for (const row of payslips) {
      await tx.runAsync(
        `INSERT INTO payslips (id, payroll_run_id, employee_id, generated_at, signature_data, signed_at)
         VALUES (?, ?, ?, ?, ?, ?);`,
        [row.id, row.payroll_run_id, row.employee_id, row.generated_at, row.signature_data ?? null, row.signed_at ?? null],
      );
    }

    for (const row of pay_history) {
      await tx.runAsync(
        `INSERT INTO pay_history (id, employee_id, monthly_rate, effective_from, effective_to)
         VALUES (?, ?, ?, ?, ?);`,
        [row.id, row.employee_id, row.monthly_rate, row.effective_from, row.effective_to ?? null],
      );
    }
  });
}
