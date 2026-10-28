// Reservation and room sheets shared by Today, Rooms and the stay detail.
// Every action is a real mutation and is only offered to roles that may
// perform it; the server still enforces permissions and entitlement.
import { getReadyRooms, getStayStatus, localDayKey, formatMoneyMinor, formatMoneyWholeRupees, parseMoneyMinor } from "@tattvix/api";
import type { HotelRoom, HotelStayListItem, PropertyPhotosResponse } from "@tattvix/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, type Href } from "expo-router";
import { Minus, Plus, ShieldCheck } from "lucide-react-native";
import { useEffect, useState, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { BottomSheet, Button, InitialsAvatar, PhotoTile, StatusPill, TextField, TextLink, colors, radii, space, toast, type } from "@/src/design-system";
import type { DeskScope } from "@/src/lib/desk-scope";
import { errorMessage, formatDay, formatTime, initialsOf, partyLabel, roomMeta, roomStatusLabel, roomStatusTone } from "@/src/lib/format";
import { hotelMutations } from "@/src/lib/hotel-mutations";

export function roomPhotoUrl(photos: PropertyPhotosResponse | undefined, roomType: string | null | undefined) {
  return photos?.roomTypes.find((photo) => photo.roomType === roomType)?.url;
}

const statusColor = { warning: colors.warning, danger: colors.destructive, primary: colors.mutedForeground, muted: colors.mutedForeground } as const;

/** Keeps the last non-null value so a sheet can animate out with its content. */
function useLatest<T>(value: T | null): T | null {
  const [latest, setLatest] = useState(value);
  useEffect(() => {
    if (value !== null) setLatest(value);
  }, [value]);
  return value ?? latest;
}

function Fact({ label, children }: { label: string; children: string }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue} numberOfLines={1}>
        {children}
      </Text>
    </View>
  );
}

function NightsStepper({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const step = (delta: number) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={delta < 0 ? "Fewer nights" : "More nights"}
      disabled={delta < 0 ? value <= 1 : value >= 365}
      onPress={() => onChange(value + delta)}
      style={({ pressed }) => [styles.step, pressed && { backgroundColor: colors.muted }, (delta < 0 ? value <= 1 : value >= 365) && { opacity: 0.4 }]}
    >
      {delta < 0 ? <Minus color={colors.foreground} size={18} /> : <Plus color={colors.foreground} size={18} />}
    </Pressable>
  );
  return (
    <View style={styles.stepper}>
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>Nights</Text>
        <Text style={styles.hint}>Sets the expected checkout</Text>
      </View>
      {step(-1)}
      <Text accessibilityLiveRegion="polite" style={styles.stepValue}>
        {value}
      </Text>
      {step(1)}
    </View>
  );
}

function ErrorLine({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <Text accessibilityRole="alert" style={styles.error}>
      {message}
    </Text>
  );
}

