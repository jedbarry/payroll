export function calculatePayroll(
  baseAmount: number,
  lineItems: Array<{ type: 'inclusion' | 'deduction'; subtype?: string | null; label?: string; amount: number }>,
): {
  grossPay: number;
  netPay: number;
  totalInclusions: number;
  totalDeductions: number;
  totalCashAdvances: number;
} {
  let totalInclusions = 0;
  let totalDeductions = 0;
  let totalCashAdvances = 0;

  for (const item of lineItems) {
    if (item.type === 'inclusion') {
      totalInclusions += item.amount;
    } else if (item.type === 'deduction') {
      const isCashAdvance =
        item.subtype === 'cash_advance' ||
        (item.label?.toLowerCase().includes('cash advance') ?? false);
      if (isCashAdvance) {
        totalCashAdvances += item.amount;
      } else {
        totalDeductions += item.amount;
      }
    }
  }

  // grossPay reflects earned pay (base + inclusions - regular deductions)
  // totalCashAdvances are recovered separately and don't reduce reported gross
  const grossPay = baseAmount + totalInclusions - totalDeductions;
  const netPay = grossPay - totalCashAdvances;

  return {
    grossPay,
    netPay,
    totalInclusions,
    totalDeductions,
    totalCashAdvances,
  };
}
