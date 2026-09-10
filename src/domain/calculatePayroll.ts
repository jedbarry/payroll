export function calculatePayroll(
  baseAmount: number,
  lineItems: Array<{ type: 'inclusion' | 'deduction'; amount: number }>,
): {
  grossPay: number;
  netPay: number;
  totalInclusions: number;
  totalDeductions: number;
} {
  let totalInclusions = 0;
  let totalDeductions = 0;

  for (const item of lineItems) {
    if (item.type === 'inclusion') {
      totalInclusions += item.amount;
    } else if (item.type === 'deduction') {
      totalDeductions += item.amount;
    }
  }

  const grossPay = baseAmount + totalInclusions;
  const netPay = grossPay - totalDeductions;

  return {
    grossPay,
    netPay,
    totalInclusions,
    totalDeductions,
  };
}
