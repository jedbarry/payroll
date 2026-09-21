import { create } from 'zustand';
import { Employee } from '../domain/types';
import {
  getEmployees,
  getEmployeeById,
  insertEmployee,
  updateEmployee as updateEmployeeQuery,
  archiveEmployee as archiveEmployeeQuery,
  deleteEmployee as deleteEmployeeQuery,
} from '../db/queries/employees';
import { closeOpenPayHistory, insertPayHistory } from '../db/queries/payHistory';

export interface EmployeeStore {
  employees: Employee[];
  allEmployees: Employee[];
  loading: boolean;
  loadEmployees: () => Promise<void>;
  addEmployee: (data: Omit<Employee, 'id' | 'created_at' | 'is_active'>) => Promise<Employee>;
  updateEmployee: (id: string, data: Partial<Omit<Employee, 'id' | 'created_at'>>) => Promise<void>;
  archiveEmployee: (id: string) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;
}

export const useEmployeeStore = create<EmployeeStore>((set, get) => ({
  employees: [],
  allEmployees: [],
  loading: false,

  loadEmployees: async () => {
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
      // If rate is changing, close the current history entry and open a new one
      if (data.monthly_rate !== undefined) {
        const existing = await getEmployeeById(id);
        if (existing && existing.monthly_rate !== data.monthly_rate) {
          const today = new Date().toISOString().substring(0, 10);
          await closeOpenPayHistory(id, today);
          await insertPayHistory({
            employee_id: id,
            monthly_rate: data.monthly_rate,
            effective_from: today,
            effective_to: null,
          });
        }
      }
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

  deleteEmployee: async (id) => {
    set({ loading: true });
    try {
      await deleteEmployeeQuery(id);
      await get().loadEmployees();
    } finally {
      set({ loading: false });
    }
  },
}));