export function StaySheet({
  scope,
  stayId,
  stays,
  rooms,
  photos,
  initialRoomId = null,
  showOpenLink = true,
  onClose,
}: {
  scope: DeskScope;
  stayId: string | null;
  stays: HotelStayListItem[];
  rooms: HotelRoom[];
  photos?: PropertyPhotosResponse;
  /** Preselect a room (assignment started from the Rooms screen). */
  initialRoomId?: number | null;
  showOpenLink?: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const checkIn = useMutation(hotelMutations.checkIn(queryClient));
  const checkout = useMutation(hotelMutations.checkout(queryClient));
  const shownId = useLatest(stayId);
  const stay = stays.find((entry) => entry.id === shownId);
  const [roomId, setRoomId] = useState<number | null>(initialRoomId);
  const [nights, setNights] = useState(1);

  useEffect(() => {
    setRoomId(initialRoomId);
    setNights(1);
    checkIn.reset();
    checkout.reset();
    // Reset per opened stay only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stayId]);

  const todayKey = localDayKey(new Date());
  const roomsById = new Map(rooms.map((room) => [room.id, room]));
  const room = stay?.room ? roomsById.get(stay.room.id) : undefined;
  const readyRooms = getReadyRooms(rooms);
  const selected = roomId !== null ? roomsById.get(roomId) : undefined;
  const waiting = stay?.operationalStatus === "PENDING_CHECK_IN";
  const inHouse = stay?.operationalStatus === "CHECKED_IN";
  const status = stay ? getStayStatus(stay, todayKey) : null;
  const params = { organizationSlug: scope.organizationSlug, propertySlug: scope.propertySlug };
  const error = errorMessage(checkIn.error, "The guest could not be checked in.") ?? errorMessage(checkout.error, "The guest could not be checked out.");
  const idActive = stay?.identityAccess.isActive ?? false;
  const selectedHasRate = selected?.nightlyRateMinor !== null && selected?.nightlyRateMinor !== undefined;
  const assigning = Boolean(stay && waiting && scope.canAssign);

  function confirmCheckIn() {
    if (!stay || !selected) return;
    checkIn.mutate(
      { ...params, stayId: stay.id, roomId: selected.id, nights },
      {
        onSuccess: () => {
          toast(`${stay.guestName} checked in to room ${selected.number}`);
          onClose();
        },
      },
    );
  }

  function confirmCheckout() {
    if (!stay) return;
    checkout.mutate(
      { ...params, stayId: stay.id },
      {
        onSuccess: () => {
          toast(`${stay.guestName} checked out${room ? `, room ${room.number} needs cleaning` : ""}`);
          onClose();
        },
      },
    );
  }

  let footer: ReactNode = null;
  if (assigning) {
    footer = (
      <Button
        label={checkIn.isPending ? "Checking in" : selected ? `Check in to room ${selected.number}` : "Choose a room"}
        onPress={confirmCheckIn}
        loading={checkIn.isPending}
        disabled={!selected || !selectedHasRate || !idActive}
      />
    );
  } else if (stay && waiting && scope.readOnly) {
    footer = <Button label="Check-ins paused · trial ended" onPress={() => {}} disabled />;
  } else if (stay && inHouse && scope.canCheckout) {
    footer = <Button label="Confirm check-out" onPress={confirmCheckout} loading={checkout.isPending} />;
  }

  return (
    <BottomSheet open={stayId !== null} onClose={onClose} title={assigning ? "Assign a room" : "Reservation"} footer={footer}>
      {stay ? (
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} bounces={false}>
          <View style={styles.stack}>
            {!waiting && roomPhotoUrl(photos, room?.roomType) ? <PhotoTile uri={roomPhotoUrl(photos, room?.roomType)} /> : null}
            <View style={styles.identity}>
              <InitialsAvatar initials={initialsOf(stay.guestName)} name={stay.guestName} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{stay.guestName}</Text>
                <Text style={styles.hint}>
                  {partyLabel(stay)}
                  {room ? ` · Room ${room.number}${room.roomType ? `, ${room.roomType}` : ""}` : ""}
                </Text>
                {status ? <Text style={[styles.status, { color: statusColor[status.tone] }]}>{status.label}</Text> : null}
              </View>
            </View>

            {assigning ? (
              <>
                <NightsStepper value={nights} onChange={setNights} />
                <View style={{ gap: space.sm }}>
                  <Text style={styles.label}>
                    Ready rooms <Text style={styles.hint}>({readyRooms.length})</Text>
                  </Text>
                  {readyRooms.length ? (
                    readyRooms.map((choice) => {
                      const isSelected = choice.id === roomId;
                      return (
                        <Pressable
                          key={choice.id}
                          accessibilityRole="button"
                          accessibilityState={{ selected: isSelected }}
                          onPress={() => setRoomId(choice.id)}
                          style={[styles.choice, isSelected && styles.choiceSelected]}
                        >
                          <View style={styles.choicePhoto}>
                            <PhotoTile uri={roomPhotoUrl(photos, choice.roomType)} />
                          </View>
                          <View style={{ flex: 1, gap: 2 }}>
                            <View style={styles.between}>
                              <Text style={styles.rowTitle}>Room {choice.number}</Text>
                              <Text style={styles.rowTitle}>{choice.nightlyRateMinor !== null ? formatMoneyWholeRupees(choice.nightlyRateMinor) : "No rate"}</Text>
                            </View>
                            <Text style={styles.hint} numberOfLines={1}>
                              {roomMeta(choice) || "Room"}
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })
                  ) : (
                    <Text style={styles.quiet}>No rooms are ready. Mark a cleaned room ready first.</Text>
                  )}
                  {selected && !selectedHasRate ? <Text style={styles.warn}>Set a nightly rate for room {selected.number} before check-in.</Text> : null}
                  {selected && selectedHasRate ? (
                    <Text style={styles.hint}>
                      Room charge {formatMoneyMinor(selected.nightlyRateMinor! * nights)} for {nights} {nights === 1 ? "night" : "nights"}.
                    </Text>
                  ) : null}
                  {!idActive ? <Text style={styles.warn}>This guest's ID access has ended, so they can't be checked in.</Text> : null}
                </View>
              </>
            ) : (
              <View style={styles.facts}>
                <Fact label="Checked in">{stay.checkedInAt ? `${formatDay(localDayKey(new Date(stay.checkedInAt)), todayKey)}, ${formatTime(stay.checkedInAt)}` : `Submitted ${formatTime(stay.submittedAt)}`}</Fact>
                <Fact label={stay.checkedOutAt ? "Checked out" : "Due out"}>{stay.checkedOutAt ? formatTime(stay.checkedOutAt) : formatDay(stay.expectedCheckOutDate, todayKey)}</Fact>
                <Fact label="Room">{room ? `${room.number}${room.floor ? ` · Floor ${room.floor}` : ""}` : "Not assigned"}</Fact>
                <Fact label="Nightly rate">{room?.nightlyRateMinor !== null && room?.nightlyRateMinor !== undefined ? formatMoneyWholeRupees(room.nightlyRateMinor) : "—"}</Fact>
              </View>
            )}

            <View style={styles.idLine}>
              <ShieldCheck color={colors.mutedForeground} size={16} />
              <Text style={styles.hint}>
                {stay.identityAccess.isActive ? (stay.identityAccess.expiresAt ? `ID access ends ${formatDay(localDayKey(new Date(stay.identityAccess.expiresAt)), todayKey)}` : "ID shared") : "ID access has ended"}
              </Text>
            </View>

            <ErrorLine message={error} />

            {showOpenLink ? (
              <TextLink
                label="Open full stay"
                onPress={() => {
                  onClose();
                  router.push(`/(hotel)/${params.organizationSlug}/${params.propertySlug}/stays/${stay.id}` as Href);
                }}
              />
            ) : null}
          </View>
        </ScrollView>
      ) : null}
    </BottomSheet>
  );
}

export function RoomSheet({
  scope,
  roomId,
  rooms,
  photos,
  waitingStays = [],
  onAssign,
  onClose,
}: {
  scope: DeskScope;
  roomId: number | null;
  rooms: HotelRoom[];
  photos?: PropertyPhotosResponse;
  /** Guests waiting for a room; a ready room offers them for assignment. */
  waitingStays?: HotelStayListItem[];
  onAssign?: (stayId: string, roomId: number) => void;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const updateStatus = useMutation(hotelMutations.updateRoomStatus(queryClient));
  const shownId = useLatest(roomId);
  const room = rooms.find((entry) => entry.id === shownId);

  useEffect(() => {
    updateStatus.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const actions: { label: string; status: "VACANT" | "CLEANING" | "MAINTENANCE" }[] =
    room?.status === "CLEANING"
      ? [{ label: "Mark ready", status: "VACANT" }, { label: "Needs maintenance", status: "MAINTENANCE" }]
      : room?.status === "MAINTENANCE"
        ? [{ label: "Back in service", status: "VACANT" }]
        : room?.status === "VACANT"
          ? [{ label: "Send to cleaning", status: "CLEANING" }, { label: "Needs maintenance", status: "MAINTENANCE" }]
          : [];

  function setStatus(status: "VACANT" | "CLEANING" | "MAINTENANCE") {
    if (!room) return;
    // Optimistic: the grid already shows the new status, so the sheet can close now.
    updateStatus.mutate({ organizationSlug: scope.organizationSlug, propertySlug: scope.propertySlug, roomId: room.id, input: { status } }, {
      onSuccess: () => toast(`Room ${room.number} marked ${roomStatusLabel[status].toLowerCase()}`),
      onError: (error) => toast(errorMessage(error, "The room could not be updated.") ?? "The room could not be updated."),
    });
    onClose();
  }

  const footer =
    room && scope.canManageRooms && actions.length ? (
      <View style={[styles.actions, actions.length > 1 && { flexDirection: "row" }]}>
        {actions.map((action, index) => (
          <View key={action.status} style={{ flex: 1 }}>
            <Button label={action.label} variant={index === 0 ? "primary" : "outline"} onPress={() => setStatus(action.status)} />
          </View>
        ))}
      </View>
    ) : null;

  const offerAssign = room?.status === "VACANT" && scope.canAssign && onAssign && waitingStays.length > 0;

  return (
    <BottomSheet open={roomId !== null} onClose={onClose} title={room ? `Room ${room.number}` : "Room"} footer={footer}>
      {room ? (
        <View style={styles.stack}>
          {roomPhotoUrl(photos, room.roomType) ? <PhotoTile uri={roomPhotoUrl(photos, room.roomType)} /> : null}
          <View style={{ gap: 4 }}>
            <Text style={styles.name}>{room.roomType || `Room ${room.number}`}</Text>
            <Text style={styles.hint}>
              {[room.floor ? `Floor ${room.floor}` : null, room.nightlyRateMinor !== null ? `${formatMoneyWholeRupees(room.nightlyRateMinor)} a night` : "No nightly rate"].filter(Boolean).join(" · ")}
            </Text>
            <StatusPill tone={roomStatusTone[room.status]}>{roomStatusLabel[room.status]}</StatusPill>
          </View>
          {room && scope.canManageRooms ? <RoomRateEditor key={room.id} scope={scope} room={room} /> : null}
          {offerAssign ? (
            <View style={{ gap: space.sm }}>
              <Text style={styles.label}>
                Waiting for a room <Text style={styles.hint}>({waitingStays.length})</Text>
              </Text>
              {waitingStays.map((stay) => (
                <Pressable key={stay.id} accessibilityRole="button" onPress={() => onAssign(stay.id, room.id)} style={styles.choice}>
                  <InitialsAvatar initials={initialsOf(stay.guestName)} name={stay.guestName} size={40} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.rowTitle}>{stay.guestName}</Text>
                    <Text style={styles.hint}>
                      {partyLabel(stay)} · submitted {formatTime(stay.submittedAt)}
                    </Text>
                  </View>
                  <Text style={styles.assign}>Assign</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </BottomSheet>
  );
}

/** Rupees with two decimals from paise, e.g. 250050 -> "2500.50". */
function rupeesText(minor: number) {
  return `${Math.floor(minor / 100)}.${String(minor % 100).padStart(2, "0")}`;
}

function RoomRateEditor({ scope, room }: { scope: DeskScope; room: HotelRoom }) {
  const queryClient = useQueryClient();
  const updateRate = useMutation(hotelMutations.updateRoomRate(queryClient));
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);

  function open() {
    setValue(room.nightlyRateMinor !== null ? rupeesText(room.nightlyRateMinor) : "");
    setFieldError(null);
    updateRate.reset();
    setEditing(true);
  }

  function save() {
    const trimmed = value.trim();
    let nightlyRateMinor: number | null = null;
    if (trimmed) {
      nightlyRateMinor = parseMoneyMinor(trimmed);
      if (nightlyRateMinor === null) {
        setFieldError("Enter an amount in rupees");
        return;
      }
    }
    setFieldError(null);
    updateRate.mutate(
      { organizationSlug: scope.organizationSlug, propertySlug: scope.propertySlug, roomId: room.id, input: { nightlyRateMinor } },
      {
        onSuccess: () => {
          toast(`Rate saved for room ${room.number}`);
          setEditing(false);
        },
      },
    );
  }

  if (!editing) return <TextLink label="Edit rate" onPress={open} />;

  return (
    <View style={{ gap: space.md }}>
      <TextField
        label="Nightly rate (INR)"
        inputMode="decimal"
        placeholder="2500.00"
        value={value}
        onChangeText={(text) => {
          setValue(text);
          setFieldError(null);
        }}
        error={fieldError ?? undefined}
        autoFocus
      />
      <ErrorLine message={errorMessage(updateRate.error, "The rate could not be saved.")} />
      <View style={styles.rateActions}>
        <View style={{ flex: 1 }}>
          <Button label="Save" onPress={save} loading={updateRate.isPending} />
        </View>
        <View style={{ flex: 1 }}>
          <Button label="Cancel" variant="ghost" onPress={() => setEditing(false)} disabled={updateRate.isPending} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rateActions: { flexDirection: "row", gap: space.sm },
  scroll: { maxHeight: 520 },
  stack: { gap: space.xl, paddingTop: space.sm },
  identity: { flexDirection: "row", alignItems: "center", gap: space.lg },
  name: { ...type.cardTitle, color: colors.foreground },
  hint: { ...type.meta, color: colors.mutedForeground },
  status: { ...type.meta, fontFamily: type.rowTitle.fontFamily, marginTop: 2 },
  label: { ...type.rowTitle, color: colors.foreground },
  rowTitle: { ...type.rowTitle, color: colors.foreground },
  between: { flexDirection: "row", justifyContent: "space-between", gap: space.sm },
  stepper: { flexDirection: "row", alignItems: "center", gap: space.md },
  step: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  stepValue: { ...type.button, color: colors.foreground, width: 28, textAlign: "center", fontVariant: ["tabular-nums"] },
  choice: { flexDirection: "row", alignItems: "center", gap: space.md, padding: space.sm, paddingRight: space.md, borderWidth: 1, borderColor: colors.border, borderRadius: radii.card },
  choiceSelected: { borderColor: colors.foreground, borderWidth: 2, padding: space.sm - 1, paddingRight: space.md - 1 },
  choicePhoto: { width: 64 },
  quiet: { ...type.meta, color: colors.mutedForeground, backgroundColor: colors.muted, padding: space.lg, borderRadius: radii.card },
  warn: { ...type.meta, color: colors.destructive },
  facts: { flexDirection: "row", flexWrap: "wrap", rowGap: space.lg, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.borderSoft, paddingVertical: space.xl },
  fact: { width: "50%", gap: 2 },
  factLabel: { ...type.label, color: colors.subtleForeground },
  factValue: { ...type.rowTitle, color: colors.foreground, fontVariant: ["tabular-nums"] },
  idLine: { flexDirection: "row", alignItems: "center", gap: space.sm },
  error: { ...type.meta, color: colors.destructive, backgroundColor: colors.destructiveTint, paddingHorizontal: space.lg, paddingVertical: space.md, borderRadius: radii.control },
  actions: { gap: space.sm },
  assign: { ...type.buttonSm, color: colors.foreground, textDecorationLine: "underline" },
});
