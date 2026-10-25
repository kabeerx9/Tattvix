// Presets for the Reports range. The phone has no date pickers: the owner picks
// one of these, and every report query takes the inclusive local-date range it
// resolves to. `today` is injected so the maths is deterministic in tests.
import { localDayKey } from "@tattvix/api";

export const reportPresets = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "last7", label: "Last 7 days" },
  { key: "thisMonth", label: "This month" },
  { key: "last30", label: "Last 30 days" },
] as const;

export type ReportPreset = (typeof reportPresets)[number]["key"];

export type ReportRange = { dateFrom: string; dateTo: string };

/** The local calendar day `days` before `today` (negative values go forward). */
function shiftDays(today: Date, days: number): Date {
  return new Date(today.getFullYear(), today.getMonth(), today.getDate() - days);
}

/** Inclusive local-date range for a preset. `last7` and `last30` include today. */
export function reportRangeFor(preset: ReportPreset, today: Date): ReportRange {
  const todayKey = localDayKey(today);
  switch (preset) {
    case "today":
      return { dateFrom: todayKey, dateTo: todayKey };
    case "yesterday": {
      const yesterday = localDayKey(shiftDays(today, 1));
      return { dateFrom: yesterday, dateTo: yesterday };
    }
    case "last7":
      return { dateFrom: localDayKey(shiftDays(today, 6)), dateTo: todayKey };
    case "last30":
      return { dateFrom: localDayKey(shiftDays(today, 29)), dateTo: todayKey };
    case "thisMonth":
      return { dateFrom: localDayKey(new Date(today.getFullYear(), today.getMonth(), 1)), dateTo: todayKey };
  }
}
