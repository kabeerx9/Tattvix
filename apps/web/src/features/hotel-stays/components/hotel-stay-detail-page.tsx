import type {
  HotelRoom,
  HotelStayDetail,
  IdentityDocumentImageAccessResponse,
  IdentityDocumentImageSide,
} from "@tattvix/contracts";
import { Button } from "@tattvix/ui/components/button";
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
  useMutation,
  useQueries,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import {
  ArrowLeft,
  BedDouble,
  CircleCheck,
  Clock3,
  FileKey2,
  ImageIcon,
  LogOut,
  Printer,
  RefreshCw,
  ShieldCheck,
  ShieldOff,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { toast } from "sonner";

import { EmptyState, PageHeader, Surface } from "@/components/design-system";
import { hotelOperationsMutations } from "@/features/hotel-operations/mutations";
import { hotelOperationsQueries } from "@/features/hotel-operations/queries";
import { hotelStayQueries } from "@/features/hotel-stays/queries";
import { ApiError } from "@/lib/api";

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
  canCheckout,
}: {
  organizationSlug: string;
  propertySlug: string;
  propertyName: string;
  stayId: string;
  canAssign: boolean;
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
  const imageQueries = useQueries({
    queries:
      stay.snapshot?.images.map(({ side }) =>
        hotelStayQueries.imageAccess(
          organizationSlug,
          propertySlug,
          stayId,
          side,
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

  function confirmCheckIn() {
    if (!selectedRoomId) return;
    checkInMutation.mutate(
      {
        organizationSlug,
        propertySlug,
        stayId,
        roomId: selectedRoomId,
      },
      {
        onSuccess: () =>
          toast.success("Check-in confirmed and room marked occupied"),
      },
    );
  }

  function completeCheckout() {
    if (
      !window.confirm(
        `Check out ${stay.guestName}? Room ${stay.room?.number ?? ""} will move to cleaning.`,
      )
    ) {
      return;
    }
    checkoutMutation.mutate(
      { organizationSlug, propertySlug, stayId },
      {
        onSuccess: () =>
          toast.success("Checkout complete; the room now needs cleaning"),
      },
    );
  }

  const mutationError = checkInMutation.error ?? checkoutMutation.error;
  const error =
    mutationError instanceof ApiError
      ? mutationError.message
      : mutationError
        ? "The stay could not be updated."
        : null;

  return (
    <div className="mx-auto grid max-w-[1400px] gap-7">
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

      <div ref={printContentRef} className="stay-print-root grid gap-7">
        <PageHeader
          eyebrow={`${propertyName} · Submitted identity package`}
          title={stay.guestName}
          description={accessDescription(stay)}
          action={
            stay.snapshot ? (
              <div className="stay-print-actions flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  disabled={!canPrint}
                  onClick={() => printStay()}
                  title={
                    imagesUnavailable
                      ? "Retry unavailable document images before printing"
                      : undefined
                  }
                >
                  <Printer />
                  {imagesPreparing ? "Preparing images..." : "Print stay"}
                </Button>
              </div>
            ) : undefined
          }
        />

        {error ? (
          <p
            role="alert"
            className="stay-print-screen-only rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}

        <OperationalStayPanel
          stay={stay}
          rooms={roomData.rooms}
          canAssign={canAssign}
          canCheckout={canCheckout}
          selectedRoomId={selectedRoomId}
          onRoomChange={setSelectedRoomId}
          onCheckIn={confirmCheckIn}
          onCheckout={completeCheckout}
          isCheckingIn={checkInMutation.isPending}
          isCheckingOut={checkoutMutation.isPending}
        />

        {stay.snapshot ? (
          <div className="stay-print-layout grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="grid gap-5">
              <GuestIdentity stay={stay} />
              <DocumentIdentity
                stay={stay}
                imageQueries={imageQueries}
              />
            </div>
            <div className="grid h-fit gap-5">
              <CompanionIdentity stay={stay} />
              <AccessPolicy stay={stay} />
            </div>
          </div>
        ) : (
          <ExpiredIdentity stay={stay} />
        )}
      </div>
    </div>
  );
}

function OperationalStayPanel({
  stay,
  rooms,
  canAssign,
  canCheckout,
  selectedRoomId,
  onRoomChange,
  onCheckIn,
  onCheckout,
  isCheckingIn,
  isCheckingOut,
}: {
  stay: HotelStayDetail;
  rooms: HotelRoom[];
  canAssign: boolean;
  canCheckout: boolean;
  selectedRoomId: number | null;
  onRoomChange: (roomId: number | null) => void;
  onCheckIn: () => void;
  onCheckout: () => void;
  isCheckingIn: boolean;
  isCheckingOut: boolean;
}) {
  const vacantRooms = rooms.filter((room) => room.status === "VACANT");

  if (stay.operationalStatus === "CHECKED_IN") {
    return (
      <Surface className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
            <BedDouble className="size-5" />
          </span>
          <div>
            <p className="app-kicker">Currently checked in</p>
            <h2 className="mt-1 text-lg font-semibold">
              Room {stay.room?.number ?? "—"}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Confirmed{" "}
              {stay.checkedInAt ? formatDateTime(stay.checkedInAt) : "—"}
            </p>
          </div>
        </div>
        {canCheckout ? (
          <Button
            variant="outline"
            disabled={isCheckingOut}
            onClick={onCheckout}
          >
            <LogOut />
            {isCheckingOut ? "Checking out..." : "Complete checkout"}
          </Button>
        ) : null}
      </Surface>
    );
  }

  if (stay.operationalStatus === "CHECKED_OUT") {
    return (
      <Surface className="flex items-start gap-3 p-5 sm:p-6">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-muted">
          <CircleCheck className="size-5" />
        </span>
        <div>
          <p className="app-kicker">Stay completed</p>
          <h2 className="mt-1 text-lg font-semibold">
            Checked out from room {stay.room?.number ?? "—"}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {stay.checkedOutAt
              ? formatDateTime(stay.checkedOutAt)
              : "Checkout time unavailable"}
            . The room moved to cleaning and this stay is now in guest
            history.
          </p>
        </div>
      </Surface>
    );
  }

  return (
    <Surface className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,420px)] lg:items-end sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-muted">
          <BedDouble className="size-5" />
        </span>
        <div>
          <p className="app-kicker">Pending reception check-in</p>
          <h2 className="mt-1 text-lg font-semibold">
            Review identity, then assign a vacant room
          </h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">
            Submitting identity does not make someone a current guest. This
            confirmation creates the operational stay and occupies the room.
          </p>
        </div>
      </div>
      {canAssign ? (
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <Select
            value={selectedRoomId ? String(selectedRoomId) : ""}
            onValueChange={(value) =>
              onRoomChange(value ? Number(value) : null)
            }
          >
            <SelectTrigger aria-label="Room assignment">
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
          <Button
            disabled={
              !selectedRoomId ||
              !vacantRooms.length ||
              isCheckingIn ||
              !stay.identityAccess.isActive
            }
            onClick={onCheckIn}
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
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Your role can review this stay but cannot assign rooms.
        </p>
      )}
    </Surface>
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
    <Surface className="p-6">
      <SectionHeading
        icon={UserRound}
        title="Primary guest"
        description="Snapshot approved when the guest submitted this stay."
      />
      <div className="mt-6 grid gap-x-6 gap-y-5 sm:grid-cols-2">
        <Detail label="Legal name" value={`${guest.legalFirstName} ${guest.legalLastName}`} />
        <Detail label="Phone number" value={guest.phoneNumber} />
        <Detail label="Date of birth" value={formatDate(guest.dateOfBirth)} />
        <Detail label="Nationality" value={guest.nationality} />
        <Detail className="sm:col-span-2" label="Address" value={address} />
        {guest.emergencyContactName || guest.emergencyContactPhone ? (
          <Detail
            className="sm:col-span-2"
            label="Emergency contact"
            value={[guest.emergencyContactName, guest.emergencyContactPhone]
              .filter(Boolean)
              .join(" · ")}
          />
        ) : null}
      </div>
    </Surface>
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

  return (
    <Surface className="p-6">
      <SectionHeading
        icon={FileKey2}
        title="Government identity"
        description="The guest-selected document is shown here in full. Loading each image is property-scoped and added to the access audit."
      />
      <div className="mt-6 grid gap-x-6 gap-y-5 sm:grid-cols-2">
        <Detail label="Document type" value={documentTypeLabel(document.documentType)} />
        <Detail label="Document number" value={document.documentNumber} />
        <Detail label="Name on document" value={document.nameOnDocument} />
        <Detail label="Issuing country" value={document.issuingCountry} />
        {document.expiryDate ? (
          <Detail label="Expiry date" value={formatDate(document.expiryDate)} />
        ) : null}
      </div>
      <div className="mt-6 border-t pt-6">
        <div className="mb-4 flex items-center gap-2">
          <ImageIcon className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Shared document images</h3>
        </div>
        {snapshot.images.length ? (
          <div className="stay-print-image-grid grid gap-4 lg:grid-cols-2">
            {snapshot.images.map(({ side }, index) => (
              <DocumentImage
                key={side}
                side={side}
                query={imageQueries[index]}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-xl bg-muted/60 p-4 text-sm text-muted-foreground">
            No document images were included in this identity package.
          </p>
        )}
        <p className="stay-print-screen-only mt-4 text-xs leading-5 text-muted-foreground">
          These private links expire automatically. The already loaded preview
          remains on this review screen, but the URL cannot be reused after it
          expires.
        </p>
      </div>
    </Surface>
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
    <div className="stay-print-image overflow-hidden rounded-2xl border bg-muted/30">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <p className="text-sm font-medium">{label}</p>
        <span className="text-xs text-muted-foreground">Private</span>
      </div>
      {query?.data ? (
        <div className="grid min-h-56 place-items-center bg-background/60 p-3">
          <img
            src={query.data.url}
            alt={`${label} of the guest-selected identity document`}
            className="max-h-[520px] w-full rounded-xl object-contain"
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

function CompanionIdentity({ stay }: { stay: HotelStayDetail }) {
  const companions = stay.snapshot!.companions;
  return (
    <Surface className="p-6">
      <SectionHeading
        icon={UsersRound}
        title="Companions"
        description={`${companions.length} selected for this stay.`}
      />
      {companions.length ? (
        <div className="mt-5 grid gap-3">
          {companions.map((companion, index) => (
            <div key={`${companion.legalFirstName}-${index}`} className="rounded-xl bg-muted/60 p-4">
              <p className="text-sm font-semibold">
                {companion.legalFirstName} {companion.legalLastName}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {companion.relationship} · {formatDate(companion.dateOfBirth)} ·{" "}
                {companion.nationality}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-5 text-sm text-muted-foreground">
          The guest did not share any companions.
        </p>
      )}
    </Surface>
  );
}

function AccessPolicy({ stay }: { stay: HotelStayDetail }) {
  return (
    <Surface className="p-6">
      <SectionHeading
        icon={ShieldCheck}
        title="Access window"
        description="Authorization is evaluated again before every private image link."
      />
      <div className="mt-5 flex items-start gap-3 rounded-xl bg-accent p-4 text-accent-foreground">
        <Clock3 className="mt-0.5 size-4 shrink-0" />
        <p className="text-xs leading-5">
          Access ends no later than{" "}
          {stay.identityAccess.expiresAt
            ? formatDateTime(stay.identityAccess.expiresAt)
            : "the configured retention boundary"}
          . Operational checkout starts the shorter identity-access wind-down
          automatically, while the non-sensitive stay remains in guest history.
        </p>
      </div>
    </Surface>
  );
}

function ExpiredIdentity({ stay }: { stay: HotelStayDetail }) {
  return (
    <Surface>
      <EmptyState
        icon={ShieldOff}
        title="Identity access is no longer available"
        description={
          stay.identityAccess.reason === "REVOKED"
            ? "The guest revoked consent. Staff cannot generate new document links or reopen the submitted identity snapshot."
            : "The authorized viewing window has ended. The stay remains listed without exposing its identity package."
        }
      />
    </Surface>
  );
}

function SectionHeading({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof UserRound;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted">
        <Icon className="size-5" />
      </span>
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
    </div>
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
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-medium">{value || "—"}</p>
    </div>
  );
}

function accessDescription(stay: HotelStayDetail) {
  if (stay.identityAccess.reason === "REVOKED") {
    return "The guest revoked consent, so the submitted identity package is no longer readable.";
  }
  if (!stay.identityAccess.isActive) {
    return "The authorized identity-viewing window for this stay has ended.";
  }
  if (stay.status === "CLOSED") {
    return "Checkout is complete. Private identity access remains available only through the shorter wind-down window.";
  }
  return "Review the immutable identity snapshot submitted for this property. Every document view is audited.";
}

function documentTypeLabel(value: string) {
  return {
    AADHAAR: "Aadhaar card",
    PASSPORT: "Passport",
    DRIVING_LICENCE: "Driving licence",
    VOTER_ID: "Voter ID",
  }[value] ?? value;
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
