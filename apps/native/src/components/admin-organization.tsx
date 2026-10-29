// Sections of one organization for the platform admin: the subscription with
// "Extend trial", the properties with "Add property" and a room types sheet,
// and the members with "Add member" and a per-member role / active sheet.
// Mirrors apps/web/src/features/platform-organizations/components.
import {
  PLATFORM_ROLES,
  defaultTrialExtension,
  describeSubscriptionEvent,
  endOfLocalDay,
  formatLastActivity,
  formatMoneyWholeRupees,
  formatPercent,
  formatRateRange,
  getMissingSetup,
  getOccupancyRecent,
  getOccupancyTonight,
  platformMemberName,
  platformRoleLabel,
  roomTypeLabel,
  subscriptionEventLabel,
} from "@tattvix/api";
import {
  platformPropertyCreateInputSchema,
  type PlatformMember,
  type PlatformMembershipRole,
  type PlatformPortfolioProperty,
  type PlatformPricing,
  type PlatformSubscription,
  type PlatformUserSearchResult,
} from "@tattvix/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Hotel, Users } from "lucide-react-native";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { BottomSheet, Button, Card, EmptyState, InitialsAvatar, ListRow, Panel, PhotoTile, SectionTitle, StatusPill, TextField, TextLink, colors, space, toast, type } from "@/src/design-system";
import { mutations } from "@/src/lib/api";
import { errorMessage, initialsOf } from "@/src/lib/format";

import { RoomMix, SetupPill, SubscriptionPill, SubscriptionStatusPill, count, formatMediumDate } from "./admin-portfolio";
import { UserEmailPicker } from "./admin-user-picker";
import { PickerSheet, PickerTrigger } from "./profile-fields/PickerField";

// --- Subscription ----------------------------------------------------------

const EXTENSION_CHOICES = [7, 14, 30, 60, 90];

/**
 * The platform admin's view of one hotel's entitlement: the dates, what the
 * hotel would pay, and the one action that exists today, moving the trial
 * end later. Payment recording comes with the money-movement work.
 */
export function SubscriptionSection({ organizationSlug, subscription, pricing }: { organizationSlug: string; subscription: PlatformSubscription; pricing: PlatformPricing }) {
  const [extendOpen, setExtendOpen] = useState(false);
  const trialDetail = subscription.entitled && subscription.status === "TRIALING" ? ` · ${count(subscription.daysLeft, "day", "days")} left` : "";
  return (
    <View style={styles.section}>
      <SectionTitle action={<TextLink label="Extend trial" onPress={() => setExtendOpen(true)} />}>Subscription</SectionTitle>
      <Panel>
        <ListRow title="Status" trailing={<SubscriptionStatusPill subscription={subscription} />} />
        <ListRow title="Trial ends" detail={subscription.trialEndsAt ? `${formatMediumDate(subscription.trialEndsAt)}${trialDetail}` : "—"} />
        <ListRow title="Paid until" detail={subscription.paidUntil ? formatMediumDate(subscription.paidUntil) : "Not yet paid"} />
        <ListRow
          title="Monthly price"
          detail={`${formatMoneyWholeRupees(pricing.monthlyTotalMinor)} · ${pricing.activeProperties} × ${formatMoneyWholeRupees(pricing.pricePerPropertyMinor)} per property`}
        />
        {subscription.events.map((event) => (
          <ListRow key={event.id} title={subscriptionEventLabel(event.kind)} detail={describeSubscriptionEvent(event, formatMediumDate)} detailLines={3} />
        ))}
      </Panel>
      <ExtendTrialSheet organizationSlug={organizationSlug} subscription={subscription} open={extendOpen} onClose={() => setExtendOpen(false)} />
    </View>
  );
}

