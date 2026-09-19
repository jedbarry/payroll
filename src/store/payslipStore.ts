import { create } from 'zustand';
import { PayslipView } from '../domain/types';
import { getPayslipsByYear, getPayslipYears } from '../db/queries/payslips';
import { getPayrollRunById } from '../db/queries/payrollRuns';
import { getEmployeeById } from '../db/queries/employees';
import { getLineItemsByRun } from '../db/queries/lineItems';

export interface PayslipStore {
  payslips: PayslipView[];
  loading: boolean;
  availableYears: number[];
  selectedYear: number;
  loadAvailableYears: () => Promise<void>;
  loadPayslipsForYear: (year: number) => Promise<void>;
  setSelectedYear: (year: number) => void;
}

export const usePayslipStore = create<PayslipStore>((set, get) => ({
  payslips: [],
  loading: false,
  availableYears: [],
  selectedYear: new Date().getFullYear(),

  loadAvailableYears: async () => {
    const currentYear = new Date().getFullYear();
    const years = await getPayslipYears();
    // Always include current year even if no payslips yet
    const merged = years.includes(currentYear) ? years : [currentYear, ...years];
    set({ availableYears: merged });
  },

  setSelectedYear: (year: number) => {
    set({ selectedYear: year });
    get().loadPayslipsForYear(year);
  },

  loadPayslipsForYear: async (year: number) => {
    set({ loading: true });
    try {
      const basePayslips = await getPayslipsByYear(year);
      const views: PayslipView[] = [];

      for (const p of basePayslips) {
        const [run, employee, lineItems] = await Promise.all([
          getPayrollRunById(p.payroll_run_id),
          getEmployeeById(p.employee_id),
          getLineItemsByRun(p.payroll_run_id),
        ]);

        if (run && employee) {
          views.push({
            ...p,
            run,
            employee,
            lineItems,
          });
        }
      }

      set({ payslips: views, loading: false });
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },
}));
