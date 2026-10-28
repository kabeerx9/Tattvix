// A stay: status and facts, the one action it allows, and the identity the
// guest shared. Document images are fetched only while shown and never cached
// to disk (expo-image cachePolicy "none"): this is a shared desk phone.
import { countryName, describeHotelIdentityAccess, formatMoneyWholeRupees, getStayKeyCard, localDayKey } from "@tattvix/api";
import type { HotelStayDetail, IdentityDocumentImageSide } from "@tattvix/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { BillSection } from "@/src/components/bill-section";
import { StaySheet } from "@/src/components/desk-sheets";
import { StayKeyCard } from "@/src/components/stay-key-card";
import { PendingScreen, RetryScreen } from "@/src/components/status-screens";
import { Button, Card, ConfirmSheet, FactRow, GroupTitle, Panel, Screen, SecondaryHeader, Spinner, TextLink, colors, radii, space, toast, type } from "@/src/design-system";
import { queries } from "@/src/lib/api";
import { getManageScope } from "@/src/lib/desk-scope";
import { documentTypeLabel, errorMessage, formatDate, formatDateTime, initialsOf, partyLabel } from "@/src/lib/format";
import { hotelMutations } from "@/src/lib/hotel-mutations";
import { useHotelPlace } from "@/src/lib/hotel-place";


export default function StayDetailScreen() {
  const place = useHotelPlace();
  const scope = getManageScope(place);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { stayId } = useLocalSearchParams<{ stayId: string }>();
  const { organizationSlug, propertySlug } = scope;
  const stayQuery = useQuery(queries.hotelStays.detail(organizationSlug, propertySlug, stayId));
  const roomQuery = useQuery(queries.hotelOperations.rooms(organizationSlug, propertySlug));
  const checkout = useMutation(hotelMutations.checkout(queryClient));
  const [assigning, setAssigning] = useState(false);
  const [confirmCheckout, setConfirmCheckout] = useState(false);

  if (!stayQuery.data) {
    if (stayQuery.isError) return <RetryScreen error={stayQuery.error} onRetry={() => void stayQuery.refetch()} retrying={stayQuery.isFetching} />;
    return <PendingScreen />;
  }

  const stay = stayQuery.data;
  const rooms = roomQuery.data?.rooms ?? [];
  const room = stay.room ? rooms.find((entry) => entry.id === stay.room!.id) : undefined;
  const todayKey = localDayKey(new Date());
  const waiting = stay.operationalStatus === "PENDING_CHECK_IN";
  const inHouse = stay.operationalStatus === "CHECKED_IN";

  function runCheckout() {
    checkout.mutate(
      { organizationSlug, propertySlug, stayId: stay.id },
      {
        onSuccess: () => {
          setConfirmCheckout(false);
          toast(`${stay.guestName} checked out${room ? `, room ${room.number} needs cleaning` : ""}`);
        },
        onError: (error) => {
          setConfirmCheckout(false);
          toast(errorMessage(error, "The guest could not be checked out.") ?? "The guest could not be checked out.");
        },
      },
    );
  }

  return (
    <Screen refreshing={stayQuery.isFetching && !stayQuery.isPending} onRefresh={() => void stayQuery.refetch()}>
      <SecondaryHeader title="Stay" onBack={() => router.back()} />

      <StayKeyCard
        card={getStayKeyCard(stay, todayKey)}
        roomNumber={stay.room?.number ?? null}
        roomDetail={[room?.roomType || null, room?.floor ? `Floor ${room.floor}` : null, room?.nightlyRateMinor != null ? `${formatMoneyWholeRupees(room.nightlyRateMinor)} a night` : null].filter(Boolean).join(" · ") || null}
        guestName={stay.guestName}
        initials={initialsOf(stay.guestName)}
        party={companionLine(stay)}
        checkedIn={stay.checkedInAt ? `Checked in ${formatDateTime(stay.checkedInAt)}` : stay.submittedAt ? `Checked in on phone ${formatDateTime(stay.submittedAt)}` : null}
      />

      {waiting && scope.canAssign ? (
        <View style={styles.action}>
          <Button label="Assign room" onPress={() => setAssigning(true)} disabled={!roomQuery.data} />
        </View>
      ) : waiting && scope.readOnly ? (
        <View style={styles.action}>
          <Button label="Check-ins paused · trial ended" onPress={() => {}} disabled />
        </View>
      ) : inHouse && scope.canCheckout ? (
        <View style={styles.action}>
          <Button label="Check out" variant="outline" onPress={() => setConfirmCheckout(true)} />
        </View>
      ) : null}

      <Identity stay={stay} scope={scope} />

      <BillSection scope={scope} stayId={stayId} stay={stay} />

      <StaySheet scope={scope} stayId={assigning ? stay.id : null} stays={[stay]} rooms={rooms} showOpenLink={false} onClose={() => setAssigning(false)} />
      <ConfirmSheet
        open={confirmCheckout}
        onClose={() => setConfirmCheckout(false)}
        title="Check out?"
        description={`${stay.guestName} leaves${room ? ` and room ${room.number} goes to cleaning` : ""}. The bill closes as it stands.`}
        confirmLabel="Confirm check-out"
        onConfirm={runCheckout}
        loading={checkout.isPending}
      />
    </Screen>
  );
}

