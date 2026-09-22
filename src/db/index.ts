import * as SQLite from 'expo-sqlite';
import {
  ALL_SCHEMAS,
  MIGRATE_EMPLOYEES_ADD_DEPARTMENT,
  MIGRATE_EMPLOYEES_ADD_START_DATE,
  MIGRATE_EMPLOYEES_ADD_ARCHIVE_DATE,
  MIGRATE_LINE_ITEMS_ADD_SUBTYPE,
  MIGRATE_BACKFILL_PAY_HISTORY,
  MIGRATE_PAYSLIPS_ADD_SIGNATURE,
  MIGRATE_PAYSLIPS_ADD_SIGNED_AT,
} from './schema';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function initDb(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  const db = await SQLite.openDatabaseAsync('payroll.db');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  for (const schema of ALL_SCHEMAS) {
    await db.execAsync(schema);
  }

  // Migrations: add columns for existing databases
  for (const migration of [
    MIGRATE_EMPLOYEES_ADD_DEPARTMENT,
    MIGRATE_EMPLOYEES_ADD_START_DATE,
    MIGRATE_EMPLOYEES_ADD_ARCHIVE_DATE,
    MIGRATE_LINE_ITEMS_ADD_SUBTYPE,
    MIGRATE_PAYSLIPS_ADD_SIGNATURE,
    MIGRATE_PAYSLIPS_ADD_SIGNED_AT,
  ]) {
    try {
      await db.execAsync(migration);
    } catch {
      // Column already exists — safe to ignore
    }
  }

  // Backfill pay_history for existing employees (idempotent — skips employees already with history)
  await db.execAsync(MIGRATE_BACKFILL_PAY_HISTORY);

  dbInstance = db;
  return dbInstance;
}

export function getDb(): SQLite.SQLiteDatabase {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return dbInstance;
}