function ExtendTrialSheet({ organizationSlug, subscription, open, onClose }: { organizationSlug: string; subscription: PlatformSubscription; open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const extend = useMutation(mutations.platformOrganizations.extendTrial(queryClient));
  // The web picks any date; here the admin picks how far past the current end (or past today once expired).
  const choices = EXTENSION_CHOICES.map((days) => {
    const date = endOfLocalDay(defaultTrialExtension(subscription, days));
    return { value: String(days), label: `${formatMediumDate(date.toISOString())} · ${days} days`, date };
  });
  const [choice, setChoice] = useState("14");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [note, setNote] = useState("");
  const chosen = choices.find((item) => item.value === choice) ?? choices[1];

  function submit() {
    const trialEndsAt = chosen.date.toISOString();
    extend.mutate(
      { organizationSlug, input: { trialEndsAt, note: note.trim() || undefined } },
      {
        onSuccess: () => {
          toast(`Trial extended to ${formatMediumDate(trialEndsAt)}`);
          setNote("");
          onClose();
        },
      },
    );
  }

  const error = errorMessage(extend.error, "The trial could not be extended.");

  return (
    <BottomSheet open={open} onClose={onClose} title="Extend trial" footer={<Button label="Extend trial" onPress={submit} loading={extend.isPending} />}>
      <View style={styles.form}>
        <PickerTrigger
          label="New trial end"
          valueLabel={chosen.label}
          placeholder="Choose a date"
          helper={`Must be later than the current end${subscription.trialEndsAt ? ` (${formatMediumDate(subscription.trialEndsAt)})` : ""}.`}
          onPress={() => setPickerOpen(true)}
        />
        <TextField label="Reason" value={note} onChangeText={setNote} maxLength={500} placeholder="Onboarding took an extra week" enter="done" />
        {error ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        ) : null}
      </View>
      <PickerSheet open={pickerOpen} onClose={() => setPickerOpen(false)} title="New trial end" options={choices} selected={choice} onSelect={setChoice} />
    </BottomSheet>
  );
}

// --- Properties ------------------------------------------------------------

export function PropertiesSection({ organizationSlug, properties }: { organizationSlug: string; properties: PlatformPortfolioProperty[] }) {
  const [addOpen, setAddOpen] = useState(false);
  return (
    <View style={styles.section}>
      <SectionTitle meta={count(properties.length, "property", "properties")} action={<TextLink label="Add property" onPress={() => setAddOpen(true)} />}>
        Properties
      </SectionTitle>
      {properties.length ? (
        properties.map((property) => <PropertyCard key={property.id} property={property} />)
      ) : (
        <EmptyState icon={Hotel} text="No properties yet. Add the first property for this organization." action={{ label: "Add property", onPress: () => setAddOpen(true) }} />
      )}
      <AddPropertySheet organizationSlug={organizationSlug} open={addOpen} onClose={() => setAddOpen(false)} />
    </View>
  );
}

function AddPropertySheet({ organizationSlug, open, onClose }: { organizationSlug: string; open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const create = useMutation(mutations.platformOrganizations.createProperty(queryClient));
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [errors, setErrors] = useState<{ name?: string; slug?: string }>({});

  function submit() {
    const parsed = platformPropertyCreateInputSchema.safeParse({ name, slug });
    if (!parsed.success) {
      const next: { name?: string; slug?: string } = {};
      for (const issue of parsed.error.issues) next[issue.path[0] as "name" | "slug"] ??= issue.message;
      setErrors(next);
      return;
    }
    setErrors({});
    create.mutate(
      { organizationSlug, input: parsed.data },
      {
        onSuccess: () => {
          toast("Property added");
          setName("");
          setSlug("");
          onClose();
        },
      },
    );
  }

  const error = errorMessage(create.error, "The property could not be created.");

  return (
    <BottomSheet open={open} onClose={onClose} title="Add property" footer={<Button label="Save property" onPress={submit} loading={create.isPending} />}>
      <View style={styles.form}>
        <TextField label="Property name" value={name} onChangeText={setName} error={errors.name} maxLength={255} placeholder="Example Jaipur" enter="next" />
        <TextField label="Property slug" value={slug} onChangeText={setSlug} error={errors.slug} maxLength={255} autoCapitalize="none" autoCorrect={false} placeholder="jaipur" enter={submit} />
        {error ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        ) : null}
      </View>
    </BottomSheet>
  );
}

function CardFact({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{String(value)}</Text>
      {detail ? <Text style={styles.factDetail}>{detail}</Text> : null}
    </View>
  );
}

