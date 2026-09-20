import { calculatePayroll } from '../calculatePayroll';

describe('calculatePayroll', () => {
  it('Base only: 2000 -> gross 2000, net 2000, inclusions 0, deductions 0, cashAdvances 0', () => {
    expect(calculatePayroll(2000, [])).toEqual({
      grossPay: 2000,
      netPay: 2000,
      totalInclusions: 0,
      totalDeductions: 0,
      totalCashAdvances: 0,
    });
  });

  it('With inclusion: 2000 + 200 -> gross 2200, net 2200, inclusions 200, deductions 0', () => {
    expect(calculatePayroll(2000, [{ type: 'inclusion', amount: 200 }])).toEqual({
      grossPay: 2200,
      netPay: 2200,
      totalInclusions: 200,
      totalDeductions: 0,
      totalCashAdvances: 0,
    });
  });

  it('With deduction: 2000 - 50 -> gross 1950, net 1950, inclusions 0, deductions 50', () => {
    expect(calculatePayroll(2000, [{ type: 'deduction', amount: 50 }])).toEqual({
      grossPay: 1950,
      netPay: 1950,
      totalInclusions: 0,
      totalDeductions: 50,
      totalCashAdvances: 0,
    });
  });

  it('Both inclusion and deduction: 2000 + 200 - 50 -> gross 2150, net 2150', () => {
    expect(
      calculatePayroll(2000, [
        { type: 'inclusion', amount: 200 },
        { type: 'deduction', amount: 50 },
      ]),
    ).toEqual({
      grossPay: 2150,
      netPay: 2150,
      totalInclusions: 200,
      totalDeductions: 50,
      totalCashAdvances: 0,
    });
  });

  it('Cash advance: 2000 base, 500 cash advance -> gross 2000, net 1500, cashAdvances 500, deductions 0', () => {
    expect(
      calculatePayroll(2000, [{ type: 'deduction', subtype: 'cash_advance', amount: 500 }]),
    ).toEqual({
      grossPay: 2000,
      netPay: 1500,
      totalInclusions: 0,
      totalDeductions: 0,
      totalCashAdvances: 500,
    });
  });

  it('Cash advance + deduction: 2000 base, 500 cash advance, 200 absent -> gross 1800, net 1300', () => {
    expect(
      calculatePayroll(2000, [
        { type: 'deduction', subtype: 'cash_advance', amount: 500 },
        { type: 'deduction', amount: 200 },
      ]),
    ).toEqual({
      grossPay: 1800,
      netPay: 1300,
      totalInclusions: 0,
      totalDeductions: 200,
      totalCashAdvances: 500,
    });
  });
});
