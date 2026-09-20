import { getDb } from '../index';
import { Employee, PaySchedule, PayDayConfig } from '../../domain/types';
import { generateId } from '../utils';

interface EmployeeRow {
  id: string;
  name: string;
  monthly_rate: number;
  pay_schedule: string;
  pay_day_config: string | null;
  department_id: string | null;
  is_active: number;
  start_date: string | null;
  archive_date: string | null;
  created_at: string;
}

function mapEmployeeRow(row: EmployeeRow): Employee {
  return {
    id: row.id,
    name: row.name,
    monthly_rate: row.monthly_rate,
    pay_schedule: row.pay_schedule as PaySchedule,
    pay_day_config: row.pay_day_config as PayDayConfig | null,
    department_id: row.department_id ?? null,
    is_active: Boolean(row.is_active),
    start_date: row.start_date ?? null,
    archive_date: row.archive_date ?? null,
    created_at: row.created_at,
  };
}

export async function insertEmployee(
  employee: Omit<Employee, 'id' | 'created_at'> & { id?: string; created_at?: string },
): Promise<Employee> {
  const db = getDb();
  const id = employee.id ?? generateId();
  const created_at = employee.created_at ?? new Date().toISOString();
  const is_active = employee.is_active ? 1 : 0;

  await db.runAsync(
    `INSERT INTO employees (id, name, monthly_rate, pay_schedule, pay_day_config, department_id, is_active, start_date, archive_date, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      id,
      employee.name,
      employee.monthly_rate,
      employee.pay_schedule,
      employee.pay_day_config ?? null,
      employee.department_id ?? null,
      is_active,
      employee.start_date ?? null,
      employee.archive_date ?? null,
      created_at,
    ],
  );

  return {
    id,
    name: employee.name,
    monthly_rate: employee.monthly_rate,
    pay_schedule: employee.pay_schedule,
    pay_day_config: employee.pay_day_config ?? null,
    department_id: employee.department_id ?? null,
    is_active: employee.is_active,
    start_date: employee.start_date ?? null,
    archive_date: employee.archive_date ?? null,
    created_at,
  };
}

export async function getEmployees(includeInactive = false): Promise<Employee[]> {
  const db = getDb();
  let rows: EmployeeRow[];
  if (includeInactive) {
    rows = await db.getAllAsync<EmployeeRow>('SELECT * FROM employees ORDER BY name ASC;');
  } else {
    rows = await db.getAllAsync<EmployeeRow>(
      'SELECT * FROM employees WHERE is_active = 1 ORDER BY name ASC;',
    );
  }
  return rows.map(mapEmployeeRow);
}

export async function getEmployeeById(id: string): Promise<Employee | null> {
  const db = getDb();
  const row = await db.getFirstAsync<EmployeeRow>('SELECT * FROM employees WHERE id = ?;', [id]);
  return row ? mapEmployeeRow(row) : null;
}

export async function updateEmployee(
  id: string,
  updates: Partial<Omit<Employee, 'id' | 'created_at'>>,
): Promise<Employee | null> {
  const db = getDb();
  const existing = await getEmployeeById(id);
  if (!existing) {
    return null;
  }

  const updated: Employee = {
    ...existing,
    ...updates,
  };

  await db.runAsync(
    `UPDATE employees
     SET name = ?, monthly_rate = ?, pay_schedule = ?, pay_day_config = ?, department_id = ?, is_active = ?, start_date = ?, archive_date = ?
     WHERE id = ?;`,
    [
      updated.name,
      updated.monthly_rate,
      updated.pay_schedule,
      updated.pay_day_config ?? null,
      updated.department_id ?? null,
      updated.is_active ? 1 : 0,
      updated.start_date ?? null,
      updated.archive_date ?? null,
      id,
    ],
  );

  return updated;
}

export async function archiveEmployee(id: string): Promise<boolean> {
  const db = getDb();
  const result = await db.runAsync('UPDATE employees SET is_active = 0 WHERE id = ?;', [id]);
  return result.changes > 0;
}

export async function deleteEmployee(id: string): Promise<void> {
  const db = getDb();
  // Delete in FK-safe order: payslips → line_items → payroll_runs → employee
  await db.runAsync(
    `DELETE FROM payslips WHERE employee_id = ?;`,
    [id],
  );
  await db.runAsync(
    `DELETE FROM line_items WHERE payroll_run_id IN
       (SELECT id FROM payroll_runs WHERE employee_id = ?);`,
    [id],
  );
  await db.runAsync(
    `DELETE FROM payroll_runs WHERE employee_id = ?;`,
    [id],
  );
  await db.runAsync(`DELETE FROM employees WHERE id = ?;`, [id]);
}
