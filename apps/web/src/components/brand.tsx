// The one place the Tattwix logo lives in the React app. Every shell, the
// auth pages and the check-in screens render it from here.
//
// Placeholder until the real logo lands: a plain wordmark in the foreground
// colour, no accent letter. To swap in the real logo, replace the markup in
// BrandLogo with the SVG (keep `className`/`tone` working, use currentColor
// so `tone` still recolours it). The other swap points, which cannot import
// React, are listed in docs/design-system.md "Brand":
//   - apps/web/public/favicon.svg (browser tab, home-screen icon)
//   - apps/web/index.html, the boot splash wordmark (painted before the bundle)
import { cn } from "@tattvix/ui/lib/utils";

const sizes = {
  sm: "text-[15px]",
  md: "text-[19px]",
  lg: "text-[26px]",
} as const;

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
  return (
    <span
      className={cn(
        "inline-block leading-none font-bold tracking-[-0.03em] whitespace-nowrap",
        sizes[size],
        tone === "inverse" ? "text-white" : "text-foreground",
        className,
      )}
    >
      Tattwix
    </span>
  );
}
