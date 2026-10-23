import { format, parseISO, differenceInDays, isSameDay, getYear, setYear, isLeapYear } from 'date-fns';

export const TIMEZONE = 'Asia/Tashkent';

export const UZ_MONTHS = [
  'yanvar',
  'fevral',
  'mart',
  'aprel',
  'may',
  'iyun',
  'iyul',
  'avgust',
  'sentabr',
  'oktabr',
  'noyabr',
  'dekabr',
];

export const UZ_WEEKDAYS = [
  'Yakshanba',
  'Dushanba',
  'Seshanba',
  'Chorshanba',
  'Payshanba',
  'Juma',
  'Shanba',
];

/**
 * Format date in Uzbek: "23-oktabr, 2024"
 */
export function formatUzbekDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '';
  const d = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '';
  const day = d.getDate();
  const month = UZ_MONTHS[d.getMonth()];
  const year = d.getFullYear();
  return `${day}-${month}, ${year}`;
}

/**
 * Format day and month: "23-oktabr"
 */
export function formatUzbekDayMonth(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '';
  const d = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '';
  const day = d.getDate();
  const month = UZ_MONTHS[d.getMonth()];
  return `${day}-${month}`;
}

/**
 * Get weekday name in Uzbek: "Juma"
 */
export function getUzbekWeekday(dateInput: string | Date = new Date()): string {
  const d = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
  return UZ_WEEKDAYS[d.getDay()];
}

/**
 * Calculate next occurrence for an event date (handling repeat_yearly and Feb 29 leap years)
 */
export function calculateNextOccurrence(eventDateStr: string, repeatYearly: boolean = true): {
  nextDate: Date;
  daysUntil: number;
  isToday: boolean;
  yearsPassed: number;
} {
  const originalDate = parseISO(eventDateStr);
  const now = new Date();
  const currentYear = now.getFullYear();

  if (!repeatYearly) {
    const daysUntil = differenceInDays(originalDate, now);
    const isToday = isSameDay(originalDate, now);
    const yearsPassed = currentYear - originalDate.getFullYear();
    return {
      nextDate: originalDate,
      daysUntil,
      isToday,
      yearsPassed: Math.max(0, yearsPassed),
    };
  }

  const origMonth = originalDate.getMonth();
  const origDay = originalDate.getDate();

  // Handle Feb 29 for leap years
  let targetYear = currentYear;
  let targetDate = createSafeDate(targetYear, origMonth, origDay);

  // If this year's date has already passed today
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());

  if (targetStart.getTime() < todayStart.getTime()) {
    targetYear += 1;
    targetDate = createSafeDate(targetYear, origMonth, origDay);
  }

  const isToday = isSameDay(targetDate, now);
  const daysUntil = differenceInDays(targetDate, todayStart);
  const yearsPassed = targetYear - originalDate.getFullYear();

  return {
    nextDate: targetDate,
    daysUntil: Math.max(0, daysUntil),
    isToday,
    yearsPassed: Math.max(0, yearsPassed),
  };
}

/**
 * Create date safely handling Feb 29 in non-leap years (shifts to Feb 28 or March 1)
 */
function createSafeDate(year: number, month: number, day: number): Date {
  if (month === 1 && day === 29) {
    // February 29
    if (!isLeapYear(new Date(year, 0, 1))) {
      // In non-leap year, default to Feb 28
      return new Date(year, 1, 28);
    }
  }
  return new Date(year, month, day);
}

/**
 * Check if a date occurred "On this day" in previous years
 */
export function isTodayAnniversary(dateStr: string): boolean {
  try {
    const d = parseISO(dateStr);
    const now = new Date();
    // Same month and day, but in a strictly earlier year
    return (
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate() &&
      d.getFullYear() < now.getFullYear()
    );
  } catch {
    return false;
  }
}

/**
 * Calculate remaining time for countdown (e.g. for future letters)
 */
export function formatTimeRemaining(unlockAtIso: string): {
  isUnlocked: boolean;
  text: string;
  days: number;
  hours: number;
  minutes: number;
} {
  const target = new Date(unlockAtIso).getTime();
  const now = Date.now();
  const diff = target - now;

  if (diff <= 0) {
    return {
      isUnlocked: true,
      text: "Ochilish vaqti yetib keldi!",
      days: 0,
      hours: 0,
      minutes: 0,
    };
  }

  const totalMinutes = Math.floor(diff / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  let text = '';
  if (days > 0) text += `${days} kun `;
  if (hours > 0 || days > 0) text += `${hours} soat `;
  text += `${minutes} daqiqa qoldi`;

  return {
    isUnlocked: false,
    text,
    days,
    hours,
    minutes,
  };
}
