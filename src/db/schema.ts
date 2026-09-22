export const CREATE_DEPARTMENTS_TABLE = `
CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);
`;

export const CREATE_EMPLOYEES_TABLE = `
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  monthly_rate REAL NOT NULL,
  pay_schedule TEXT NOT NULL,
  pay_day_config TEXT,
  department_id TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  FOREIGN KEY(department_id) REFERENCES departments(id)
);
`;

export const MIGRATE_EMPLOYEES_ADD_DEPARTMENT = `
ALTER TABLE employees ADD COLUMN department_id TEXT REFERENCES departments(id);
`;

export const MIGRATE_EMPLOYEES_ADD_START_DATE = `
ALTER TABLE employees ADD COLUMN start_date TEXT;
`;

export const MIGRATE_EMPLOYEES_ADD_ARCHIVE_DATE = `
ALTER TABLE employees ADD COLUMN archive_date TEXT;
`;

export const CREATE_PAYROLL_RUNS_TABLE = `
CREATE TABLE IF NOT EXISTS payroll_runs (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  base_amount REAL NOT NULL,
  gross_pay REAL NOT NULL,
  net_pay REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL,
  FOREIGN KEY(employee_id) REFERENCES employees(id)
);
`;

export const CREATE_LINE_ITEMS_TABLE = `
CREATE TABLE IF NOT EXISTS line_items (
  id TEXT PRIMARY KEY,
  payroll_run_id TEXT NOT NULL,
  type TEXT NOT NULL,
  label TEXT NOT NULL,
  amount REAL NOT NULL,
  subtype TEXT,
  FOREIGN KEY(payroll_run_id) REFERENCES payroll_runs(id)
);
`;

export const MIGRATE_LINE_ITEMS_ADD_SUBTYPE = `
ALTER TABLE line_items ADD COLUMN subtype TEXT;
`;

export const CREATE_PAYSLIPS_TABLE = `
CREATE TABLE IF NOT EXISTS payslips (
  id TEXT PRIMARY KEY,
  payroll_run_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  FOREIGN KEY(payroll_run_id) REFERENCES payroll_runs(id),
  FOREIGN KEY(employee_id) REFERENCES employees(id)
);
`;

export const CREATE_PAY_HISTORY_TABLE = `
CREATE TABLE IF NOT EXISTS pay_history (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  monthly_rate REAL NOT NULL,
  effective_from TEXT NOT NULL,
  effective_to TEXT,
  FOREIGN KEY(employee_id) REFERENCES employees(id)
);
`;

/**
 * Backfill: for every employee that has no pay_history row yet,
 * insert one using start_date (or created_at date) as effective_from.
 * Uses a hex id derived from employee id so it's idempotent.
 */
export const MIGRATE_BACKFILL_PAY_HISTORY = `
INSERT INTO pay_history (id, employee_id, monthly_rate, effective_from, effective_to)
SELECT
  lower(hex(randomblob(8))) || '-' || lower(hex(randomblob(4))),
  e.id,
  e.monthly_rate,
  COALESCE(e.start_date, substr(e.created_at, 1, 10)),
  NULL
FROM employees e
WHERE NOT EXISTS (
  SELECT 1 FROM pay_history ph WHERE ph.employee_id = e.id
);
`;

export const MIGRATE_PAYSLIPS_ADD_SIGNATURE = `
ALTER TABLE payslips ADD COLUMN signature_data TEXT;
`;

export const MIGRATE_PAYSLIPS_ADD_SIGNED_AT = `
ALTER TABLE payslips ADD COLUMN signed_at TEXT;
`;

export const ALL_SCHEMAS = [
  CREATE_DEPARTMENTS_TABLE,
  CREATE_EMPLOYEES_TABLE,
  CREATE_PAYROLL_RUNS_TABLE,
  CREATE_LINE_ITEMS_TABLE,
  CREATE_PAYSLIPS_TABLE,
  CREATE_PAY_HISTORY_TABLE,
];
