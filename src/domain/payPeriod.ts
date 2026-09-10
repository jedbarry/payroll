import { PaySchedule, PayDayConfig } from './types';

function formatDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Enumerate all Mon-Fri work weeks that overlap with month (0-based) of year.
 * A week belongs to this month if >= 3 of its 5 weekdays fall in this month (majority rule).
 * Returns array of { start: ISO date, end: ISO date } representing Monday to Friday.
 */
function getWorkWeeksForMonth(
  month: number,
  year: number,
): Array<{ start: string; end: string }> {
  // First day of target month (in UTC)
  const firstDayOfMonth = new Date(Date.UTC(year, month, 1));
  const dayOfWeek = firstDayOfMonth.getUTCDay(); // 0 = Sun, 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat
  // Monday of the week that contains the 1st of the month:
  // If 1st is Sun(0) -> -6
  // If 1st is Mon(1) -> 0
  // If 1st is Tue(2) -> -1
  // If 1st is Wed(3) -> -2
  // If 1st is Thu(4) -> -3
  // If 1st is Fri(5) -> -4
  // If 1st is Sat(6) -> -5
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  let currentMonday = new Date(Date.UTC(year, month, 1 + diffToMonday));

  const weeks: Array<{ start: string; end: string }> = [];

  while (true) {
    const friday = new Date(Date.UTC(
      currentMonday.getUTCFullYear(),
      currentMonday.getUTCMonth(),
      currentMonday.getUTCDate() + 4,
    ));

    let daysInTargetMonth = 0;
    for (let i = 0; i < 5; i++) {
      const d = new Date(Date.UTC(
        currentMonday.getUTCFullYear(),
        currentMonday.getUTCMonth(),
        currentMonday.getUTCDate() + i,
      ));
      if (d.getUTCFullYear() === year && d.getUTCMonth() === month) {
        daysInTargetMonth++;
      }
    }

    if (daysInTargetMonth >= 3) {
      weeks.push({
        start: formatDate(currentMonday),
        end: formatDate(friday),
      });
    }

    // Advance to next Monday
    const nextMonday = new Date(Date.UTC(
      currentMonday.getUTCFullYear(),
      currentMonday.getUTCMonth(),
      currentMonday.getUTCDate() + 7,
    ));

    const afterTargetMonth =
      currentMonday.getUTCFullYear() > year ||
      (currentMonday.getUTCFullYear() === year && currentMonday.getUTCMonth() > month);

    if (afterTargetMonth && daysInTargetMonth === 0) {
      break;
    }

    currentMonday = nextMonday;
  }

  return weeks;
}

export function countWorkWeeksInMonth(month: number, year: number): number {
  return getWorkWeeksForMonth(month, year).length;
}

export function getPayPeriods(
  schedule: PaySchedule,
  payDayConfig: PayDayConfig | null,
  month: number,
  year: number,
): Array<{ start: string; end: string }> {
  const lastDayNumber = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const firstDayStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const fourteenthDayStr = `${year}-${String(month + 1).padStart(2, '0')}-14`;
  const fifteenthDayStr = `${year}-${String(month + 1).padStart(2, '0')}-15`;
  const lastDayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDayNumber).padStart(2, '0')}`;

  switch (schedule) {
    case 'monthly':
      return [{ start: firstDayStr, end: lastDayStr }];

    case 'biweekly':
      return [
        { start: firstDayStr, end: fourteenthDayStr },
        { start: fifteenthDayStr, end: lastDayStr },
      ];

    case 'weekly':
      return getWorkWeeksForMonth(month, year);

    default:
      return [{ start: firstDayStr, end: lastDayStr }];
  }
}

export function getBaseAmount(
  monthlyRate: number,
  schedule: PaySchedule,
  month: number,
  year: number,
): number {
  switch (schedule) {
    case 'monthly':
      return monthlyRate;
    case 'biweekly':
      return monthlyRate / 2;
    case 'weekly': {
      const weeks = countWorkWeeksInMonth(month, year);
      return weeks > 0 ? monthlyRate / weeks : 0;
    }
    default:
      return monthlyRate;
  }
}
