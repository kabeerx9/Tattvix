"use client";

import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  // Web is light-only (docs/adr/0001-web-visual-language.md). next-themes'
  // `theme` is the stored preference, not the forced one, so honour
  // `forcedTheme` and never fall back to the OS scheme.
  const { forcedTheme, theme } = useTheme();
  const toasterTheme = (forcedTheme ?? theme ?? "light") === "dark" ? "dark" : "light";

  return (
    <Sonner
      theme={toasterTheme}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      // Keep toasts clear of the home indicator and landscape notch. Sonner's
      // defaults are 24px (desktop) and 16px (mobile); env() is 0 off-device.
      offset={{
        bottom: "calc(24px + env(safe-area-inset-bottom, 0px))",
        right: "calc(24px + env(safe-area-inset-right, 0px))",
        left: "calc(24px + env(safe-area-inset-left, 0px))",
        top: "calc(24px + env(safe-area-inset-top, 0px))",
      }}
      // On phones, --toast-clearance lifts toasts above a bottom tab bar
      // (set in globals.css while one is on the page).
      mobileOffset={{
        bottom: "calc(16px + var(--toast-clearance, 0px) + env(safe-area-inset-bottom, 0px))",
        right: "calc(16px + env(safe-area-inset-right, 0px))",
        left: "calc(16px + env(safe-area-inset-left, 0px))",
        top: "calc(16px + env(safe-area-inset-top, 0px))",
      }}
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
