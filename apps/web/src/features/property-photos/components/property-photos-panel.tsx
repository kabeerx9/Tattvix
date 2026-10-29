import { photoSavedMessage, photoSlotsSummary, propertyPhotoSlots, type PhotoSlotView } from "@tattvix/api";
import { Button } from "@tattvix/ui/components/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@tattvix/ui/components/dropdown-menu";
import { cn } from "@tattvix/ui/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ImagePlus, RotateCw } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog, Panel, PanelHeader, PanelSection } from "@/components/design-system";
import { hotelOperationsQueries } from "@/features/hotel-operations/queries";
import { propertyPhotoMutations, uploadPropertyPhoto } from "../mutations";
import { propertyPhotoQueries } from "../queries";
import { propertyPhotosKeys } from "../keys";

const failureText = (error: unknown) => (error instanceof Error && error.message ? error.message : "The photo could not be saved. Try again.");
const SAVED_BADGE_MS = 2500;

/** A slot's upload. "done" keeps the local preview, so the tile never blinks while the saved copy loads. */
type Upload = { status: "uploading" | "saved" | "failed" | "done"; file: File; preview: string; progress: number; error?: string };

// The hotel's photos: the cover as a wide tile leading a grid of room types. A
// chosen photo shows at once on its tile with the upload's progress over it; it
// ends in a "Saved" badge and a toast naming the slot, or stays on the tile as
// "Not saved", and a click retries the same file without choosing again. Each
// slot uploads on its own. A click on a saved photo opens Replace and Remove.
// Mirrors apps/native/src/components/photo-slots.tsx.
export function PropertyPhotosPanel({ organizationSlug, propertySlug }: { organizationSlug: string; propertySlug: string }) {
  const client = useQueryClient();
  const photos = useQuery(propertyPhotoQueries.list(organizationSlug, propertySlug));
  const rooms = useQuery(hotelOperationsQueries.rooms(organizationSlug, propertySlug));
  const remove = useMutation(propertyPhotoMutations.remove(client, organizationSlug, propertySlug));
  const [uploads, setUploads] = useState<Record<string, Upload>>({});
  const [removing, setRemoving] = useState<PhotoSlotView | null>(null);
  const previews = useRef(new Set<string>());

  // Previews are object URLs: release them with the panel.
  useEffect(() => () => previews.current.forEach((url) => URL.revokeObjectURL(url)), []);

  const patch = (key: string, next: Partial<Upload> | null) =>
    setUploads((current) => {
      const copy = { ...current };
      if (next === null) delete copy[key];
      else copy[key] = { ...copy[key]!, ...next };
      return copy;
    });

  async function send(view: PhotoSlotView, file: File, preview: string) {
    setUploads((current) => ({ ...current, [view.key]: { status: "uploading", file, preview, progress: 0 } }));
    try {
      await uploadPropertyPhoto(organizationSlug, propertySlug, view.slot, file, (progress) => patch(view.key, { progress }));
      void client.invalidateQueries({ queryKey: propertyPhotosKeys.list(organizationSlug, propertySlug) });
      patch(view.key, { status: "saved", progress: 1 });
      toast.success(photoSavedMessage(view.label), { id: view.key });
      setTimeout(() => setUploads((current) => (current[view.key]?.status === "saved" ? { ...current, [view.key]: { ...current[view.key]!, status: "done" } } : current)), SAVED_BADGE_MS);
    } catch (error) {
      // The toast carries the step and storage code, which is what tells a broken bucket from a bad connection.
      patch(view.key, { status: "failed", error: failureText(error) });
      // One toast per slot: a retry's outcome replaces the failure it answers.
      toast.error(`${view.label} not saved. ${failureText(error)}`, { id: view.key });
    }
  }

  function choose(view: PhotoSlotView, file: File) {
    const preview = URL.createObjectURL(file);
    previews.current.add(preview);
    void send(view, file, preview);
  }

  if (photos.isPending || rooms.isPending) return <Shell><p className="text-sm text-muted-foreground">Loading photos...</p></Shell>;
  if (photos.isError || rooms.isError) {
    return <Shell><div className="flex items-center gap-3"><p role="alert" className="text-sm text-destructive">Photos could not be loaded.</p><Button variant="outline" size="sm" onClick={() => { void photos.refetch(); void rooms.refetch(); }}>Retry</Button></div></Shell>;
  }

  const slots = propertyPhotoSlots(photos.data, rooms.data.rooms.map((room) => room.roomType));
  // A slot counts as added once its upload saved, before the list refetches.
  const counted = slots.map((slot) => ({ ...slot, url: slot.url ?? (uploads[slot.key]?.status === "saved" || uploads[slot.key]?.status === "done" ? uploads[slot.key]!.preview : null) }));
  const tile = (view: PhotoSlotView, wide: boolean) => (
    <SlotTile
      key={view.key}
      view={view}
      wide={wide}
      upload={uploads[view.key]}
      onChoose={(file) => choose(view, file)}
      onRetry={() => { const upload = uploads[view.key]; if (upload) void send(view, upload.file, upload.preview); }}
      onRemove={() => { remove.reset(); setRemoving(view); }}
    />
  );

  return <Shell>
    <div className="grid gap-5">
      <p className="text-sm text-muted-foreground">{photoSlotsSummary(counted)} · Guests see these when they check in.</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-5 lg:grid-cols-3">{slots.map((view, index) => tile(view, index === 0))}</div>
    </div>
    <ConfirmDialog
      open={removing !== null}
      onOpenChange={(open) => { if (!open && !remove.isPending) setRemoving(null); }}
      title={`Remove the ${removing?.label.toLowerCase() === "cover photo" ? "cover photo" : `${removing?.label} photo`}?`}
      description="Guests will not see one here until you add another."
      confirmLabel="Remove photo"
      cancelLabel="Keep photo"
      tone="destructive"
      pending={remove.isPending}
      onConfirm={() => {
        if (!removing) return;
        const view = removing;
        remove.mutate(view.slot, {
          onSuccess: () => { patch(view.key, null); setRemoving(null); toast.success("Photo removed"); },
          onError: (error) => toast.error(failureText(error)),
        });
      }}
    />
  </Shell>;
}