function PropertyCard({ property }: { property: PlatformPortfolioProperty }) {
  const [roomTypesOpen, setRoomTypesOpen] = useState(false);
  const missing = getMissingSetup(property);
  return (
    <Card style={styles.propertyCard}>
      <PhotoTile
        uri={property.coverPhotoUrl}
        aspectRatio={16 / 9}
        emptyText
        badge={
          <View style={styles.badges}>
            <SetupPill property={property} />
            <SubscriptionPill subscription={property.organization.subscription} />
          </View>
        }
      />
      <View style={styles.propertyBody}>
        <View>
          <Text style={styles.propertyName}>{property.name}</Text>
          <Text style={styles.meta} numberOfLines={2}>
            {property.address || "No address yet"}
          </Text>
        </View>
        <View style={styles.facts}>
          <CardFact label="Rooms" value={property.rooms.total} detail={count(property.roomTypes.length, "type", "types")} />
          <CardFact label="Nightly" value={formatRateRange(property.rates)} detail={property.rates.avgMinor !== null ? `avg ${formatMoneyWholeRupees(property.rates.avgMinor)}` : undefined} />
          <CardFact label="Tonight" value={formatPercent(getOccupancyTonight(property))} detail={`${formatPercent(getOccupancyRecent(property))} over ${property.occupancy.recentNights}n`} />
        </View>
        <RoomMix property={property} />
        <View style={[styles.facts, styles.factsDivider]}>
          <CardFact label="In house" value={property.stays.inHouse} detail={`${property.stays.arrivalsPending} arriving`} />
          <CardFact label="Check-ins" value={property.stays.checkInsLast7Days} detail="last 7 days" />
          <CardFact label="Revenue" value={formatMoneyWholeRupees(property.revenueLast30DaysMinor)} detail="last 30 days" />
        </View>
        {missing.length && property.isActive ? <Text style={styles.warning}>Missing {missing.join(", ")}</Text> : null}
        <View style={styles.propertyFooter}>
          <Text style={styles.caption}>{formatLastActivity(property.lastActivityAt)}</Text>
          {property.roomTypes.length ? <TextLink label="Room types & prices" onPress={() => setRoomTypesOpen(true)} /> : null}
        </View>
      </View>
      <RoomTypesSheet property={property} open={roomTypesOpen} onClose={() => setRoomTypesOpen(false)} />
    </Card>
  );
}

function RoomTypesSheet({ property, open, onClose }: { property: PlatformPortfolioProperty; open: boolean; onClose: () => void }) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Room types & prices">
      <Text style={styles.description}>
        {property.name} · {count(property.rooms.total, "room", "rooms")}
      </Text>
      <Panel flat>
        {property.roomTypes.map((roomType) => (
          <ListRow
            key={roomType.name}
            leading={<PhotoTile uri={roomType.photoUrl} width={56} aspectRatio={1} />}
            title={roomTypeLabel(roomType.name)}
            detail={`${count(roomType.rooms.total, "room", "rooms")}${roomType.rates.avgMinor !== null ? ` · avg ${formatMoneyWholeRupees(roomType.rates.avgMinor)} a night` : ""}\n${property.rooms.total ? roomTypeMix(roomType.rooms) : ""}`}
            detailLines={2}
            trailing={<Text style={styles.rate}>{formatRateRange(roomType.rates)}</Text>}
          />
        ))}
      </Panel>
    </BottomSheet>
  );
}

function roomTypeMix(rooms: PlatformPortfolioProperty["rooms"]) {
  return [rooms.occupied && `${rooms.occupied} occupied`, rooms.ready && `${rooms.ready} ready`, rooms.cleaning && `${rooms.cleaning} cleaning`, rooms.maintenance && `${rooms.maintenance} maintenance`]
    .filter(Boolean)
    .join(" · ");
}

// --- Members ---------------------------------------------------------------

const roleOptions = PLATFORM_ROLES.map((role) => ({ value: role, label: platformRoleLabel(role) }));

export function MembersSection({ organizationSlug, members }: { organizationSlug: string; members: PlatformMember[] }) {
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState<PlatformMember | null>(null);
  // The sheet shows the live member, so a role change is visible as soon as the detail refetches.
  const selectedMember = selected ? (members.find((member) => member.id === selected.id) ?? selected) : null;

  return (
    <View style={styles.section}>
      <SectionTitle meta={count(members.length, "member", "members")} action={<TextLink label="Add member" onPress={() => setAddOpen(true)} />}>
        Members
      </SectionTitle>
      {members.length ? (
        <Panel>
          {members.map((member) => (
            <ListRow
              key={member.id}
              leading={<InitialsAvatar initials={initialsOf(platformMemberName(member))} name={member.user.email} size={40} />}
              title={platformMemberName(member)}
              detail={`${member.user.email} · ${platformRoleLabel(member.role)}`}
              trailing={<MemberStatusPill isActive={member.isActive} />}
              chevron
              onPress={() => setSelected(member)}
            />
          ))}
        </Panel>
      ) : (
        <EmptyState icon={Users} text="No members yet. Add the first member for this organization." action={{ label: "Add member", onPress: () => setAddOpen(true) }} />
      )}
      <AddMemberSheet organizationSlug={organizationSlug} open={addOpen} onClose={() => setAddOpen(false)} />
      <MemberSheet organizationSlug={organizationSlug} member={selectedMember} onClose={() => setSelected(null)} />
    </View>
  );
}

function MemberStatusPill({ isActive }: { isActive: boolean }) {
  return <StatusPill tone={isActive ? "success" : "neutral"}>{isActive ? "Active" : "Inactive"}</StatusPill>;
}

