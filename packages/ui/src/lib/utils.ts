import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Teach tailwind-merge the design tokens from globals.css so that
// `rounded-card` / `shadow-card` override a component's default radius or
// shadow instead of both classes surviving and CSS order picking one.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      radius: ["card"],
      shadow: ["card", "raised"],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
