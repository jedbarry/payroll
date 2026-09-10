import * as SQLite from 'expo-sqlite';
import { ALL_SCHEMAS } from './schema';

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

  dbInstance = db;
  return dbInstance;
}

export function getDb(): SQLite.SQLiteDatabase {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return dbInstance;
}
