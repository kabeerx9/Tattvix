"use client";

import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";

import { cn } from "@tattvix/ui/lib/utils";

/**
 * A short single-choice list rendered as pills (a radio group underneath, so
 * arrow keys move the choice and screen readers announce "radio, 1 of 3").
 * Use it for two to five options whose labels fit on a phone; use Select for
 * longer lists.
 */
function SegmentedControl<Value extends string>({
  value,
  onValueChange,
  options,
  className,
  ...props
}: Omit<RadioGroup.Props<Value>, "value" | "onValueChange" | "children"> & {
  value: Value | null;
  onValueChange: (value: Value) => void;
  options: readonly { value: Value; label: string; disabled?: boolean }[];
}) {
  return (
    <RadioGroup<Value>
      data-slot="segmented-control"
      // An empty string matches no option, so nothing shows as chosen.
      value={value ?? ("" as Value)}
      onValueChange={(next) => onValueChange(next)}
      className={cn("flex flex-wrap gap-2", className)}
      {...props}
    >
      {options.map((option) => (
        <Radio.Root
          key={option.value}
          value={option.value}
          disabled={option.disabled}
          data-slot="segmented-control-item"
          className={cn(
            "inline-flex h-9 cursor-pointer items-center rounded-full border border-border bg-card px-3.5 text-sm font-medium text-muted-foreground transition-[color,background-color,border-color,scale] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] outline-none select-none pointer-coarse:h-11 pointer-coarse:px-4",
            "focus-visible:ring-2 focus-visible:ring-ring/35",
            "data-checked:border-primary data-checked:bg-primary-tint data-checked:text-primary",
            "data-disabled:cursor-not-allowed data-disabled:opacity-50",
            "motion-safe:active:scale-[0.97]",
            "aria-invalid:border-destructive",
          )}
        >
          {option.label}
        </Radio.Root>
      ))}
    </RadioGroup>
  );
}

export { SegmentedControl };
