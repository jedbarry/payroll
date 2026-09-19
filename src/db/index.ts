import * as SQLite from 'expo-sqlite';
import { ALL_SCHEMAS, MIGRATE_EMPLOYEES_ADD_DEPARTMENT } from './schema';

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

  // Migration: add department_id to employees for existing databases
  try {
    await db.execAsync(MIGRATE_EMPLOYEES_ADD_DEPARTMENT);
  } catch {
    // Column already exists — safe to ignore
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
