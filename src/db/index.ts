import * as SQLite from 'expo-sqlite';
import {
  ALL_SCHEMAS,
  MIGRATE_EMPLOYEES_ADD_DEPARTMENT,
  MIGRATE_EMPLOYEES_ADD_START_DATE,
  MIGRATE_EMPLOYEES_ADD_ARCHIVE_DATE,
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

  // Migrations: add columns to employees for existing databases
  for (const migration of [
    MIGRATE_EMPLOYEES_ADD_DEPARTMENT,
    MIGRATE_EMPLOYEES_ADD_START_DATE,
    MIGRATE_EMPLOYEES_ADD_ARCHIVE_DATE,
  ]) {
    try {
      await db.execAsync(migration);
    } catch {
      // Column already exists — safe to ignore
    }
  }

  dbInstance = db;
  return dbInstance;
}

export function getDb(): SQLite.SQLiteDatabase {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return dbInstance;
}
