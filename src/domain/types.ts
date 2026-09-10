export type PaySchedule = 'monthly' | 'biweekly' | 'weekly';
export type PayDayConfig = '1st' | '15th' | 'last' | '1st_and_15th' | '15th_and_last';

export interface Employee {
  id: string;
  name: string;
  monthly_rate: number;
  pay_schedule: PaySchedule;
  pay_day_config: PayDayConfig | null;
  is_active: boolean;
  created_at: string;
}

export interface PayrollRun {
  id: string;
  employee_id: string;
  period_start: string;
  period_end: string;
  base_amount: number;
  gross_pay: number;
  net_pay: number;
  status: 'draft' | 'committed';
  created_at: string;
}

export interface LineItem {
  id: string;
  payroll_run_id: string;
  type: 'inclusion' | 'deduction';
  label: string;
  amount: number;
}

export interface Payslip {
  id: string;
  payroll_run_id: string;
  employee_id: string;
  generated_at: string;
}

export interface PayslipView extends Payslip {
  run: PayrollRun;
  employee: Employee;
  lineItems: LineItem[];
}
