import { countWorkWeeksInMonth, getBaseAmount, getPayPeriods } from '../payPeriod';

describe('payPeriod domain logic', () => {
  describe('countWorkWeeksInMonth', () => {
    it('Jan 2026: Dec29-Jan2 has 3 days in Dec, 2 in Jan -> 4 weeks in Jan', () => {
      expect(countWorkWeeksInMonth(0, 2026)).toBe(4);
    });

    it('Feb 2026 -> 4 weeks', () => {
      expect(countWorkWeeksInMonth(1, 2026)).toBe(4);
    });

    it('Apr 2026 -> 5 weeks', () => {
      expect(countWorkWeeksInMonth(3, 2026)).toBe(5);
    });

    it('Jun 2026 -> 4 weeks', () => {
      expect(countWorkWeeksInMonth(5, 2026)).toBe(4);
    });

    it('Jul 2026 -> 5 weeks', () => {
      expect(countWorkWeeksInMonth(6, 2026)).toBe(5);
    });

    it('Sep 2026: Aug31-Sep4 has 4 days in Sep, Sep28-Oct2 has 3 days in Sep -> 5 weeks', () => {
      expect(countWorkWeeksInMonth(8, 2026)).toBe(5);
    });

    it('Oct 2026: Sep28-Oct2 goes to Sep, not Oct -> 4 weeks', () => {
      expect(countWorkWeeksInMonth(9, 2026)).toBe(4);
    });
  });

  describe('getBaseAmount', () => {
    it('weekly with 4 weeks in Jan 2026: 2800 / 4 = 700', () => {
      expect(getBaseAmount(2800, 'weekly', 0, 2026)).toBe(700);
    });

    it('weekly with 4 weeks in Feb 2026: 2800 / 4 = 700', () => {
      expect(getBaseAmount(2800, 'weekly', 1, 2026)).toBe(700);
    });

    it('weekly with 5 weeks in Sep 2026: 2800 / 5 = 560', () => {
      expect(getBaseAmount(2800, 'weekly', 8, 2026)).toBe(560);
    });

    it('biweekly: 4000 / 2 = 2000', () => {
      expect(getBaseAmount(4000, 'biweekly', 0, 2026)).toBe(2000);
    });

    it('monthly: full rate 6500', () => {
      expect(getBaseAmount(6500, 'monthly', 0, 2026)).toBe(6500);
    });
  });

  describe('getPayPeriods', () => {
    it('monthly returns 1 full month period', () => {
      const periods = getPayPeriods('monthly', null, 0, 2026);
      expect(periods).toEqual([{ start: '2026-01-01', end: '2026-01-31' }]);
    });

    it('biweekly returns two periods', () => {
      const periods = getPayPeriods('biweekly', '1st_and_15th', 0, 2026);
      expect(periods).toEqual([
        { start: '2026-01-01', end: '2026-01-14' },
        { start: '2026-01-15', end: '2026-01-31' },
      ]);
    });

    it('weekly returns all majority work weeks in month', () => {
      const periods = getPayPeriods('weekly', null, 0, 2026);
      expect(periods).toHaveLength(4);
      expect(periods[0]).toEqual({ start: '2026-01-05', end: '2026-01-09' });
      expect(periods[3]).toEqual({ start: '2026-01-26', end: '2026-01-30' });
    });
  });
});
