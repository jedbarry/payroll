import { create } from 'zustand';
import { Employee } from '../domain/types';
import {
  getEmployees,
  insertEmployee,
  updateEmployee as updateEmployeeQuery,
  archiveEmployee as archiveEmployeeQuery,
} from '../db/queries/employees';

export interface EmployeeStore {
  employees: Employee[];
  allEmployees: Employee[];
  loading: boolean;
  loadEmployees: (includeInactive?: boolean) => Promise<void>;
  addEmployee: (data: Omit<Employee, 'id' | 'created_at' | 'is_active'>) => Promise<Employee>;
  updateEmployee: (id: string, data: Partial<Omit<Employee, 'id' | 'created_at'>>) => Promise<void>;
  archiveEmployee: (id: string) => Promise<void>;
}

export const useEmployeeStore = create<EmployeeStore>((set, get) => ({
  employees: [],
  allEmployees: [],
  loading: false,

  loadEmployees: async (includeInactive = false) => {
    set({ loading: true });
    try {
      const activeList = await getEmployees(false);
      const allList = await getEmployees(true);
      set({ employees: activeList, allEmployees: allList, loading: false });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  addEmployee: async (data) => {
    set({ loading: true });
    try {
      const created = await insertEmployee({
        ...data,
        is_active: true,
      });
      await get().loadEmployees();
      return created;
    } finally {
      set({ loading: false });
    }
  },

  updateEmployee: async (id, data) => {
    set({ loading: true });
    try {
      await updateEmployeeQuery(id, data);
      await get().loadEmployees();
    } finally {
      set({ loading: false });
    }
  },

  archiveEmployee: async (id) => {
    set({ loading: true });
    try {
      await archiveEmployeeQuery(id);
      await get().loadEmployees();
    } finally {
      set({ loading: false });
    }
  },
}));
