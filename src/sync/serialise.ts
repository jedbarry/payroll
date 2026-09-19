import { getDb } from '../db/index';
import { insertDepartment } from '../db/queries/departments';
import { insertEmployee } from '../db/queries/employees';
import { insertPayrollRun } from '../db/queries/payrollRuns';
import { insertLineItem } from '../db/queries/lineItems';
import { insertPayslip } from '../db/queries/payslips';

export interface SnapshotTable {
  departments: any[];
  employees: any[];
  payroll_runs: any[];
  line_items: any[];
  payslips: any[];
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

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    tables: { departments, employees, payroll_runs, line_items, payslips },
  };
}

export async function restoreFromSnapshot(snapshot: Snapshot): Promise<void> {
  const db = getDb();

  // Delete in FK-safe order: children before parents
  await db.execAsync('DELETE FROM payslips;');
  await db.execAsync('DELETE FROM line_items;');
  await db.execAsync('DELETE FROM payroll_runs;');
  await db.execAsync('DELETE FROM employees;');
  await db.execAsync('DELETE FROM departments;');

  const { departments = [], employees, payroll_runs, line_items, payslips } = snapshot.tables;

  for (const row of departments) {
    await insertDepartment(row.name);
  }

  for (const row of employees) {
    await insertEmployee(row);
  }

  for (const row of payroll_runs) {
    await insertPayrollRun(row);
  }

  for (const row of line_items) {
    await insertLineItem(row);
  }

  for (const row of payslips) {
    await insertPayslip(row);
  }
}
