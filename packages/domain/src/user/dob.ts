/**
 * FITLIFE OS — Date of Birth & Dynamic Age Calculation Engine
 * Accurately parses DD/MM/YYYY, validates leap years, month day limits,
 * and dynamically calculates current age considering birthday boundaries.
 */

export interface DobValidationResult {
  isValid: boolean;
  ageYears?: number;
  isoDate?: string; // YYYY-MM-DD
  formattedDob?: string; // DD/MM/YYYY
  errorMessage?: string;
}

/**
 * Checks if a given year is a leap year in the Gregorian calendar.
 * Rule: Divisible by 4, but not by 100 unless also divisible by 400.
 */
export function isLeapYear(year: number): boolean {
  if (year % 4 !== 0) return false;
  if (year % 100 !== 0) return true;
  return year % 400 === 0;
}

/**
 * Returns the maximum days in a given month and year.
 */
export function getDaysInMonth(month: number, year: number): number {
  switch (month) {
    case 2:
      return isLeapYear(year) ? 29 : 28;
    case 4:
    case 6:
    case 9:
    case 11:
      return 30;
    default:
      return 31;
  }
}

/**
 * Parses a date string (supports DD/MM/YYYY, DD-MM-YYYY, or YYYY-MM-DD)
 * and returns validated age, ISO representation, and friendly error if invalid.
 */
export function parseAndValidateDob(
  input: string,
  referenceDate: Date = new Date()
): DobValidationResult {
  if (!input || typeof input !== 'string') {
    return { isValid: false, errorMessage: 'Date of birth is required.' };
  }

  const cleaned = input.trim();
  let day: number;
  let month: number;
  let year: number;

  // Pattern 1: DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = cleaned.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  // Pattern 2: YYYY-MM-DD (standard ISO from database)
  const ymdMatch = cleaned.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);

  if (dmyMatch) {
    day = parseInt(dmyMatch[1]!, 10);
    month = parseInt(dmyMatch[2]!, 10);
    year = parseInt(dmyMatch[3]!, 10);
  } else if (ymdMatch) {
    year = parseInt(ymdMatch[1]!, 10);
    month = parseInt(ymdMatch[2]!, 10);
    day = parseInt(ymdMatch[3]!, 10);
  } else {
    return {
      isValid: false,
      errorMessage: 'Please enter your date of birth in DD/MM/YYYY format.',
    };
  }

  // Validate Year
  const currentYear = referenceDate.getFullYear();
  if (year < 1900 || year > currentYear) {
    return {
      isValid: false,
      errorMessage: `Year must be between 1900 and ${currentYear}.`,
    };
  }

  // Validate Month
  if (month < 1 || month > 12) {
    return {
      isValid: false,
      errorMessage: 'Month must be between 1 and 12.',
    };
  }

  // Validate Day for the specific month/year
  const maxDays = getDaysInMonth(month, year);
  if (day < 1 || day > maxDays) {
    if (month === 2 && day === 29 && !isLeapYear(year)) {
      return {
        isValid: false,
        errorMessage: `${year} is not a leap year. February only has 28 days.`,
      };
    }
    return {
      isValid: false,
      errorMessage: `Invalid day. Month ${month} in ${year} only has ${maxDays} days.`,
    };
  }

  // Calculate age dynamically against reference date
  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth() + 1; // 1-indexed
  const refDay = referenceDate.getDate();

  let age = refYear - year;

  // Birthday check: has birthday occurred this year?
  const hasHadBirthdayThisYear =
    refMonth > month || (refMonth === month && refDay >= day);

  if (!hasHadBirthdayThisYear) {
    age -= 1;
  }

  // Age bounds verification (Physiological boundaries)
  if (age < 0) {
    return {
      isValid: false,
      errorMessage: 'Date of birth cannot be in the future.',
    };
  }

  if (age < 13) {
    return {
      isValid: false,
      ageYears: age,
      errorMessage: 'FITLIFE OS physiological models are calibrated for individuals aged 13 and above.',
    };
  }

  if (age > 120) {
    return {
      isValid: false,
      ageYears: age,
      errorMessage: 'Please verify the year of birth. Maximum supported age is 120.',
    };
  }

  const paddedDay = String(day).padStart(2, '0');
  const paddedMonth = String(month).padStart(2, '0');

  return {
    isValid: true,
    ageYears: age,
    isoDate: `${year}-${paddedMonth}-${paddedDay}`,
    formattedDob: `${paddedDay}/${paddedMonth}/${year}`,
  };
}
