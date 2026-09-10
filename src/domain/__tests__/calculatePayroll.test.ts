import { calculatePayroll } from '../calculatePayroll';

describe('calculatePayroll', () => {
  it('Base only: 2000 -> gross 2000, net 2000, inclusions 0, deductions 0', () => {
    expect(calculatePayroll(2000, [])).toEqual({
      grossPay: 2000,
      netPay: 2000,
      totalInclusions: 0,
      totalDeductions: 0,
    });
  });

  it('With inclusion: 2000 + 200 -> gross 2200, net 2200, inclusions 200, deductions 0', () => {
    expect(calculatePayroll(2000, [{ type: 'inclusion', amount: 200 }])).toEqual({
      grossPay: 2200,
      netPay: 2200,
      totalInclusions: 200,
      totalDeductions: 0,
    });
  });

  it('With deduction: 2000 - 50 -> gross 2000, net 1950, inclusions 0, deductions 50', () => {
    expect(calculatePayroll(2000, [{ type: 'deduction', amount: 50 }])).toEqual({
      grossPay: 2000,
      netPay: 1950,
      totalInclusions: 0,
      totalDeductions: 50,
    });
  });

  it('Both inclusion and deduction: 2000 + 200 - 50 -> gross 2200, net 2150, inclusions 200, deductions 50', () => {
    expect(
      calculatePayroll(2000, [
        { type: 'inclusion', amount: 200 },
        { type: 'deduction', amount: 50 },
      ]),
    ).toEqual({
      grossPay: 2200,
      netPay: 2150,
      totalInclusions: 200,
      totalDeductions: 50,
    });
  });
});
