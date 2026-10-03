import type { HotelRoom, HotelRoomCreateInput } from "@tattvix/contracts";
import { Button } from "@tattvix/ui/components/button";
import { Input } from "@tattvix/ui/components/input";
import { Label } from "@tattvix/ui/components/label";
import { useMutation, useQueryClient, useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { BedDouble, CircleCheck, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { EmptyState, Kpi, KpiStrip, PageHeader, Panel, PanelHeader, PanelSection, StatusPill } from "@/components/design-system";
import { propertyPhotoQueries } from "@/features/property-photos/queries";
import { getRoomTypePhotoUrl } from "@/features/property-photos/helpers";
import { ApiError } from "@/lib/api";
import { formatMoneyMinor, parseMoneyMinor } from "@/lib/money";

import { hotelOperationsMutations } from "../mutations";
import { hotelOperationsQueries } from "../queries";

const EMPTY_ROOM: HotelRoomCreateInput = { number: "", floor: "", roomType: "", nightlyRateMinor: null };

export function HotelRoomsPage({ organizationSlug, propertySlug, canManage }: { organizationSlug: string; propertySlug: string; propertyName: string; canManage: boolean }) {
  const queryClient = useQueryClient();
  const { data } = useSuspenseQuery(hotelOperationsQueries.rooms(organizationSlug, propertySlug));
  const { data: photos } = useQuery(propertyPhotoQueries.list(organizationSlug, propertySlug));
  const [editingRoomId, setEditingRoomId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [roomInput, setRoomInput] = useState(EMPTY_ROOM);
  const [newRoomRate, setNewRoomRate] = useState("");
  const createMutation = useMutation(hotelOperationsMutations.createRoom(queryClient));
  const statusMutation = useMutation(hotelOperationsMutations.updateRoomStatus(queryClient));
  const rateMutation = useMutation(hotelOperationsMutations.updateRoomRate(queryClient));
  function createRoom(event: React.FormEvent) { event.preventDefault(); const nightlyRateMinor = newRoomRate.trim() ? parseMoneyMinor(newRoomRate) : null; if (newRoomRate.trim() && nightlyRateMinor === null) return; createMutation.mutate({ organizationSlug, propertySlug, input: { ...roomInput, nightlyRateMinor } }, { onSuccess: () => { setRoomInput(EMPTY_ROOM); setNewRoomRate(""); setShowForm(false); toast.success(`Room ${roomInput.number.trim()} added`); } }); }
  function markReady(room: HotelRoom) { statusMutation.mutate({ organizationSlug, propertySlug, roomId: room.id, input: { status: "VACANT" } }, { onSuccess: () => toast.success(`Room ${room.number} is ready`) }); }
  function updateRate(room: HotelRoom, nightlyRateMinor: number | null) { rateMutation.mutate({ organizationSlug, propertySlug, roomId: room.id, input: { nightlyRateMinor } }, { onSuccess: () => { setEditingRoomId(null); toast.success(`Nightly rate saved for room ${room.number}`); } }); }
  const error = [createMutation.error, statusMutation.error, rateMutation.error].find(Boolean);
  const errorMessage = error instanceof ApiError ? error.message : error ? "The room inventory could not be updated." : null;
  return <div className="mx-auto grid max-w-[1400px] gap-6">
    <PageHeader title="Rooms" actions={canManage ? <Button onClick={() => setShowForm((value) => !value)}><Plus />Add room</Button> : undefined} />
    {showForm ? <Panel><PanelHeader title="Add room" icon={Plus} /><PanelSection><form className="grid gap-4 md:grid-cols-[1fr_1fr_1.5fr_1.5fr_auto] md:items-end" onSubmit={createRoom}>
      <Field label="Room number"><Input required autoFocus value={roomInput.number} onChange={(event) => setRoomInput((current) => ({ ...current, number: event.target.value }))} placeholder="101" /></Field><Field label="Floor"><Input value={roomInput.floor} onChange={(event) => setRoomInput((current) => ({ ...current, floor: event.target.value }))} placeholder="1" /></Field><Field label="Room type"><Input value={roomInput.roomType} onChange={(event) => setRoomInput((current) => ({ ...current, roomType: event.target.value }))} placeholder="Deluxe" /></Field><Field label="Nightly rate (INR)"><Input value={newRoomRate} onChange={(event) => setNewRoomRate(event.target.value)} placeholder="₹2,500.00" inputMode="decimal" aria-invalid={Boolean(newRoomRate.trim()) && parseMoneyMinor(newRoomRate) === null} /></Field><Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? "Adding..." : "Save room"}</Button>
    </form></PanelSection></Panel> : null}
    {errorMessage ? <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{errorMessage}</p> : null}
    <KpiStrip><Kpi icon={BedDouble} label="Vacant" value={data.rooms.filter((room) => room.status === "VACANT").length} /><Kpi icon={BedDouble} label="Occupied" value={data.rooms.filter((room) => room.status === "OCCUPIED").length} /><Kpi icon={BedDouble} label="Cleaning" value={data.rooms.filter((room) => room.status === "CLEANING").length} /><Kpi icon={BedDouble} label="Maintenance" value={data.rooms.filter((room) => room.status === "MAINTENANCE").length} /></KpiStrip>
    <Panel><PanelHeader title="Rooms" icon={BedDouble} meta={data.rooms.length} />
      {data.rooms.length ? <div className="overflow-x-auto"><div className="min-w-[840px]" role="table" aria-label="Rooms"><div role="row" className="grid h-11 grid-cols-[80px_80px_minmax(0,1fr)_140px_130px_280px] items-center gap-4 bg-muted px-5 text-xs text-subtle-foreground"><span role="columnheader">Room</span><span role="columnheader">Floor</span><span role="columnheader">Type</span><span role="columnheader" className="text-right">Rate</span><span role="columnheader">Status</span><span role="columnheader">Actions</span></div>{data.rooms.map((room) => <RoomRow key={room.id} room={room} photoUrl={getRoomTypePhotoUrl(photos, room.roomType)} editing={editingRoomId === room.id} onEdit={() => setEditingRoomId(room.id)} onCancel={() => setEditingRoomId(null)} canManage={canManage} isUpdating={statusMutation.isPending || rateMutation.isPending} onMarkReady={() => markReady(room)} onUpdateRate={(nightlyRateMinor) => updateRate(room, nightlyRateMinor)} />)}</div></div> : <EmptyState icon={BedDouble} title="No rooms configured" description="Add the first room before reception confirms a guest check-in." />}
    </Panel>
  </div>;
}

function RoomRow({ room, photoUrl, editing, onEdit, onCancel, canManage, isUpdating, onMarkReady, onUpdateRate }: {
  room: HotelRoom; photoUrl?: string; editing: boolean; onEdit: () => void; onCancel: () => void;
  canManage: boolean; isUpdating: boolean; onMarkReady: () => void; onUpdateRate: (nightlyRateMinor: number | null) => void;
}) {
  const [rate, setRate] = useState(room.nightlyRateMinor === null ? "" : moneyInput(room.nightlyRateMinor));
  useEffect(() => { setRate(room.nightlyRateMinor === null ? "" : moneyInput(room.nightlyRateMinor)); }, [room.nightlyRateMinor, editing]);
  const parsedRate = rate.trim() ? parseMoneyMinor(rate) : null;
  const invalidRate = Boolean(rate.trim()) && parsedRate === null;
  return <div role="row" className="group grid min-h-11 grid-cols-[80px_80px_minmax(0,1fr)_140px_130px_280px] items-center gap-4 border-t border-border-soft px-5 py-2 text-sm">
    <span role="cell" className="font-medium tabular-nums">{room.number}</span>
    <span role="cell" className="tabular-nums text-muted-foreground">{room.floor || "—"}</span>
    <span role="cell" className="flex min-w-0 items-center gap-2 text-muted-foreground">{photoUrl ? <img src={photoUrl} alt="" className="size-8 shrink-0 rounded-md object-cover" /> : null}<span className="truncate">{room.roomType || "Standard"}</span></span>
    <span role="cell" className="text-right tabular-nums text-muted-foreground">{room.nightlyRateMinor === null ? "—" : formatMoneyMinor(room.nightlyRateMinor)}</span>
    <span role="cell"><RoomStatusPill status={room.status} /></span>
    <span role="cell" className={`flex flex-wrap items-center gap-2 ${editing ? "" : "sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"}`}>
      {canManage ? <>
        {editing ? <>
          <div><Input autoFocus aria-label={`Nightly rate for room ${room.number}`} className="h-8 w-28" value={rate} onChange={(event) => setRate(event.target.value)} placeholder="Rate" inputMode="decimal" aria-invalid={invalidRate} />{invalidRate ? <p className="mt-1 text-xs text-destructive">Enter a valid amount in rupees.</p> : null}</div>
          <Button size="sm" variant="outline" disabled={isUpdating || invalidRate} onClick={() => onUpdateRate(parsedRate)}>Save</Button>
          <Button size="sm" variant="ghost" disabled={isUpdating} onClick={onCancel}>Cancel</Button>
        </> : <Button size="sm" variant="ghost" disabled={isUpdating} onClick={onEdit}>Edit rate</Button>}
        {room.status === "CLEANING" ? <Button size="sm" variant="outline" disabled={isUpdating} onClick={onMarkReady}><CircleCheck />Ready</Button> : null}
      </> : null}
    </span>
  </div>;
}
function RoomStatusPill({ status }: { status: HotelRoom["status"] }) { const map = { VACANT: ["success", "Vacant"], OCCUPIED: ["neutral", "Occupied"], CLEANING: ["warning", "Cleaning"], MAINTENANCE: ["danger", "Maintenance"] } as const; const [tone, label] = map[status]; return <StatusPill tone={tone}>{label}</StatusPill>; }
function moneyInput(amount: number) { return `${Math.floor(amount / 100)}.${String(amount % 100).padStart(2, "0")}`; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="grid gap-2"><Label>{label}</Label>{children}</div>; }
