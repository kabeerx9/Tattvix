// The one place the Tattwix logo lives in the React app. Every shell, the
// auth pages and the check-in screens render it from here.
//
// The mark is "Threshold": an open, offset doorway. It is drawn in
// currentColor so `tone` recolours it. The other copies, which cannot import
// React, are listed in docs/design-system.md "Brand":
//   - apps/web/public/favicon.svg (browser tab) and apple-touch-icon.png
//   - apps/web/index.html, the boot splash (painted before the bundle)
import { cn } from "@tattvix/ui/lib/utils";

const sizes = {
  sm: { text: "text-[15px]", mark: "size-[18px]", gap: "gap-1.5" },
  md: { text: "text-[19px]", mark: "size-[22px]", gap: "gap-2" },
  lg: { text: "text-[26px]", mark: "size-[30px]", gap: "gap-2.5" },
} as const;

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12 56V8h40v20H40V20H24v36Z" />
      <path d="M40 36h12v20H40Z" />
    </svg>
  );
}

export function BrandLogo({
  size = "md",
  tone = "default",
  className,
}: {
  size?: keyof typeof sizes;
  /** `inverse` for use over a photo scrim. */
  tone?: "default" | "inverse";
  className?: string;
}) {
  const s = sizes[size];
  return (
    <span
      className={cn(
        "inline-flex items-center leading-none font-bold tracking-[-0.03em] whitespace-nowrap",
        s.text,
        s.gap,
        tone === "inverse" ? "text-white" : "text-foreground",
        className,
      )}
    >
      <BrandMark className={cn("shrink-0", s.mark)} />
      Tattwix
    </span>
  );
}
