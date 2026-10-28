// Pure helpers behind the Day / Month / Year picker. The stored value stays an
// ISO calendar date (YYYY-MM-DD); these only split and join it.

export type DateParts = { year: number | null; month: number | null; day: number | null };

export const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

const isoDate = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Splits a stored YYYY-MM-DD into parts; anything else is empty. */
export function splitIsoDate(value: string | null | undefined): DateParts {
  const match = value ? isoDate.exec(value.trim()) : null;
  if (!match) return { year: null, month: null, day: null };
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

/** Days in a month (1-12); February counts leap years. Unknown year assumes a leap year. */
export function daysInMonth(year: number | null, month: number | null): number {
  if (!month) return 31;
  return new Date(Date.UTC(year ?? 2000, month, 0)).getUTCDate();
}

/** Keeps the day valid when the month or year changes (31 March -> February gives 28 or 29). */
export function clampDay(parts: DateParts): DateParts {
  if (parts.day === null) return parts;
  return { ...parts, day: Math.min(parts.day, daysInMonth(parts.year, parts.month)) };
}

/** The ISO date once all three parts are chosen, otherwise null. */
export function joinDateParts(parts: DateParts): string | null {
  if (parts.year === null || parts.month === null || parts.day === null) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

/** Birth years, newest first, from this year back 120 years. */
export function birthYears(today: Date = new Date()): number[] {
  const current = today.getFullYear();
  return Array.from({ length: 121 }, (_, index) => current - index);
}
