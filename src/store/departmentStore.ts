import { create } from 'zustand';
import { Department } from '../domain/types';
import {
  getDepartments,
  upsertDepartmentByName,
  deleteDepartment as deleteDepartmentQuery,
} from '../db/queries/departments';

export interface DepartmentStore {
  departments: Department[];
  loadDepartments: () => Promise<void>;
  ensureDepartment: (name: string) => Promise<Department>;
  deleteDepartment: (id: string) => Promise<void>;
}

export const useDepartmentStore = create<DepartmentStore>((set) => ({
  departments: [],

  loadDepartments: async () => {
    const list = await getDepartments();
    set({ departments: list });
  },

  ensureDepartment: async (name: string) => {
    const dept = await upsertDepartmentByName(name);
    const list = await getDepartments();
    set({ departments: list });
    return dept;
  },

  deleteDepartment: async (id: string) => {
    await deleteDepartmentQuery(id);
    const list = await getDepartments();
    set({ departments: list });
  },
}));
