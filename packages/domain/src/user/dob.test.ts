import { parseAndValidateDob, isLeapYear, getDaysInMonth } from './dob';

describe('FITLIFE OS — Date of Birth & Dynamic Age Engine', () => {
  const fixedRefDate = new Date('2026-11-04T12:00:00Z'); // Fixed Nov 4, 2026

  describe('Leap Year & Month Day Validation', () => {
    it('accurately identifies Gregorian leap years', () => {
      expect(isLeapYear(2000)).toBe(true); // 400 year rule
      expect(isLeapYear(2004)).toBe(true);
      expect(isLeapYear(2024)).toBe(true);
      expect(isLeapYear(1900)).toBe(false); // Century rule
      expect(isLeapYear(2025)).toBe(false);
      expect(isLeapYear(2026)).toBe(false);
    });

    it('returns exact days in month for leap and non-leap Februaries', () => {
      expect(getDaysInMonth(2, 2024)).toBe(29);
      expect(getDaysInMonth(2, 2025)).toBe(28);
      expect(getDaysInMonth(4, 2026)).toBe(30); // April
      expect(getDaysInMonth(7, 2026)).toBe(31); // July
    });
  });

  describe('parseAndValidateDob Dynamic Age Calculation', () => {
    it('calculates age correctly when birthday has already occurred in current year', () => {
      // Born 15/05/2000, Ref: 04/11/2026 -> Birthday in May already passed -> 26 years
      const res = parseAndValidateDob('15/05/2000', fixedRefDate);
      expect(res.isValid).toBe(true);
      expect(res.ageYears).toBe(26);
      expect(res.isoDate).toBe('2000-05-15');
      expect(res.formattedDob).toBe('15/05/2000');
    });

    it('calculates age correctly when birthday is TODAY', () => {
      // Born 04/11/1998, Ref: 04/11/2026 -> Birthday is TODAY -> 28 years
      const res = parseAndValidateDob('04/11/1998', fixedRefDate);
      expect(res.isValid).toBe(true);
      expect(res.ageYears).toBe(28);
    });

    it('calculates age correctly when birthday has NOT yet occurred in current year', () => {
      // Born 25/12/1998, Ref: 04/11/2026 -> Birthday in Dec has not passed -> 27 years
      const res = parseAndValidateDob('25/12/1998', fixedRefDate);
      expect(res.isValid).toBe(true);
      expect(res.ageYears).toBe(27);
    });

    it('handles leap day (29/02) correctly for someone born on a leap day', () => {
      // Born 29/02/2000 (leap year), Ref: 04/11/2026 -> Birthday has passed -> 26 years
      const res = parseAndValidateDob('29/02/2000', fixedRefDate);
      expect(res.isValid).toBe(true);
      expect(res.ageYears).toBe(26);
    });

    it('rejects Feb 29 on non-leap years', () => {
      const res = parseAndValidateDob('29/02/2001', fixedRefDate);
      expect(res.isValid).toBe(false);
      expect(res.errorMessage).toContain('not a leap year');
    });

    it('rejects invalid calendar days (e.g. 31st of April)', () => {
      const res = parseAndValidateDob('31/04/1995', fixedRefDate);
      expect(res.isValid).toBe(false);
      expect(res.errorMessage).toContain('only has 30 days');
    });

    it('rejects underage individuals (<13 years old) for physiological safety', () => {
      // Born 01/01/2020, Ref: 2026 -> 6 years old
      const res = parseAndValidateDob('01/01/2020', fixedRefDate);
      expect(res.isValid).toBe(false);
      expect(res.errorMessage).toContain('aged 13 and above');
    });

    it('rejects future dates', () => {
      const res = parseAndValidateDob('01/01/2030', fixedRefDate);
      expect(res.isValid).toBe(false);
      expect(res.errorMessage).toBeDefined();
    });

    it('accepts ISO format YYYY-MM-DD from database and formats to DD/MM/YYYY', () => {
      const res = parseAndValidateDob('1995-08-20', fixedRefDate);
      expect(res.isValid).toBe(true);
      expect(res.ageYears).toBe(31);
      expect(res.formattedDob).toBe('20/08/1995');
      expect(res.isoDate).toBe('1995-08-20');
    });
  });
});
