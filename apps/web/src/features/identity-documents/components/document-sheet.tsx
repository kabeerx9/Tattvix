import { Button } from "@tattvix/ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@tattvix/ui/components/sheet";
import { ChevronLeft } from "lucide-react";

/**
 * The one presentation seam for document flows. On a phone it is a
 * full-screen page (side sheets are full width below `sm`); on desktop a
 * 512px side sheet. When the shared `BottomSheet` primitive lands, swap the
 * Sheet here and every document flow follows.
 *
 * Layout: fixed header, a scrolling body, and a footer pinned to the bottom
 * edge. The sheet primitive already pads right sheets by the safe-area
 * insets, so the footer clears the home indicator.
 */
export function DocumentSheet({
  open,
  onOpenChange,
  presentation = "page",
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * "page": full screen on phones, a side sheet on desktop.
   * "bottom": a tall bottom sheet, for flows that are themselves a phone-first
   * page (check-in), so the guest stays visually inside that flow.
   */
  presentation?: "page" | "bottom";
  children: React.ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {presentation === "bottom" ? (
        <SheetContent
          side="bottom"
          className="mx-auto h-[min(92dvh,52rem)] w-full max-w-lg gap-0 rounded-t-xl text-sm data-[side=bottom]:h-[min(92dvh,52rem)] sm:border-x"
        >
          {children}
        </SheetContent>
      ) : (
        <SheetContent className="gap-0 text-sm sm:max-w-lg">{children}</SheetContent>
      )}
    </Sheet>
  );
}

/** Header, scrolling body and pinned footer for one screen inside a DocumentSheet. */
export function DocumentSheetFrame({
  title,
  description,
  meta,
  onBack,
  footer,
  children,
}: {
  title: string;
  description?: string;
  meta?: React.ReactNode;
  onBack?: () => void;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <>
      <SheetHeader className="flex-row items-start gap-2 border-b border-border-soft py-3 pr-12 pl-4">
        {onBack ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="-ml-1.5 size-9 shrink-0"
            aria-label="Back"
            onClick={onBack}
          >
            <ChevronLeft className="size-5" />
          </Button>
        ) : null}
        <div className="min-w-0 flex-1 py-1.5">
          <SheetTitle className="text-base font-semibold [overflow-wrap:anywhere]">
            {title}
          </SheetTitle>
          {description ? (
            <SheetDescription className="mt-0.5 text-[13px] leading-5">
              {description}
            </SheetDescription>
          ) : null}
          {meta ? <div className="mt-1 text-xs text-subtle-foreground">{meta}</div> : null}
        </div>
      </SheetHeader>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
      {footer ? (
        <SheetFooter className="mt-0 border-t border-border-soft bg-popover px-4 py-3">
          {footer}
        </SheetFooter>
      ) : null}
    </>
  );
}
