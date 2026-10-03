import type { PropertyPhotoSlot } from "@tattvix/contracts";
import { Button } from "@tattvix/ui/components/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus } from "lucide-react";
import { useId } from "react";
import { Panel, PanelHeader, PanelSection } from "@/components/design-system";
import { hotelOperationsQueries } from "@/features/hotel-operations/queries";
import { getRoomTypePhotoUrl } from "../helpers";
import { propertyPhotoMutations } from "../mutations";
import { propertyPhotoQueries } from "../queries";

export function PropertyPhotosPanel({ organizationSlug, propertySlug }: { organizationSlug: string; propertySlug: string }) {
  const client = useQueryClient();
  const photos = useQuery(propertyPhotoQueries.list(organizationSlug, propertySlug));
  const rooms = useQuery(hotelOperationsQueries.rooms(organizationSlug, propertySlug));
  const upload = useMutation(propertyPhotoMutations.upload(client, organizationSlug, propertySlug));
  const remove = useMutation(propertyPhotoMutations.remove(client, organizationSlug, propertySlug));
  const busy = upload.isPending || remove.isPending;
  const error = upload.error ?? remove.error;
  const roomTypes = [...new Set(rooms.data?.rooms.map((room) => room.roomType) ?? [])].sort();
  return <Panel>
    <PanelHeader title="Photos" icon={ImagePlus} />
    <PanelSection>
      {photos.isPending || rooms.isPending ? <p className="text-sm text-muted-foreground">Loading photos...</p> : photos.isError || rooms.isError ? <div className="flex items-center gap-3"><p role="alert" className="text-sm text-destructive">Photos could not be loaded.</p><Button variant="outline" size="sm" onClick={() => { void photos.refetch(); void rooms.refetch(); }}>Retry</Button></div> : <div className="grid gap-5">
        <PhotoSlot label="Cover photo" slot={{ kind: "COVER" }} url={photos.data?.cover?.url} busy={busy} onUpload={(slot, file) => upload.mutate({ slot, file })} onRemove={(slot) => remove.mutate(slot)} />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {roomTypes.map((roomType) => <PhotoSlot key={roomType} label={roomType || "Unnamed room type"} slot={{ kind: "ROOM_TYPE", roomType }} url={getRoomTypePhotoUrl(photos.data, roomType)} busy={busy} onUpload={(slot, file) => upload.mutate({ slot, file })} onRemove={(slot) => remove.mutate(slot)} />)}
        </div>
      </div>}
      {busy ? <p role="status" className="mt-3 text-sm text-muted-foreground">Saving photo...</p> : null}
      {error ? <p role="alert" className="mt-3 text-sm text-destructive">{error instanceof Error ? error.message : "The photo could not be saved."}</p> : null}
    </PanelSection>
  </Panel>;
}

function PhotoSlot({ label, slot, url, busy, onUpload, onRemove }: {
  label: string; slot: PropertyPhotoSlot; url?: string; busy: boolean;
  onUpload: (slot: PropertyPhotoSlot, file: File) => void;
  onRemove: (slot: PropertyPhotoSlot) => void;
}) {
  const id = useId();
  const selectFile = () => document.getElementById(id)?.click();
  return <div className="grid content-start gap-2">
    <p className="text-xs text-subtle-foreground">{label}</p>
    {url ? <img src={url} alt={label} className="aspect-[16/7] w-full rounded-lg object-cover" /> : <Button variant="outline" disabled={busy} className="h-auto min-h-24 rounded-lg border-dashed py-6" onClick={selectFile} onDragOver={(event) => event.preventDefault()} onDrop={(event) => {
      event.preventDefault();
      const file = event.dataTransfer.files[0];
      if (file && !busy) onUpload(slot, file);
    }}>{slot.kind === "COVER" ? "Add cover photo" : "Add room-type photo"}</Button>}
    <input id={id} type="file" accept="image/jpeg,image/png,image/webp" aria-label={`Upload ${label}`} className="sr-only" disabled={busy} onChange={(event) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (file) onUpload(slot, file);
    }} />
    {url ? <div className="flex gap-2"><Button variant="outline" size="sm" disabled={busy} onClick={selectFile}>Replace</Button><Button variant="ghost" size="sm" disabled={busy} onClick={() => onRemove(slot)}>Remove</Button></div> : null}
  </div>;
}