/** "+ Rohan Sharma", "+ Rohan Sharma and 1 more", or "1 guest" when travelling alone. */
function companionLine(stay: HotelStayDetail) {
  const names = stay.snapshot?.companions.map((companion) => `${companion.legalFirstName} ${companion.legalLastName}`.trim()) ?? [];
  if (names.length) return `+ ${names[0]}${names.length > 1 ? ` and ${names.length - 1} more` : ""}`;
  return partyLabel(stay);
}

function Section({ title, meta, flush, children }: { title: string; meta?: string; flush?: boolean; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <GroupTitle action={meta ? <Text style={styles.meta}>{meta}</Text> : undefined}>{title}</GroupTitle>
      {flush ? <Panel>{children}</Panel> : <Card>{children}</Card>}
    </View>
  );
}

function Identity({ stay, scope }: { stay: HotelStayDetail; scope: { organizationSlug: string; propertySlug: string } }) {
  const [imagesVisible, setImagesVisible] = useState(false);
  if (!stay.snapshot) {
    return (
      <Section title="Identity">
        <Text style={styles.meta}>{stay.identityAccess.reason === "REVOKED" ? "The guest revoked identity access." : stay.identityAccess.reason === "NOT_SUBMITTED" ? "The guest has not shared an ID yet." : "Identity access has ended."}</Text>
      </Section>
    );
  }
  const { guest, document, companions, images } = stay.snapshot;
  const address = [guest.addressLine1, guest.addressLine2, guest.city, guest.stateRegion, guest.postalCode, guest.country ? countryName(guest.country) : null].filter(Boolean).join(", ");
  const anyImages = images.length > 0 || companions.some((companion) => companion.images.length > 0);
  const accessLine = describeHotelIdentityAccess(stay);

  return (
    <>
      <Section title="Guest" flush>
        <FactRow label="Phone" value={guest.phoneNumber || null} icon="phone" />
        <FactRow label="Date of birth" value={guest.dateOfBirth ? formatDate(guest.dateOfBirth) : null} icon="birthday" />
        <FactRow label="Nationality" value={guest.nationality ? countryName(guest.nationality) : null} icon="nationality" />
        <FactRow label="Address" value={address || null} icon="address" />
      </Section>

      <Section title="Identity">
        <Text style={styles.body}>
          {documentTypeLabel(document.documentType)} · {document.documentNumber}
        </Text>
        <Text style={styles.meta}>
          Issued by {countryName(document.issuingCountry)}
          {document.expiryDate ? ` · expires ${formatDate(document.expiryDate)}` : ""}
        </Text>
        {accessLine ? <Text style={[styles.meta, { marginTop: 4 }]}>{accessLine}</Text> : null}
        {anyImages && stay.identityAccess.isActive ? (
          <View style={{ marginTop: space.md, alignSelf: "flex-start" }}>
            <TextLink label={imagesVisible ? "Hide images" : "View images"} onPress={() => setImagesVisible((visible) => !visible)} />
          </View>
        ) : null}
        {!images.length ? <Text style={[styles.meta, { marginTop: 4 }]}>No document images were included.</Text> : null}
        {imagesVisible ? (
          <View style={styles.images}>
            {images.map(({ side }) => (
              <DocumentImage key={side} side={side} scope={scope} stayId={stay.id} />
            ))}
          </View>
        ) : null}
      </Section>

      {companions.length ? (
        <Section title="Companions" meta={String(companions.length)}>
          <View style={{ gap: space.lg }}>
            {companions.map((companion, index) => (
              <View key={`${companion.legalFirstName}-${index}`} style={{ gap: 2 }}>
                <Text style={styles.body}>
                  {companion.legalFirstName} {companion.legalLastName}
                </Text>
                <Text style={styles.meta}>
                  {[companion.relationship, formatDate(companion.dateOfBirth || null)].filter(Boolean).join(" · ")}
                </Text>
                {companion.document ? (
                  <Text style={styles.meta}>
                    {documentTypeLabel(companion.document.documentType)} · {companion.document.documentNumber}
                  </Text>
                ) : (
                  <Text style={styles.meta}>No companion ID shared.</Text>
                )}
                {imagesVisible && companion.images.length ? (
                  <View style={styles.images}>
                    {companion.images.map(({ side }) => (
                      <DocumentImage key={side} side={side} scope={scope} stayId={stay.id} companionId={companion.id} />
                    ))}
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        </Section>
      ) : null}
    </>
  );
}

function DocumentImage({ side, scope, stayId, companionId }: { side: IdentityDocumentImageSide; scope: { organizationSlug: string; propertySlug: string }; stayId: string; companionId?: number }) {
  const access = useQuery(queries.hotelStays.imageAccess(scope.organizationSlug, scope.propertySlug, stayId, side, companionId));
  const label = side === "FRONT" ? "Front" : "Back";
  return (
    <View style={styles.imageBox}>
      <View style={styles.imageHead}>
        <Text style={styles.body}>{label}</Text>
        <Text style={styles.meta}>Private · hotel watermarked</Text>
      </View>
      <View style={styles.imageBody}>
        {access.data ? (
          <Image source={{ uri: access.data.url }} cachePolicy="none" contentFit="contain" style={styles.image} accessibilityLabel={`${label} of the identity document`} />
        ) : access.isError ? (
          <View style={styles.imageState}>
            <Text style={styles.body}>Image could not be loaded</Text>
            <Text style={[styles.meta, { textAlign: "center" }]}>Access may have expired, or private storage may be unavailable.</Text>
            <Button label={access.isFetching ? "Retrying" : "Retry"} variant="outline" size="sm" loading={access.isFetching} onPress={() => void access.refetch()} />
          </View>
        ) : (
          <View style={styles.imageState}>
            <Spinner color={colors.mutedForeground} />
            <Text style={styles.meta}>Loading secure image</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: space.xl, gap: space.sm },
  meta: { ...type.meta, color: colors.mutedForeground },
  body: { ...type.body, color: colors.foreground },
  action: { marginTop: space.xl },
  images: { gap: space.md, marginTop: space.md },
  imageBox: { borderRadius: radii.photo, backgroundColor: colors.muted, overflow: "hidden" },
  imageHead: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: space.lg, paddingVertical: space.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  imageBody: { minHeight: 200, justifyContent: "center" },
  image: { width: "100%", aspectRatio: 3 / 2 },
  imageState: { alignItems: "center", gap: space.sm, padding: space.xl },
});
