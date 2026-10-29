import { useRef, type ComponentRef } from "react";
import type { TextInput } from "react-native";

type Field = ComponentRef<typeof TextInput>;

/** The next mounted field after `index`, or -1 when `index` is the last one. */
export function nextFieldIndex(mounted: readonly unknown[], index: number) {
  for (let next = index + 1; next < mounted.length; next++) if (mounted[next]) return next;
  return -1;
}

// Return-key chaining for a form: "next" moves to the following field with the
// keyboard kept up. The form's last typed field passes an `end`: "submit" shows
// "done" and calls `onSubmit`; "dismiss" shows "done" and only closes the
// keyboard (a picker or photos still follow). Unrendered fields drop out.
export function useFocusChain(onSubmit?: () => void) {
  const fields = useRef<(Field | null)[]>([]);
  return (index: number, end?: "submit" | "dismiss") => ({
    ref: (field: Field | null) => {
      fields.current[index] = field;
    },
    returnKeyType: end ? ("done" as const) : ("next" as const),
    submitBehavior: end ? ("blurAndSubmit" as const) : ("submit" as const),
    onSubmitEditing: () => {
      if (end === "submit") return onSubmit?.();
      if (end) return;
      const next = nextFieldIndex(fields.current, index);
      if (next >= 0) fields.current[next]?.focus();
      else fields.current[index]?.blur();
    },
  });
}
