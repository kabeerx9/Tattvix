import type {
  HotelStayDetail,
  IdentityDocumentImageAccessResponse,
  IdentityDocumentImageSide,
} from "@tattvix/contracts";
import { Button } from "@tattvix/ui/components/button";
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
  Clock3,
  FileKey2,
  ImageIcon,
  Printer,
  RefreshCw,
  ShieldCheck,
  ShieldOff,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { toast } from "sonner";

import { PageHeader, Surface } from "@/components/design-system";
import { hotelStayMutations } from "@/features/hotel-stays/mutations";
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
  canClose,
}: {
  organizationSlug: string;
  propertySlug: string;
  propertyName: string;
  stayId: string;
  canClose: boolean;
}) {
  const printContentRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { data: stay } = useSuspenseQuery(
    hotelStayQueries.detail(organizationSlug, propertySlug, stayId),
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
  const finishReviewMutation = useMutation(
    hotelStayMutations.close(queryClient),
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

  function finishIdentityReview() {
    finishReviewMutation.mutate(
      { organizationSlug, propertySlug, stayId },
      {
        onSuccess: () =>
          toast.success(
            "Identity review finished; the 24-hour access wind-down started",
          ),
      },
    );
  }

  const error =
    finishReviewMutation.error instanceof ApiError
      ? finishReviewMutation.error.message
      : finishReviewMutation.isError
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
                {canClose && stay.status === "SUBMITTED" ? (
                  <Button
                    variant="outline"
                    disabled={finishReviewMutation.isPending}
                    onClick={finishIdentityReview}
                  >
                    {finishReviewMutation.isPending
                      ? "Finishing..."
                      : "Finish identity review"}
                  </Button>
                ) : null}
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
          . Finishing the identity review starts the shorter access wind-down
          period. A future operational checkout will trigger this automatically.
        </p>
      </div>
    </Surface>
  );
}

function ExpiredIdentity({ stay }: { stay: HotelStayDetail }) {
  return (
    <Surface className="grid place-items-center gap-4 p-8 text-center sm:p-12">
      <span className="grid size-12 place-items-center rounded-xl bg-muted">
        <ShieldOff className="size-6" />
      </span>
      <div className="max-w-lg">
        <h2 className="text-lg font-semibold">Identity access is no longer available</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {stay.identityAccess.reason === "REVOKED"
            ? "The guest revoked consent. Staff cannot generate new document links or reopen the submitted identity snapshot."
            : "The authorized viewing window has ended. The stay remains listed without exposing its identity package."}
        </p>
      </div>
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
    return "Identity review is complete. Private access remains available only through the shorter wind-down window.";
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
