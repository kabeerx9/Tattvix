import { cn } from "@tattvix/ui/lib/utils";
import { Check } from "lucide-react";

/**
 * A full-width tappable row for choosing among saved records (an ID, a
 * companion). The whole card is the control; a native radio/checkbox
 * underneath keeps keyboard and screen-reader semantics.
 */
export function ChoiceCard({
  type,
  name,
  checked,
  disabled,
  onCheckedChange,
  title,
  description,
  leading,
  trailing,
  children,
}: {
  type: "radio" | "checkbox";
  name: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
  title: string;
  description?: React.ReactNode;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card transition-colors duration-150",
        checked ? "border-foreground shadow-[inset_0_0_0_1px_var(--foreground)]" : "border-border",
      )}
    >
      <label
        className={cn(
          "flex min-h-16 cursor-pointer items-center gap-3 px-4 py-3 motion-safe:transition-transform motion-safe:duration-150 motion-safe:active:scale-[0.99]",
          disabled && "cursor-not-allowed",
        )}
      >
        {leading}
        <span className="min-w-0 flex-1">
          <span className={cn("block text-[15px] font-medium [overflow-wrap:anywhere]", disabled && "text-muted-foreground")}>
            {title}
          </span>
          {description ? (
            <span className="mt-0.5 block text-[13px] leading-5 text-muted-foreground [overflow-wrap:anywhere]">
              {description}
            </span>
          ) : null}
        </span>
        {trailing}
        <input
          type={type}
          name={name}
          checked={checked}
          disabled={disabled}
          onChange={(event) => onCheckedChange(event.target.checked)}
          className="peer sr-only"
        />
        <span
          aria-hidden
          className={cn(
            "grid size-6 shrink-0 place-items-center border transition-colors duration-150 peer-focus-visible:ring-2 peer-focus-visible:ring-ring/35",
            type === "radio" ? "rounded-full" : "rounded-md",
            checked ? "border-foreground bg-foreground text-background" : "border-input bg-card",
            disabled && "opacity-50",
          )}
        >
          {checked ? <Check className="size-3.5" strokeWidth={3} /> : null}
        </span>
      </label>
      {children ? <div className="border-t border-border-soft px-4 py-3">{children}</div> : null}
    </div>
  );
}