function AddMemberSheet({ organizationSlug, open, onClose }: { organizationSlug: string; open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const add = useMutation(mutations.platformOrganizations.addMember(queryClient));
  const [user, setUser] = useState<PlatformUserSearchResult | null>(null);
  const [role, setRole] = useState<PlatformMembershipRole>("RECEPTION");
  const [roleOpen, setRoleOpen] = useState(false);

  function submit() {
    if (!user) return;
    add.mutate(
      { organizationSlug, input: { email: user.email, role } },
      {
        onSuccess: () => {
          toast("Member added");
          setUser(null);
          setRole("RECEPTION");
          onClose();
        },
      },
    );
  }

  const error = errorMessage(add.error, "The member could not be added.");

  return (
    <BottomSheet open={open} onClose={onClose} title="Add member" fill footer={<Button label="Add member" onPress={submit} loading={add.isPending} disabled={!user} />}>
      <View style={styles.form}>
        <UserEmailPicker label="Account" value={user} onChange={setUser} />
        <PickerTrigger label="Role" valueLabel={platformRoleLabel(role)} placeholder="Choose a role" onPress={() => setRoleOpen(true)} />
        {error ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        ) : null}
      </View>
      <PickerSheet open={roleOpen} onClose={() => setRoleOpen(false)} title="Role" options={roleOptions} selected={role} onSelect={(value) => setRole(value as PlatformMembershipRole)} />
    </BottomSheet>
  );
}

function MemberSheet({ organizationSlug, member, onClose }: { organizationSlug: string; member: PlatformMember | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const update = useMutation(mutations.platformOrganizations.updateMember(queryClient));
  const [roleOpen, setRoleOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setError(null), [member?.id]);

  if (!member) return <BottomSheet open={false} onClose={onClose} />;

  const changeRole = (role: PlatformMembershipRole) => {
    if (role === member.role) return;
    setError(null);
    update.mutate(
      { organizationSlug, memberId: member.id, input: { role } },
      {
        onSuccess: () => toast(`${platformMemberName(member)} is now ${platformRoleLabel(role).toLowerCase()}`),
        onError: (failure) => setError(errorMessage(failure, "The role could not be updated.")),
      },
    );
  };

  const toggleActive = () => {
    setError(null);
    update.mutate(
      { organizationSlug, memberId: member.id, input: { isActive: !member.isActive } },
      {
        onSuccess: () => toast(member.isActive ? "Member deactivated" : "Member activated"),
        onError: (failure) => setError(errorMessage(failure, "The membership could not be updated.")),
      },
    );
  };

  return (
    <BottomSheet
      open
      onClose={onClose}
      title={platformMemberName(member)}
      footer={
        <>
          <Button label={member.isActive ? "Deactivate" : "Activate"} variant="outline" onPress={toggleActive} loading={update.isPending && update.variables?.input.isActive !== undefined} disabled={update.isPending} />
          <Button label="Done" variant="ghost" onPress={onClose} disabled={update.isPending} />
        </>
      }
    >
      <View style={styles.form}>
        <View style={styles.memberHeader}>
          <Text style={styles.meta}>{member.user.email}</Text>
          <MemberStatusPill isActive={member.isActive} />
        </View>
        <PickerTrigger label="Role" valueLabel={platformRoleLabel(member.role)} placeholder="Choose a role" onPress={() => setRoleOpen(true)} error={error ?? undefined} />
      </View>
      <PickerSheet open={roleOpen} onClose={() => setRoleOpen(false)} title="Role" options={roleOptions} selected={member.role} onSelect={(value) => changeRole(value as PlatformMembershipRole)} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: space.xxxl, gap: space.md },
  form: { gap: space.lg, paddingTop: space.sm },
  error: { ...type.caption, color: colors.destructive },
  description: { ...type.body, color: colors.mutedForeground, marginBottom: space.md },
  meta: { ...type.meta, color: colors.mutedForeground },
  caption: { ...type.caption, color: colors.subtleForeground },
  warning: { ...type.caption, color: colors.warning },
  rate: { ...type.rowTitle, color: colors.foreground, fontVariant: ["tabular-nums"] },
  propertyCard: { padding: 0, overflow: "hidden" },
  badges: { flexDirection: "row", gap: 6 },
  propertyBody: { padding: space.lg, gap: space.lg },
  propertyName: { ...type.cardTitle, color: colors.foreground },
  facts: { flexDirection: "row", gap: space.md },
  factsDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderSoft, paddingTop: space.lg },
  fact: { flex: 1, gap: 2 },
  factLabel: { ...type.caption, color: colors.subtleForeground },
  factValue: { ...type.rowTitle, color: colors.foreground, fontVariant: ["tabular-nums"] },
  factDetail: { ...type.caption, color: colors.subtleForeground, fontVariant: ["tabular-nums"] },
  propertyFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.md },
  memberHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.md },
});
