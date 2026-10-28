// A stay: status and facts, the one action it allows, and the identity the
// guest shared. Document images are fetched only while shown and never cached
// to disk (expo-image cachePolicy "none"): this is a shared desk phone.
import { formatMoneyWholeRupees, getStayStatus, localDayKey, stayStatusLabel } from "@tattvix/api";
import type { HotelStayDetail, IdentityDocumentImageSide } from "@tattvix/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { FileKey2, ShieldOff, UserRound, UsersRound } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { BillSection } from "@/src/components/bill-section";
import { StaySheet } from "@/src/components/desk-sheets";
import { PendingScreen, RetryScreen } from "@/src/components/status-screens";
import { Button, Card, ConfirmSheet, InitialsAvatar, Screen, SecondaryHeader, Spinner, StatusPill, TextLink, colors, radii, space, toast, type } from "@/src/design-system";
import { queries } from "@/src/lib/api";
import { getManageScope } from "@/src/lib/desk-scope";
import { documentTypeLabel, errorMessage, formatDate, formatDateTime, formatDay, initialsOf, partyLabel } from "@/src/lib/format";
import { hotelMutations } from "@/src/lib/hotel-mutations";
import { useHotelPlace } from "@/src/lib/hotel-place";

const pillTone = { PENDING_CHECK_IN: "warning", CHECKED_IN: "success", CHECKED_OUT: "neutral" } as const;

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
    if (stayQuery.isError) return <RetryScreen onRetry={() => void stayQuery.refetch()} retrying={stayQuery.isFetching} />;
    return <PendingScreen />;
  }

  const stay = stayQuery.data;
  const rooms = roomQuery.data?.rooms ?? [];
  const room = stay.room ? rooms.find((entry) => entry.id === stay.room!.id) : undefined;
  const todayKey = localDayKey(new Date());
  const status = getStayStatus(stay, todayKey);
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

      <View style={styles.hero}>
        <InitialsAvatar initials={initialsOf(stay.guestName)} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.name}>{stay.guestName}</Text>
          <Text style={styles.meta}>
            {partyLabel(stay)}
            {room ? ` · Room ${room.number}${room.roomType ? `, ${room.roomType}` : ""}` : ""}
          </Text>
          <StatusPill tone={status.tone === "danger" ? "destructive" : pillTone[stay.operationalStatus]}>{status.tone === "danger" ? status.label : stayStatusLabel(stay.operationalStatus)}</StatusPill>
        </View>
      </View>

      <View style={styles.facts}>
        <Fact label={stay.checkedInAt ? "Checked in" : "Submitted"}>{formatDateTime(stay.checkedInAt ?? stay.submittedAt)}</Fact>
        <Fact label={stay.checkedOutAt ? "Checked out" : "Due out"}>{stay.checkedOutAt ? formatDateTime(stay.checkedOutAt) : formatDay(stay.expectedCheckOutDate, todayKey)}</Fact>
        <Fact label="Room">{room ? `${room.number}${room.floor ? ` · Floor ${room.floor}` : ""}` : "Not assigned"}</Fact>
        <Fact label="Nightly rate">{room?.nightlyRateMinor != null ? formatMoneyWholeRupees(room.nightlyRateMinor) : "—"}</Fact>
      </View>

      {waiting && scope.canAssign ? (
        <View style={styles.action}>
          <Button label="Assign a room" onPress={() => setAssigning(true)} disabled={!roomQuery.data} />
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

function Section({ icon: Icon, title, meta, children }: { icon: typeof UserRound; title: string; meta?: string; children: ReactNode }) {
  return (
    <Card style={styles.sectionCard}>
      <View style={styles.sectionHead}>
        <Icon color={colors.mutedForeground} size={18} strokeWidth={1.8} />
        <Text style={styles.sectionTitle}>{title}</Text>
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}
      </View>
      {children}
    </Card>
  );
}

function Identity({ stay, scope }: { stay: HotelStayDetail; scope: { organizationSlug: string; propertySlug: string } }) {
  const [imagesVisible, setImagesVisible] = useState(false);
  if (!stay.snapshot) {
    return (
      <Section icon={ShieldOff} title="Identity">
        <Text style={styles.meta}>{stay.identityAccess.reason === "REVOKED" ? "The guest revoked identity access." : stay.identityAccess.reason === "NOT_SUBMITTED" ? "The guest has not shared an ID yet." : "Identity access has ended."}</Text>
      </Section>
    );
  }
  const { guest, document, companions, images } = stay.snapshot;
  const address = [guest.addressLine1, guest.addressLine2, guest.city, guest.stateRegion, guest.postalCode, guest.country].filter(Boolean).join(", ");
  const anyImages = images.length > 0 || companions.some((companion) => companion.images.length > 0);

  return (
    <>
      <Section icon={UserRound} title="Guest">
        <View style={styles.facts}>
          <Fact label="Phone">{guest.phoneNumber || "—"}</Fact>
          <Fact label="Date of birth">{formatDate(guest.dateOfBirth || null)}</Fact>
          <Fact label="Nationality">{guest.nationality || "—"}</Fact>
          <View style={[styles.fact, { width: "100%" }]}>
            <Text style={styles.factLabel}>Address</Text>
            <Text style={styles.factValue}>{address || "—"}</Text>
          </View>
        </View>
      </Section>

      <Section icon={FileKey2} title="Identity">
        <Text style={styles.body}>
          {documentTypeLabel(document.documentType)} · {document.documentNumber}
        </Text>
        <Text style={styles.meta}>
          Issued by {document.issuingCountry.toUpperCase()}
          {document.expiryDate ? ` · expires ${formatDate(document.expiryDate)}` : ""}
        </Text>
        <Text style={[styles.meta, { marginTop: 4 }]}>Images shared with this property are watermarked for hotel check-in only.</Text>
        {stay.identityAccess.expiresAt ? <Text style={[styles.meta, { marginTop: 4 }]}>ID access ends {formatDateTime(stay.identityAccess.expiresAt)}</Text> : stay.identityAccess.isActive ? <Text style={[styles.meta, { marginTop: 4 }]}>ID access stays active throughout the stay. The 60-day window starts at checkout.</Text> : null}
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

      <Section icon={UsersRound} title="Companions" meta={String(companions.length)}>
        {companions.length ? (
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
        ) : (
          <Text style={styles.meta}>The guest did not share any companions.</Text>
        )}
      </Section>
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
  hero: { flexDirection: "row", alignItems: "center", gap: space.lg, marginTop: space.lg },
  name: { ...type.pageTitle, color: colors.foreground },
  meta: { ...type.meta, color: colors.mutedForeground },
  body: { ...type.body, color: colors.foreground },
  facts: { flexDirection: "row", flexWrap: "wrap", rowGap: space.lg, marginTop: space.xl },
  fact: { width: "50%", gap: 2, paddingRight: space.md },
  factLabel: { ...type.label, color: colors.subtleForeground },
  factValue: { ...type.rowTitle, color: colors.foreground },
  action: { marginTop: space.xl },
  sectionCard: { marginTop: space.lg },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: space.sm, marginBottom: space.md },
  sectionTitle: { ...type.cardTitle, color: colors.foreground, flex: 1 },
  images: { gap: space.md, marginTop: space.md },
  imageBox: { borderRadius: radii.photo, backgroundColor: colors.muted, overflow: "hidden" },
  imageHead: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: space.lg, paddingVertical: space.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  imageBody: { minHeight: 200, justifyContent: "center" },
  image: { width: "100%", aspectRatio: 3 / 2 },
  imageState: { alignItems: "center", gap: space.sm, padding: space.xl },
});
