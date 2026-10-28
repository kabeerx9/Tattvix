// Country and date-of-birth fields for the travel profile and check-in.
// Both store the same values the free-text fields did: an ISO country code
// and a YYYY-MM-DD date.
import { countries, countryName, searchCountries } from "@tattvix/api";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, space, type } from "@/src/design-system";

import { birthYears, clampDay, daysInMonth, joinDateParts, monthNames, splitIsoDate, type DateParts } from "./date-parts";
import { PickerSheet, PickerTrigger, type PickerOption } from "./PickerField";

const countryOptions: readonly PickerOption[] = countries.map((country) => ({ value: country.code, label: country.name }));
const searchCountryOptions = (query: string): readonly PickerOption[] =>
  searchCountries(query).map((country) => ({ value: country.code, label: country.name }));

/** Searchable country list in a sheet. `value` is a two-letter code or "". */
export function CountryField({
  label,
  value,
  error,
  helper,
  onChange,
}: {
  label: string;
  value: string;
  error?: string;
  helper?: string;
  onChange: (code: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const code = value.trim().toUpperCase();
  return (
    <>
      <PickerTrigger
        label={label}
        valueLabel={code ? countryName(code) : undefined}
        placeholder="Choose a country"
        helper={helper}
        error={error}
        onPress={() => setOpen(true)}
      />
      <PickerSheet
        open={open}
        onClose={() => setOpen(false)}
        title={label}
        options={countryOptions}
        selected={code || null}
        onSelect={onChange}
        search={searchCountryOptions}
      />
    </>
  );
}

type Part = "day" | "month" | "year";

/**
 * Day / Month / Year pickers. Reports a YYYY-MM-DD date once all three are
 * chosen and null while any is missing; the partial choice stays on screen.
 */
export function DateOfBirthField({
  label,
  value,
  error,
  onChange,
}: {
  label: string;
  value: string | null;
  error?: string;
  onChange: (value: string | null) => void;
}) {
  const [parts, setParts] = useState<DateParts>(() => splitIsoDate(value));
  const [open, setOpen] = useState<Part | null>(null);

  // A new full date from outside (the form reseeding after save) replaces the parts.
  useEffect(() => {
    if (value && value !== joinDateParts(parts)) setParts(splitIsoDate(value));
    // Only follow the stored value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const years = useMemo(() => birthYears().map((year) => ({ value: String(year), label: String(year) })), []);
  const months = useMemo(() => monthNames.map((name, index) => ({ value: String(index + 1), label: name })), []);
  const days = useMemo(
    () => Array.from({ length: daysInMonth(parts.year, parts.month) }, (_, index) => ({ value: String(index + 1), label: String(index + 1) })),
    [parts.year, parts.month],
  );

  const update = (part: Part, raw: string) => {
    const next = clampDay({ ...parts, [part]: Number(raw) });
    setParts(next);
    onChange(joinDateParts(next));
  };

  const partial = joinDateParts(parts) === null && (parts.day !== null || parts.month !== null || parts.year !== null);
  const message = error ?? (partial ? "Choose day, month and year." : undefined);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <View style={styles.day}>
          <PickerTrigger placeholder="Day" valueLabel={parts.day ? String(parts.day) : undefined} invalid={!!error} onPress={() => setOpen("day")} />
        </View>
        <View style={styles.month}>
          <PickerTrigger placeholder="Month" valueLabel={parts.month ? monthNames[parts.month - 1] : undefined} invalid={!!error} onPress={() => setOpen("month")} />
        </View>
        <View style={styles.year}>
          <PickerTrigger placeholder="Year" valueLabel={parts.year ? String(parts.year) : undefined} invalid={!!error} onPress={() => setOpen("year")} />
        </View>
      </View>
      {message ? <Text style={[styles.message, { color: error ? colors.destructive : colors.mutedForeground }]}>{message}</Text> : null}

      <PickerSheet open={open === "day"} onClose={() => setOpen(null)} title="Day" options={days} selected={parts.day ? String(parts.day) : null} onSelect={(next) => update("day", next)} />
      <PickerSheet open={open === "month"} onClose={() => setOpen(null)} title="Month" options={months} selected={parts.month ? String(parts.month) : null} onSelect={(next) => update("month", next)} />
      <PickerSheet open={open === "year"} onClose={() => setOpen(null)} title="Year" options={years} selected={parts.year ? String(parts.year) : null} onSelect={(next) => update("year", next)} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { ...type.label, color: colors.subtleForeground },
  row: { flexDirection: "row", gap: space.sm },
  day: { flex: 0.8 },
  month: { flex: 1.5 },
  year: { flex: 1 },
  message: { ...type.caption },
});
