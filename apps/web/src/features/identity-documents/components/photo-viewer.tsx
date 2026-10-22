import { Button } from "@tattvix/ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@tattvix/ui/components/sheet";
import { cn } from "@tattvix/ui/lib/utils";
import { X, ZoomIn, ZoomOut } from "lucide-react";
import { useState } from "react";

/**
 * Full-screen photo view for a private document image. Tap (or the zoom
 * button) toggles fit-to-screen and 2.5x; when zoomed the image pans by
 * scrolling, so it works with a finger, a trackpad, or a mouse wheel.
 * Browser pinch-zoom stays available on touch screens.
 */
export function PhotoViewer({
  photo,
  onClose,
}: {
  photo: { url: string; title: string } | null;
  onClose: () => void;
}) {
  const [zoomed, setZoomed] = useState(false);

  return (
    <Sheet
      open={photo !== null}
      onOpenChange={(open) => {
        if (!open) {
          setZoomed(false);
          onClose();
        }
      }}
    >
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="h-dvh gap-0 border-0 bg-foreground data-[side=bottom]:h-dvh data-[side=bottom]:border-t-0 pt-[env(safe-area-inset-top,0px)] text-background"
      >
        <div className="flex items-center gap-2 px-3 py-2">
          <SheetTitle className="min-w-0 flex-1 truncate px-1 text-sm font-medium text-background">
            {photo?.title}
          </SheetTitle>
          <SheetDescription className="sr-only">
            Private document photo. Tap the photo to zoom.
          </SheetDescription>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-10 text-background hover:bg-background/10 hover:text-background"
            aria-label={zoomed ? "Fit to screen" : "Zoom in"}
            aria-pressed={zoomed}
            onClick={() => setZoomed((value) => !value)}
          >
            {zoomed ? <ZoomOut className="size-5" /> : <ZoomIn className="size-5" />}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-10 text-background hover:bg-background/10 hover:text-background"
            aria-label="Close photo"
            onClick={() => {
              setZoomed(false);
              onClose();
            }}
          >
            <X className="size-5" />
          </Button>
        </div>
        <div
          className={cn(
            "min-h-0 flex-1 overscroll-contain",
            zoomed ? "overflow-auto" : "grid place-items-center overflow-hidden p-3",
          )}
        >
          {photo ? (
            <img
              src={photo.url}
              alt={photo.title}
              draggable={false}
              onClick={() => setZoomed((value) => !value)}
              className={cn(
                "select-none",
                zoomed
                  ? "max-w-none w-[250%] cursor-zoom-out sm:w-[160%]"
                  : "max-h-full max-w-full cursor-zoom-in rounded-md object-contain",
              )}
            />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
