import { getFloorBoard, getRoomStats, localDayKey } from "@tattvix/api";
import type { HotelRoom, HotelRoomCreateInput } from "@tattvix/contracts";
import { Button } from "@tattvix/ui/components/button";
import { Input } from "@tattvix/ui/components/input";
import { Label } from "@tattvix/ui/components/label";
import { useMutation, useQueryClient, useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { BedDouble, CircleCheck, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { EmptyState, ListRow, PageHeader, Panel, PanelHeader, PanelSection, ResponsiveTable, rowActionsRevealClassName, StatusPill } from "@/components/design-system";
import { hotelStayQueries } from "@/features/hotel-stays/queries";
import { propertyPhotoQueries } from "@/features/property-photos/queries";
import { getRoomTypePhotoUrl } from "@/features/property-photos/helpers";
import { ApiError } from "@/lib/api";
import { formatMoneyMinor, parseMoneyMinor } from "@/lib/money";

import { hotelOperationsMutations } from "../mutations";
import { hotelOperationsQueries } from "../queries";
import { FloorBoard, RoomStatusStrip } from "./floor-board";

const EMPTY_ROOM: HotelRoomCreateInput = { number: "", floor: "", roomType: "", nightlyRateMinor: null };

export function HotelRoomsPage({ organizationSlug, propertySlug, canManage }: { organizationSlug: string; propertySlug: string; propertyName: string; canManage: boolean }) {
  const queryClient = useQueryClient();
  const { data } = useSuspenseQuery(hotelOperationsQueries.rooms(organizationSlug, propertySlug));
  const { data: photos } = useQuery(propertyPhotoQueries.list(organizationSlug, propertySlug));
  const { data: stayData } = useQuery(hotelStayQueries.list(organizationSlug, propertySlug));
  const activeRooms = data.rooms.filter((room) => room.isActive);
  const floors = getFloorBoard(activeRooms, stayData?.stays ?? [], localDayKey(new Date()));
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
  const actionProps = (room: HotelRoom) => ({ room, editing: editingRoomId === room.id, onEdit: () => setEditingRoomId(room.id), onCancel: () => setEditingRoomId(null), canManage, isUpdating: statusMutation.isPending || rateMutation.isPending, onMarkReady: () => markReady(room), onUpdateRate: (nightlyRateMinor: number | null) => updateRate(room, nightlyRateMinor) });
  return <div className="mx-auto grid max-w-[1400px] gap-6">
    <PageHeader title="Rooms" actions={canManage ? <Button onClick={() => setShowForm((value) => !value)}><Plus />Add room</Button> : undefined} />
    {showForm ? <Panel><PanelHeader title="Add room" icon={Plus} /><PanelSection><form className="grid gap-4 md:grid-cols-[1fr_1fr_1.5fr_1.5fr_auto] md:items-end" onSubmit={createRoom}>
      <Field label="Room number"><Input required autoFocus value={roomInput.number} onChange={(event) => setRoomInput((current) => ({ ...current, number: event.target.value }))} placeholder="101" /></Field><Field label="Floor"><Input value={roomInput.floor} onChange={(event) => setRoomInput((current) => ({ ...current, floor: event.target.value }))} placeholder="1" /></Field><Field label="Room type"><Input value={roomInput.roomType} onChange={(event) => setRoomInput((current) => ({ ...current, roomType: event.target.value }))} placeholder="Deluxe" /></Field><Field label="Nightly rate (INR)"><Input value={newRoomRate} onChange={(event) => setNewRoomRate(event.target.value)} placeholder="₹2,500.00" inputMode="decimal" aria-invalid={Boolean(newRoomRate.trim()) && parseMoneyMinor(newRoomRate) === null} /></Field><Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? "Adding..." : "Save room"}</Button>
    </form></PanelSection></Panel> : null}
    {errorMessage ? <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{errorMessage}</p> : null}
    {activeRooms.length ? <section className="grid gap-6"><RoomStatusStrip stats={getRoomStats(activeRooms)} floors={floors} /><FloorBoard floors={floors} organizationSlug={organizationSlug} propertySlug={propertySlug} /></section> : null}
    <Panel><PanelHeader title="All rooms" icon={BedDouble} meta={data.rooms.length} />
      {data.rooms.length ? <ResponsiveTable
        label="Rooms"
        rows={data.rooms}
        getRowKey={(room) => room.id}
        switchAt="4xl"
        columns={[
          { header: "Room", width: "80px", className: "font-medium tabular-nums", cell: (room) => room.number },
          { header: "Floor", width: "80px", className: "tabular-nums text-muted-foreground", cell: (room) => room.floor || "—" },
          { header: "Type", className: "flex items-center gap-2 text-muted-foreground", cell: (room) => <>{getRoomTypePhotoUrl(photos, room.roomType) ? <img src={getRoomTypePhotoUrl(photos, room.roomType)} alt="" className="size-8 shrink-0 rounded-md object-cover" /> : null}<span className="truncate">{room.roomType || "Standard"}</span></> },
          { header: "Rate", width: "140px", align: "end", className: "tabular-nums text-muted-foreground", cell: (room) => room.nightlyRateMinor === null ? "—" : formatMoneyMinor(room.nightlyRateMinor) },
          { header: "Status", width: "130px", cell: (room) => <RoomStatusPill status={room.status} /> },
          { header: "Actions", width: "240px", hideHeader: true, cell: (room) => <RoomActions {...actionProps(room)} /> },
        ]}
        mobileRow={(room) => <ListRow
          leading={getRoomTypePhotoUrl(photos, room.roomType) ? <img src={getRoomTypePhotoUrl(photos, room.roomType)} alt="" className="size-10 shrink-0 rounded-md object-cover" /> : null}
          title={`Room ${room.number}`}
          badge={<RoomStatusPill status={room.status} />}
          meta={[room.floor ? `Floor ${room.floor}` : null, room.roomType || "Standard"].filter(Boolean).join(" · ")}
          trailing={room.nightlyRateMinor === null ? <span className="text-subtle-foreground">No rate</span> : formatMoneyMinor(room.nightlyRateMinor)}
        >{canManage ? <RoomActions {...actionProps(room)} /> : null}</ListRow>}
      /> : <EmptyState icon={BedDouble} title="No rooms configured" description="Add the first room before reception confirms a guest check-in." />}
    </Panel>
  </div>;
}

function RoomActions({ room, editing, onEdit, onCancel, canManage, isUpdating, onMarkReady, onUpdateRate }: {
  room: HotelRoom; editing: boolean; onEdit: () => void; onCancel: () => void;
  canManage: boolean; isUpdating: boolean; onMarkReady: () => void; onUpdateRate: (nightlyRateMinor: number | null) => void;
}) {
  const [rate, setRate] = useState(room.nightlyRateMinor === null ? "" : moneyInput(room.nightlyRateMinor));
  useEffect(() => { setRate(room.nightlyRateMinor === null ? "" : moneyInput(room.nightlyRateMinor)); }, [room.nightlyRateMinor, editing]);
  if (!canManage) return null;
  const parsedRate = rate.trim() ? parseMoneyMinor(rate) : null;
  const invalidRate = Boolean(rate.trim()) && parsedRate === null;
  return <div className={`flex flex-wrap items-center gap-2 ${editing ? "" : rowActionsRevealClassName}`}>
    {editing ? <>
      <div className="max-md:basis-full"><Input autoFocus aria-label={`Nightly rate for room ${room.number}`} className="h-8 w-28 max-md:w-full" value={rate} onChange={(event) => setRate(event.target.value)} placeholder="Rate" inputMode="decimal" aria-invalid={invalidRate} />{invalidRate ? <p className="mt-1 text-xs text-destructive">Enter a valid amount in rupees.</p> : null}</div>
      <Button size="sm" variant="outline" disabled={isUpdating || invalidRate} onClick={() => onUpdateRate(parsedRate)}>Save</Button>
      <Button size="sm" variant="ghost" disabled={isUpdating} onClick={onCancel}>Cancel</Button>
    </> : <Button size="sm" variant="ghost" disabled={isUpdating} onClick={onEdit}>Edit rate</Button>}
    {room.status === "CLEANING" ? <Button size="sm" variant="outline" disabled={isUpdating} onClick={onMarkReady}><CircleCheck />Ready</Button> : null}
  </div>;
}
function RoomStatusPill({ status }: { status: HotelRoom["status"] }) { const map = { VACANT: ["success", "Vacant"], OCCUPIED: ["neutral", "Occupied"], CLEANING: ["warning", "Cleaning"], MAINTENANCE: ["danger", "Maintenance"] } as const; const [tone, label] = map[status]; return <StatusPill tone={tone}>{label}</StatusPill>; }
function moneyInput(amount: number) { return `${Math.floor(amount / 100)}.${String(amount % 100).padStart(2, "0")}`; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="grid gap-2"><Label>{label}</Label>{children}</div>; }
