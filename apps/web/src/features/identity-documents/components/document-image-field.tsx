import { Button } from "@tattvix/ui/components/button";
import { Skeleton } from "@tattvix/ui/components/skeleton";
import { Camera, Check, ImageUp, LoaderCircle, RotateCcw } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import {
  compressImage,
  ImageDecodeError,
} from "@/features/identity-documents/compress-image";
import { validateUploadFile } from "@/features/identity-documents/document-model";

export type ImageSelection =
  | { status: "processing" }
  | { status: "ready"; file: File; originalSize: number };

/** A saved photo: whether one exists, and its short-lived URL once loaded. */
export type SavedPhoto = {
  isUploaded: boolean;
  url: string | null;
  isLoading: boolean;
};

const prefersCamera = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(pointer: coarse)").matches;

/**
 * One photo slot (front or back) in the document editor. Empty, it is one
 * large target that opens the camera on a phone and the file picker on a
 * computer; the gallery stays one tap away. With a photo it shows the image
 * at ID-card proportions with Retake / Replace below.
 */
export function DocumentPhotoSlot({
  label,
  required,
  saved,
  selection,
  error,
  disabled,
  onSelectionChange,
  onError,
  onOpen,
}: {
  label: string;
  required: boolean;
  saved: SavedPhoto;
  selection: ImageSelection | null;
  error?: string;
  disabled?: boolean;
  onSelectionChange: (selection: ImageSelection | null) => void;
  onError: (message: string | undefined) => void;
  onOpen: (photo: { url: string; title: string }) => void;
}) {
  const id = useId();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Ignores a slow compression that finishes after the user picked again.
  const latestPick = useRef(0);
  const previewUrl = useObjectUrl(
    selection?.status === "ready" ? selection.file : null,
  );

  async function handlePick(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const picked = input.files?.[0];
    // Reset so choosing the same photo again still fires a change event.
    input.value = "";
    if (!picked) return;

    const pick = ++latestPick.current;
    onError(undefined);
    onSelectionChange({ status: "processing" });

    try {
      const file = await compressImage(picked);
      if (pick !== latestPick.current) return;

      const message = validateUploadFile(file);
      if (message) {
        onSelectionChange(null);
        onError(message);
        return;
      }
      onSelectionChange({ status: "ready", file, originalSize: picked.size });
    } catch (caught) {
      if (pick !== latestPick.current) return;
      onSelectionChange(null);
      onError(
        caught instanceof ImageDecodeError
          ? caught.message
          : "This photo could not be prepared. Try another one.",
      );
    }
  }

  function undoSelection() {
    latestPick.current += 1;
    onSelectionChange(null);
    onError(undefined);
  }

  const openPrimaryPicker = () =>
    (prefersCamera() ? cameraInputRef : fileInputRef).current?.click();

  const isProcessing = selection?.status === "processing";
  const imageUrl =
    selection?.status === "ready" ? previewUrl : saved.isUploaded ? saved.url : null;
  const hasImage = selection?.status === "ready" || saved.isUploaded;
  const title = `${label} photo`;

  return (
    <div className="grid gap-2" role="group" aria-labelledby={`${id}-label`}>
      <div className="flex items-baseline justify-between gap-3">
        <p id={`${id}-label`} className="text-sm font-medium">
          {label}
          {required ? null : (
            <span className="ml-1.5 font-normal text-subtle-foreground">optional</span>
          )}
        </p>
        <SlotStatus
          required={required}
          state={
            isProcessing
              ? "processing"
              : selection?.status === "ready"
                ? "new"
                : saved.isUploaded
                  ? "saved"
                  : "empty"
          }
        />
      </div>

      {isProcessing ? (
        <div className="grid aspect-[1.586] w-full place-items-center rounded-lg bg-muted text-muted-foreground">
          <span className="inline-flex items-center gap-2 text-sm">
            <LoaderCircle className="size-4 animate-spin" />
            Preparing photo…
          </span>
        </div>
      ) : imageUrl ? (
        <button
          type="button"
          className="group relative block aspect-[1.586] w-full overflow-hidden rounded-lg bg-muted ring-1 ring-border outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`View ${title.toLowerCase()}`}
          onClick={() => onOpen({ url: imageUrl, title })}
        >
          <img
            src={imageUrl}
            alt=""
            className="size-full object-contain"
            draggable={false}
          />
        </button>
      ) : saved.isUploaded ? (
        // Saved, but the private URL is still loading (or failed to load).
        saved.isLoading ? (
          <Skeleton className="aspect-[1.586] w-full rounded-lg" />
        ) : (
          <div className="grid aspect-[1.586] w-full place-items-center rounded-lg bg-muted text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <Check className="size-4 text-success" />
              Photo saved
            </span>
          </div>
        )
      ) : (
        <button
          type="button"
          disabled={disabled}
          aria-invalid={Boolean(error)}
          onClick={openPrimaryPicker}
          className="grid aspect-[1.586] w-full touch-manipulation place-items-center rounded-lg border-2 border-dashed border-border bg-background text-muted-foreground transition-[background-color,scale] duration-150 outline-none select-none focus-visible:border-ring active:bg-muted motion-safe:active:scale-[0.99] disabled:opacity-50 aria-invalid:border-destructive/60"
        >
          <span className="grid justify-items-center gap-2 px-4 text-center">
            <Camera aria-hidden className="size-6 text-muted-foreground pointer-fine:hidden" strokeWidth={1.5} />
            <ImageUp aria-hidden className="size-6 text-muted-foreground pointer-coarse:hidden" strokeWidth={1.5} />
            <span className="text-sm font-medium text-foreground">
              <span className="pointer-fine:hidden">Take photo of {label.toLowerCase()}</span>
              <span className="pointer-coarse:hidden">Choose {label.toLowerCase()} photo</span>
            </span>
            <span className="text-xs">Whole card in frame, no glare</span>
          </span>
        </button>
      )}

      <div className="flex gap-2">
        {hasImage ? (
          <Button
            type="button"
            variant="outline"
            className="h-11 flex-1 text-sm pointer-fine:hidden"
            disabled={disabled || isProcessing}
            onClick={() => cameraInputRef.current?.click()}
          >
            <Camera />
            Retake
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          className="h-11 flex-1 text-sm pointer-fine:h-9 pointer-fine:flex-none"
          disabled={disabled || isProcessing}
          onClick={() => fileInputRef.current?.click()}
        >
          <ImageUp />
          {hasImage ? "Replace" : (
            <>
              <span className="pointer-fine:hidden">Choose from gallery</span>
              <span className="pointer-coarse:hidden">Choose file</span>
            </>
          )}
        </Button>
        {selection?.status === "ready" && saved.isUploaded ? (
          <Button
            type="button"
            variant="ghost"
            className="h-11 text-sm pointer-fine:h-9"
            disabled={disabled}
            onClick={undoSelection}
          >
            <RotateCcw />
            Keep saved
          </Button>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="text-xs text-destructive">{error}</p>
      ) : null}

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={handlePick}
      />
      {/* A broad `accept` makes Android offer Files and Drive alongside the
          gallery; an exact MIME list limits it to the photo picker. */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        aria-label={`Choose ${title.toLowerCase()}`}
        onChange={handlePick}
      />
    </div>
  );
}

function SlotStatus({
  state,
  required,
}: {
  state: "processing" | "new" | "saved" | "empty";
  required: boolean;
}) {
  if (state === "new") {
    return <span className="text-xs font-medium text-foreground">New photo · saves with the document</span>;
  }
  if (state === "saved") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-success">
        <Check className="size-3.5" />
        Saved
      </span>
    );
  }
  if (state === "empty" && required) {
    return <span className="text-xs text-subtle-foreground">Needed</span>;
  }
  return null;
}

function useObjectUrl(file: File | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  return url;
}