function Shell({ children }: { children: React.ReactNode }) {
  return <Panel><PanelHeader title="Photos" icon={ImagePlus} /><PanelSection>{children}</PanelSection></Panel>;
}

function SlotTile({ view, wide, upload, onChoose, onRetry, onRemove }: {
  view: PhotoSlotView;
  wide: boolean;
  upload?: Upload;
  onChoose: (file: File) => void;
  onRetry: () => void;
  onRemove: () => void;
}) {
  const id = useId();
  const [dragging, setDragging] = useState(false);
  const selectFile = () => document.getElementById(id)?.click();
  const uri = upload?.preview ?? view.url;
  const status = upload?.status;
  const percent = Math.round((upload?.progress ?? 0) * 100);
  const line =
    status === "uploading" ? `Uploading ${percent}%`
    : status === "failed" ? "Not saved · Click to retry"
    : status === "saved" ? "Saved"
    : uri ? "Click to replace or remove"
    : "Click or drop a photo";
  const frame = cn("relative block w-full overflow-hidden rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring", wide ? "aspect-[16/9]" : "aspect-[4/3]");
  const photo = uri ? <img src={uri} alt="" className="absolute inset-0 size-full object-cover" /> : null;

  const media =
    status === "uploading" ? (
      <div className={frame} role="progressbar" aria-label={`Uploading ${view.label} photo`} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
        {photo}
        <div className="absolute inset-0 grid place-items-center bg-black/45 text-xs font-semibold text-white">{percent}%</div>
        <div className="absolute inset-x-3 bottom-3 h-1 overflow-hidden rounded-full bg-white/35"><div className="h-full rounded-full bg-white transition-[width] duration-200" style={{ width: `${Math.max(4, percent)}%` }} /></div>
      </div>
    ) : status === "failed" ? (
      <button type="button" className={frame} aria-label={`${view.label} not saved. Retry`} onClick={onRetry}>
        {photo}
        <span className="absolute inset-0 grid place-content-center justify-items-center gap-2 bg-black/55 text-xs font-semibold text-white"><RotateCw className="size-5" />Not saved</span>
      </button>
    ) : uri ? (
      <DropdownMenu>
        <DropdownMenuTrigger className={cn(frame, "cursor-pointer")} aria-label={`${view.label} photo. Replace or remove`}>
          {photo}
          {status === "saved" ? <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-card px-2 py-1 text-xs font-semibold text-foreground animate-in fade-in"><Check className="size-3.5 text-success" strokeWidth={3} />Saved</span> : null}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={selectFile}>Replace photo</DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={onRemove}>Remove photo</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ) : (
      <button
        type="button"
        aria-label={`Add ${view.label} photo`}
        onClick={selectFile}
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const file = event.dataTransfer.files[0];
          if (file) onChoose(file);
        }}
        className={cn(frame, "grid cursor-pointer place-content-center justify-items-center gap-1 border-[1.5px] border-dashed border-border text-xs text-muted-foreground hover:bg-muted", dragging && "border-primary bg-muted")}
      >
        <ImagePlus className="size-6" strokeWidth={1.75} />
        Add photo
      </button>
    );

  return <div className={cn("grid content-start gap-2", wide && "col-span-2")}>
    {media}
    <input id={id} type="file" accept="image/jpeg,image/png,image/webp" aria-label={`Upload ${view.label} photo`} className="sr-only" tabIndex={-1} onChange={(event) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (file) onChoose(file);
    }} />
    <div aria-live="polite">
      <p className="truncate text-sm font-medium">{view.label}</p>
      <p className={cn("truncate text-xs", status === "failed" ? "text-destructive" : "text-muted-foreground")} title={status === "failed" ? upload?.error : undefined}>{line}</p>
    </div>
  </div>;
}
