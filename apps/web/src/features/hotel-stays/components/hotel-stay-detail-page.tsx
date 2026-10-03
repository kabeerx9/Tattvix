import type {
  HotelRoom,
  HotelStayDetail,
  IdentityDocumentImageAccessResponse,
  IdentityDocumentImageSide,
} from "@tattvix/contracts";
import { Button } from "@tattvix/ui/components/button";
import { Input } from "@tattvix/ui/components/input";
import { Label } from "@tattvix/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@tattvix/ui/components/select";
import { Link } from "@tanstack/react-router";
import type { UseQueryResult } from "@tanstack/react-query";
import {
  useQuery,
  useMutation,
  useQueries,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import {
  ArrowLeft,
  BedDouble,
  CircleCheck,
  FileKey2,
  LogOut,
  Printer,
  RefreshCw,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { toast } from "sonner";

import {
  ConfirmDialog,
  Fact,
  FactsRow,
  Panel,
  PanelHeader,
  PanelSection,
  StatusPill,
} from "@/components/design-system";
import { hotelOperationsMutations } from "@/features/hotel-operations/mutations";
import { hotelOperationsQueries } from "@/features/hotel-operations/queries";
import { hotelStayQueries } from "@/features/hotel-stays/queries";
import { propertyPhotoQueries } from "@/features/property-photos/queries";
import { getRoomTypePhotoUrl } from "@/features/property-photos/helpers";
import { ApiError } from "@/lib/api";
import { getInitials } from "@/lib/initials";
import { formatMoneyMinor } from "@/lib/money";

import { StayBillPanel } from "./stay-bill-panel";

const STAY_PRINT_PAGE_STYLE = `
  @page {
    size: A4 portrait;
    margin: 12mm;
  }

  @media print {
    html {
      color-scheme: light;
    }

    body {
      margin: 0;
      background: var(--background);
      color: var(--foreground);
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .stay-print-root {
      display: grid;
      width: 100%;
      max-width: none;
      gap: 16px;
    }

    .stay-print-actions,
    .stay-print-screen-only {
      display: none !important;
    }

    .stay-print-layout {
      display: grid !important;
      grid-template-columns: minmax(0, 1fr) !important;
      gap: 16px !important;
    }

    .stay-print-image-grid {
      display: grid !important;
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      gap: 12px !important;
    }

    .stay-print-image,
    .stay-print-root .app-surface {
      break-inside: avoid;
    }

    .stay-print-root .app-surface {
      box-shadow: none !important;
    }
  }
`;

export function HotelStayDetailPage({
  organizationSlug,
  propertySlug,
  propertyName,
  stayId,
  canAssign,
  canManageBill,
  canCheckout,
}: {
  organizationSlug: string;
  propertySlug: string;
  propertyName: string;
  stayId: string;
  canAssign: boolean;
  canManageBill: boolean;
  canCheckout: boolean;
}) {
  const printContentRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { data: stay } = useSuspenseQuery(
    hotelStayQueries.detail(organizationSlug, propertySlug, stayId),
  );
  const { data: roomData } = useSuspenseQuery(
    hotelOperationsQueries.rooms(organizationSlug, propertySlug),
  );
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(
    stay.room?.id ?? null,
  );
  const [nights, setNights] = useState("1");
  const [checkInConfirmOpen, setCheckInConfirmOpen] = useState(false);
  const imageQueries = useQueries({
    queries:
      (stay.snapshot
        ? [
            ...stay.snapshot.images.map((image) => ({
              ...image,
              companionId: undefined as number | undefined,
            })),
            ...stay.snapshot.companions.flatMap((companion) =>
              companion.images.map((image) => ({
                ...image,
                companionId: companion.id,
              })),
            ),
          ]
        : []
      ).map(({ side, companionId }) =>
        hotelStayQueries.imageAccess(
          organizationSlug,
          propertySlug,
          stayId,
          side,
          companionId,
        ),
      ) ?? [],
  });
  const checkInMutation = useMutation(
    hotelOperationsMutations.checkIn(queryClient),
  );
  const checkoutMutation = useMutation(
    hotelOperationsMutations.checkout(queryClient),
  );
  const imagesPreparing = imageQueries.some(
    (query) => !query.data && (query.isPending || query.isFetching),
  );
  const imagesUnavailable = imageQueries.some((query) => query.isError);
  const canPrint =
    Boolean(stay.snapshot) && !imagesPreparing && !imagesUnavailable;

  const printStay = useReactToPrint({
    contentRef: printContentRef,
    documentTitle: () =>
      `${propertyName}-${stay.guestName}-identity-review`
        .trim()
        .replaceAll(/[^a-zA-Z0-9_-]+/g, "-"),
    pageStyle: STAY_PRINT_PAGE_STYLE,
    preserveAfterPrint: false,
    printIframeProps: { referrerPolicy: "no-referrer" },
    onBeforePrint: async () => {
      if (!canPrint) {
        throw new Error("Private identity images are not ready to print.");
      }
    },
    onPrintError: () => {
      toast.error("The stay review could not be prepared for printing");
    },
  });

  const selectedRoom = roomData.rooms.find(
    (room) => room.id === selectedRoomId,
  );
  const nightCount = Number(nights);
  const validNightCount =
    Number.isInteger(nightCount) && nightCount >= 1 && nightCount <= 365;

  function confirmCheckIn() {
    if (!selectedRoomId || !validNightCount) return;
    setCheckInConfirmOpen(false);
    checkInMutation.mutate(
      {
        organizationSlug,
        propertySlug,
        stayId,
        roomId: selectedRoomId,
        nights: nightCount,
      },
      {
        onSuccess: () =>
          toast.success("Check-in confirmed and room marked occupied"),
      },
    );
  }

  const [checkoutConfirmOpen, setCheckoutConfirmOpen] = useState(false);

  function completeCheckout() {
    setCheckoutConfirmOpen(false);
    checkoutMutation.mutate(
      { organizationSlug, propertySlug, stayId },
      {
        onSuccess: () =>
          toast.success("Checkout complete; the room now needs cleaning"),
      },
    );
  }

  const { data: photos } = useQuery(propertyPhotoQueries.list(organizationSlug, propertySlug));
  const assignedRoom = roomData.rooms.find((room) => room.id === stay.room?.id);
  const roomPhotoUrl = getRoomTypePhotoUrl(photos, assignedRoom?.roomType);
  const mutationError = checkInMutation.error ?? checkoutMutation.error;
  const error =
    mutationError instanceof ApiError
      ? mutationError.message
      : mutationError
        ? "The stay could not be updated."
        : null;

  return (
    <div className="mx-auto grid max-w-[1400px] gap-6">
      <Button
        nativeButton={false}
        className="w-fit"
        variant="ghost"
        render={
          <Link
            to="/hotel/$organizationSlug/$propertySlug/stays"
            params={{ organizationSlug, propertySlug }}
          />
        }
      >
        <ArrowLeft />
        Back to stays
      </Button>

      <div ref={printContentRef} className="stay-print-root grid gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-muted text-sm font-medium">{getInitials(stay.guestName)}</span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-[22px] font-semibold">{stay.guestName}</h1>
                <StatusPill tone={stay.operationalStatus === "PENDING_CHECK_IN" ? "warning" : stay.operationalStatus === "CHECKED_IN" ? "success" : "neutral"}>
                  {stay.operationalStatus === "PENDING_CHECK_IN" ? "Waiting for a room" : stay.operationalStatus === "CHECKED_IN" ? "Checked in" : "Checked out"}
                </StatusPill>
              </div>
              <p className="mt-1 text-sm text-subtle-foreground tabular-nums">
                {[
                  stay.room ? `Room ${stay.room.number}` : null,
                  roomPhotoUrl ? null : assignedRoom?.roomType,
                  !roomPhotoUrl && assignedRoom?.floor ? `Floor ${assignedRoom.floor}` : null,
                  `${1 + stay.companionCount} ${stay.companionCount === 0 ? "guest" : "guests"}`,
                ].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>
          <div className="stay-print-actions flex flex-wrap gap-2">
            {stay.snapshot ? (
              <Button
                variant="ghost"
                disabled={!canPrint}
                onClick={() => printStay()}
                title={imagesUnavailable ? "Retry unavailable document images before printing" : undefined}
              >
                <Printer />
                {imagesPreparing ? "Preparing images..." : "Print stay"}
              </Button>
            ) : null}
            {stay.operationalStatus === "CHECKED_IN" && canCheckout ? (
              <Button disabled={checkoutMutation.isPending} onClick={() => setCheckoutConfirmOpen(true)}>
                <LogOut />
                {checkoutMutation.isPending ? "Checking out..." : "Check out"}
              </Button>
            ) : null}
          </div>
        </header>
        <FactsRow>
          <Fact label="Submitted" value={stay.submittedAt ? formatDateTime(stay.submittedAt) : "—"} />
          {stay.checkedInAt ? <Fact label="Checked in" value={formatDateTime(stay.checkedInAt)} /> : null}
          {stay.expectedCheckOutDate && stay.operationalStatus !== "CHECKED_OUT" ? <Fact label="Due out" value={formatDate(stay.expectedCheckOutDate)} /> : null}
          {stay.checkedOutAt ? <Fact label="Checked out" value={formatDateTime(stay.checkedOutAt)} /> : null}
        </FactsRow>

        {error ? (
          <p
            role="alert"
            className="stay-print-screen-only rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}

        <div className="stay-print-layout grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="grid h-fit gap-6">
            {roomPhotoUrl && assignedRoom ? <div className="grid gap-2">
              <img src={roomPhotoUrl} alt={assignedRoom.roomType} className="aspect-[16/7] w-full rounded-lg object-cover" />
              <p className="text-[13px] text-muted-foreground tabular-nums">{[
                assignedRoom.roomType || null,
                assignedRoom.floor ? `Floor ${assignedRoom.floor}` : null,
                assignedRoom.nightlyRateMinor !== null ? `${formatMoneyMinor(assignedRoom.nightlyRateMinor)}/night` : null,
              ].filter(Boolean).join(" · ")}</p>
            </div> : null}
            {stay.operationalStatus !== "CHECKED_IN" ? (
              <OperationalStayPanel
                stay={stay}
                rooms={roomData.rooms}
                canAssign={canAssign}
                selectedRoomId={selectedRoomId}
                onRoomChange={setSelectedRoomId}
                nights={nights}
                onNightsChange={setNights}
                onRequestCheckIn={() => setCheckInConfirmOpen(true)}
                isCheckingIn={checkInMutation.isPending}
              />
            ) : null}
            {/* No room, no nights, no charges yet: a bill only exists from check-in. */}
            {stay.operationalStatus !== "PENDING_CHECK_IN" ? (
              <StayBillPanel
                organizationSlug={organizationSlug}
                propertySlug={propertySlug}
                stayId={stayId}
                stay={stay}
                canManage={canManageBill}
              />
            ) : null}
          </div>
          <Panel className="h-fit">
            {stay.snapshot ? (
              <>
                <GuestIdentity stay={stay} />
                <DocumentIdentity stay={stay} imageQueries={imageQueries} />
                <CompanionIdentity stay={stay} imageQueries={imageQueries.slice(stay.snapshot.images.length)} />
              </>
            ) : <ExpiredIdentity stay={stay} />}
          </Panel>
        </div>
      </div>
        <ConfirmDialog
          open={checkInConfirmOpen}
          onOpenChange={setCheckInConfirmOpen}
          title={`Check in ${stay.guestName}?`}
          description={
            selectedRoom &&
            validNightCount &&
            selectedRoom.nightlyRateMinor !== null
              ? `Assign room ${selectedRoom.number} for ${nightCount} ${nightCount === 1 ? "night" : "nights"}. Room charge: ${formatMoneyMinor(selectedRoom.nightlyRateMinor * nightCount)}.`
              : "Choose an active vacant room with a nightly rate, then enter 1 to 365 nights before confirming."
          }
          confirmLabel="Confirm check-in"
          onConfirm={confirmCheckIn}
          pending={checkInMutation.isPending}
        />
        <ConfirmDialog
          open={checkoutConfirmOpen}
          onOpenChange={setCheckoutConfirmOpen}
          title={`Check out ${stay.guestName}?`}
          description={`Room ${stay.room?.number ?? "—"} will move to cleaning, and the hotel's identity access starts its shorter wind-down window.`}
          confirmLabel="Check out"
          onConfirm={completeCheckout}
          pending={checkoutMutation.isPending}
        />
    </div>
  );
}

function OperationalStayPanel({
  stay,
  rooms,
  canAssign,
  selectedRoomId,
  onRoomChange,
  nights,
  onNightsChange,
  onRequestCheckIn,
  isCheckingIn,
}: {
  stay: HotelStayDetail;
  rooms: HotelRoom[];
  canAssign: boolean;
  selectedRoomId: number | null;
  onRoomChange: (roomId: number | null) => void;
  nights: string;
  onNightsChange: (nights: string) => void;
  onRequestCheckIn: () => void;
  isCheckingIn: boolean;
}) {
  const vacantRooms = rooms.filter(
    (room) => room.status === "VACANT" && room.isActive,
  );
  const selectedRoom = rooms.find((room) => room.id === selectedRoomId);
  const nightCount = Number(nights);
  const validNightCount =
    Number.isInteger(nightCount) && nightCount >= 1 && nightCount <= 365;
  const hasRate =
    selectedRoom?.nightlyRateMinor !== null &&
    selectedRoom?.nightlyRateMinor !== undefined;

  // The "Checked out" pill and fact already say this; no extra panel.
  if (stay.operationalStatus === "CHECKED_OUT") return null;

  return (
    <Panel className="app-surface">
      <PanelHeader title="Assign a room" icon={BedDouble} />
      <PanelSection>
      {canAssign ? (
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_100px] sm:items-end">
          <div className="grid gap-2">
          <Label htmlFor="stay-room">Room</Label>
          <Select
            value={selectedRoomId ? String(selectedRoomId) : ""}
            onValueChange={(value) =>
              onRoomChange(value ? Number(value) : null)
            }
          >
            <SelectTrigger id="stay-room" aria-label="Room assignment">
              <SelectValue placeholder="Choose a vacant room" />
            </SelectTrigger>
            <SelectContent>
              {vacantRooms.map((room) => (
                <SelectItem key={room.id} value={String(room.id)}>
                  Room {room.number}
                  {room.roomType ? ` · ${room.roomType}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="stay-nights">Nights</Label>
            <Input
              id="stay-nights"
              required
              type="number"
              min="1"
              max="365"
              value={nights}
              onChange={(event) => onNightsChange(event.target.value)}
              aria-invalid={Boolean(nights) && !validNightCount}
            />
          </div>
          <Button
            disabled={
              !selectedRoomId ||
              !vacantRooms.length ||
              isCheckingIn ||
              !stay.identityAccess.isActive ||
              !validNightCount ||
              !hasRate
            }
            onClick={onRequestCheckIn}
          >
            <CircleCheck />
            {isCheckingIn ? "Confirming..." : "Confirm check-in"}
          </Button>
          {!vacantRooms.length ? (
            <p className="text-xs text-muted-foreground sm:col-span-2">
              No vacant rooms are available. Add a room or finish cleaning one
              first.
            </p>
          ) : null}
          {selectedRoom && !hasRate ? (
            <p className="text-xs text-destructive sm:col-span-2">
              Set a nightly rate for room {selectedRoom.number} before check-in.
            </p>
          ) : null}
          {!validNightCount ? (
            <p className="text-xs text-destructive sm:col-span-2">
              Enter a stay length from 1 to 365 nights.
            </p>
          ) : null}
          {selectedRoom && hasRate && validNightCount ? (
            <p className="text-xs text-muted-foreground sm:col-span-2">
              Room charge preview:{" "}
              {formatMoneyMinor(selectedRoom.nightlyRateMinor! * nightCount)}{" "}
              for {nightCount} {nightCount === 1 ? "night" : "nights"}.
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Your role can review this stay but cannot assign rooms.
        </p>
      )}
      </PanelSection>
    </Panel>
  );
}

function GuestIdentity({ stay }: { stay: HotelStayDetail }) {
  const guest = stay.snapshot!.guest;
  const address = [
    guest.addressLine1,
    guest.addressLine2,
    guest.city,
    guest.stateRegion,
    guest.postalCode,
    guest.country,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <PanelSection className="app-surface rounded-none border-0 shadow-none">
      <h2 className="flex items-center gap-2 text-sm font-semibold"><UserRound className="size-4 text-muted-foreground" />Guest</h2>
      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4">
        <Detail label="Phone" value={guest.phoneNumber} />
        <Detail label="Date of birth" value={formatDate(guest.dateOfBirth)} />
        <Detail label="Nationality" value={guest.nationality} />
        <Detail className="col-span-2" label="Address" value={address} />
      </div>
    </PanelSection>
  );
}

function DocumentIdentity({
  stay,
  imageQueries,
}: {
  stay: HotelStayDetail;
  imageQueries: ImageAccessQuery[];
}) {
  const snapshot = stay.snapshot!;
  const document = snapshot.document;

  const [imagesVisible, setImagesVisible] = useState(false);

  return (
    <PanelSection className="app-surface rounded-none border-0 shadow-none">
      <h2 className="flex items-center gap-2 text-sm font-semibold"><FileKey2 className="size-4 text-muted-foreground" />Identity</h2>
      <p className="mt-4 text-sm">{documentTypeLabel(document.documentType)} · {document.documentNumber}</p>
      <p className="mt-1 text-xs text-subtle-foreground">Issued by {document.issuingCountry}{document.expiryDate ? ` · expires ${formatDate(document.expiryDate)}` : ""}</p>
      <Button className="stay-print-screen-only mt-2 px-0 text-primary" variant="ghost" size="sm" aria-expanded={imagesVisible} onClick={() => setImagesVisible((visible) => !visible)}>
        {imagesVisible ? "Hide images" : "View images"}
      </Button>
      {snapshot.images.length ? (
        <div className={`stay-print-image-grid mt-4 gap-4 lg:grid-cols-2 ${imagesVisible ? "grid" : "hidden"}`}>
          {snapshot.images.map(({ side }, index) => (
            <DocumentImage key={side} side={side} query={imageQueries[index]} />
          ))}
        </div>
      ) : <p className="mt-2 text-xs text-subtle-foreground">No document images were included in this identity package.</p>}
      {stay.identityAccess.expiresAt ? (
        <p className="stay-print-screen-only mt-3 text-xs text-subtle-foreground">
          ID access ends {formatDateTime(stay.identityAccess.expiresAt)}
        </p>
      ) : null}
    </PanelSection>
  );
}

function DocumentImage({
  side,
  query,
}: {
  side: IdentityDocumentImageSide;
  query: ImageAccessQuery | undefined;
}) {
  const label = side === "FRONT" ? "Front" : "Back";

  return (
    <div className="stay-print-image overflow-hidden rounded-md bg-muted/30">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <p className="text-sm font-medium">{label}</p>
        <span className="text-xs text-muted-foreground">Private</span>
      </div>
      {query?.data ? (
        <div className="grid min-h-56 place-items-center bg-background/60 p-3">
          <img
            src={query.data.url}
            alt={`${label} of the guest-selected identity document`}
            className="max-h-[520px] w-full rounded-md object-contain"
          />
        </div>
      ) : query?.isError ? (
        <div className="grid min-h-56 place-items-center gap-3 p-6 text-center">
          <div>
            <p className="text-sm font-medium">Image could not be loaded</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Access may have expired, or private storage may be unavailable.
            </p>
          </div>
          <Button
            className="stay-print-screen-only"
            size="sm"
            variant="outline"
            disabled={query.isFetching}
            onClick={() => query.refetch()}
          >
            <RefreshCw />
            {query.isFetching ? "Retrying..." : "Retry"}
          </Button>
        </div>
      ) : (
        <div
          aria-label={`Loading ${label.toLowerCase()} document image`}
          className="grid min-h-56 place-items-center bg-muted/40"
        >
          <div className="grid gap-3 text-center">
            <span className="mx-auto size-10 animate-pulse rounded-xl bg-muted" />
            <p className="text-xs text-muted-foreground">
              Loading secure image...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

type ImageAccessQuery = Pick<
  UseQueryResult<IdentityDocumentImageAccessResponse>,
  "data" | "isPending" | "isError" | "isFetching" | "refetch"
>;

function CompanionIdentity({
  stay,
  imageQueries,
}: {
  stay: HotelStayDetail;
  imageQueries: ImageAccessQuery[];
}) {
  const companions = stay.snapshot!.companions;
  const [imagesVisible, setImagesVisible] = useState(false);
  return (
    <PanelSection className="app-surface rounded-none border-0 shadow-none">
      <h2 className="flex items-center gap-2 text-sm font-semibold"><UsersRound className="size-4 text-muted-foreground" />Companions <span className="font-normal text-subtle-foreground tabular-nums">{companions.length}</span></h2>
      {companions.length ? (
        <div className="mt-4 grid gap-4">
          {companions.map((companion, index) => (
            <div key={`${companion.legalFirstName}-${index}`}>
              <p className="text-sm"><span className="font-medium">{companion.legalFirstName} {companion.legalLastName}</span> <span className="text-xs text-subtle-foreground">· {companion.relationship} · {formatDate(companion.dateOfBirth)}</span></p>
              {companion.document ? (
                <>
                  <p className="mt-1 text-xs text-subtle-foreground">{documentTypeLabel(companion.document.documentType)} · {companion.document.documentNumber}</p>
                  <div className={`stay-print-image-grid mt-3 gap-4 lg:grid-cols-2 ${imagesVisible ? "grid" : "hidden"}`}>
                    {companion.images.map(({ side }, imageIndex) => (
                      <DocumentImage key={side} side={side} query={imageQueries[companions.slice(0, index).reduce((total, item) => total + item.images.length, 0) + imageIndex]} />
                    ))}
                  </div>
                </>
              ) : <p className="mt-1 text-xs text-subtle-foreground">No companion ID shared.</p>}
            </div>
          ))}
          {companions.some((companion) => companion.images.length > 0) ? (
            <Button className="stay-print-screen-only w-fit px-0 text-primary" variant="ghost" size="sm" aria-expanded={imagesVisible} onClick={() => setImagesVisible((visible) => !visible)}>{imagesVisible ? "Hide images" : "View images"}</Button>
          ) : null}
        </div>
      ) : <p className="mt-4 text-sm text-muted-foreground">The guest did not share any companions.</p>}
    </PanelSection>
  );
}

function ExpiredIdentity({ stay }: { stay: HotelStayDetail }) {
  return (
    <PanelSection className="app-surface rounded-none border-0 shadow-none">
      <h2 className="text-sm font-semibold">Identity</h2>
      <p className="mt-3 text-sm text-muted-foreground">{stay.identityAccess.reason === "REVOKED" ? "The guest revoked identity access." : "Identity access has ended."}</p>
    </PanelSection>
  );
}

function Detail({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs text-subtle-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-medium">{value || "—"}</p>
    </div>
  );
}

function documentTypeLabel(value: string) {
  return (
    {
      AADHAAR: "Aadhaar card",
      PASSPORT: "Passport",
      DRIVING_LICENCE: "Driving licence",
      VOTER_ID: "Voter ID",
    }[value] ?? value
  );
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(`${value}T00:00:00`),
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
