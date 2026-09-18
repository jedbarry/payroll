import { create } from 'zustand';
import { PayrollRun, LineItem } from '../domain/types';
import {
  getPayrollRunsByEmployee,
  getPayrollRunById,
  insertPayrollRun,
  updatePayrollRun,
} from '../db/queries/payrollRuns';
import {
  getLineItemsByRun,
  insertLineItem,
  deleteLineItemsByRun,
} from '../db/queries/lineItems';
import { insertPayslip } from '../db/queries/payslips';

export interface PayrollStore {
  runs: PayrollRun[];
  lineItems: LineItem[];
  loading: boolean;
  loadRunsForEmployee: (employeeId: string) => Promise<void>;
  loadLineItemsForRun: (runId: string) => Promise<void>;
  saveDraft: (
    run: Omit<PayrollRun, 'id' | 'created_at'> & { id?: string },
    items: Omit<LineItem, 'id' | 'payroll_run_id'>[],
  ) => Promise<PayrollRun>;
  commitRun: (runId: string) => Promise<void>;
  deleteDraft: (runId: string) => Promise<void>;
}

export const usePayrollStore = create<PayrollStore>((set, get) => ({
  runs: [],
  lineItems: [],
  loading: false,

  loadRunsForEmployee: async (employeeId: string) => {
    set({ loading: true });
    try {
      const runs = await getPayrollRunsByEmployee(employeeId);
      set({ runs, loading: false });
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  loadLineItemsForRun: async (runId: string) => {
    set({ loading: true });
    try {
      const lineItems = await getLineItemsByRun(runId);
      set({ lineItems, loading: false });
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  saveDraft: async (run, items) => {
    set({ loading: true });
    try {
      let savedRun: PayrollRun;
      if (run.id) {
        // Update existing run
        const updated = await updatePayrollRun(run.id, {
          employee_id: run.employee_id,
          period_start: run.period_start,
          period_end: run.period_end,
          base_amount: run.base_amount,
          gross_pay: run.gross_pay,
          net_pay: run.net_pay,
          status: 'draft',
        });
        if (!updated) {
          throw new Error('Run not found');
        }
        savedRun = updated;
        // Replace line items
        await deleteLineItemsByRun(run.id);
      } else {
        // Insert new run
        savedRun = await insertPayrollRun({
          employee_id: run.employee_id,
          period_start: run.period_start,
          period_end: run.period_end,
          base_amount: run.base_amount,
          gross_pay: run.gross_pay,
          net_pay: run.net_pay,
          status: 'draft',
        });
      }

      // Insert line items
      const savedItems: LineItem[] = [];
      for (const item of items) {
        const createdItem = await insertLineItem({
          payroll_run_id: savedRun.id,
          type: item.type,
          label: item.label,
          amount: item.amount,
        });
        savedItems.push(createdItem);
      }

      await get().loadRunsForEmployee(savedRun.employee_id);
      set({ lineItems: savedItems, loading: false });
      return savedRun;
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  commitRun: async (runId: string) => {
    set({ loading: true });
    try {
      const existing = await getPayrollRunById(runId);
      if (!existing) {
        throw new Error('Run not found');
      }

      await updatePayrollRun(runId, {
        status: 'committed',
      });

      // Insert payslip record
      await insertPayslip({
        payroll_run_id: runId,
        employee_id: existing.employee_id,
      });

      await get().loadRunsForEmployee(existing.employee_id);
    } finally {
      set({ loading: false });
    }
  },

  deleteDraft: async (runId: string) => {
    set({ loading: true });
    try {
      const existing = await getPayrollRunById(runId);
      if (!existing) return;
      await deleteLineItemsByRun(runId);
      // Delete run from DB directly
      const { getDb } = await import('../db/index');
      const db = getDb();
      await db.runAsync('DELETE FROM payroll_runs WHERE id = ? AND status = "draft";', [runId]);
      await get().loadRunsForEmployee(existing.employee_id);
    } finally {
      set({ loading: false });
    }
  },
}));
