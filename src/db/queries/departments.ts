import { getDb } from '../index';
import { Department } from '../../domain/types';
import { generateId } from '../utils';

export async function getDepartments(): Promise<Department[]> {
  const db = getDb();
  return db.getAllAsync<Department>('SELECT * FROM departments ORDER BY name ASC;');
}

export async function getDepartmentById(id: string): Promise<Department | null> {
  const db = getDb();
  return db.getFirstAsync<Department>('SELECT * FROM departments WHERE id = ?;', [id]);
}

export async function insertDepartment(name: string): Promise<Department> {
  const db = getDb();
  const id = generateId();
  await db.runAsync('INSERT INTO departments (id, name) VALUES (?, ?);', [id, name]);
  return { id, name };
}

export async function upsertDepartmentByName(name: string): Promise<Department> {
  const db = getDb();
  const trimmed = name.trim();
  const existing = await db.getFirstAsync<Department>(
    'SELECT * FROM departments WHERE name = ? COLLATE NOCASE;',
    [trimmed],
  );
  if (existing) return existing;
  return insertDepartment(trimmed);
}

export async function deleteDepartment(id: string): Promise<boolean> {
  const db = getDb();
  const result = await db.runAsync('DELETE FROM departments WHERE id = ?;', [id]);
  return result.changes > 0;
}
