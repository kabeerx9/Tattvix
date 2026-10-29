// Shared pieces of the platform admin screens: subscription and setup pills,
// the property row, the "needs attention" groups and the organization link.
// Everything here is aggregate data; no guest identity reaches these views.
import {
  billingAttentionMeta,
  formatLastActivity,
  formatPercent,
  formatRateRange,
  getOccupancyTonight,
  getSetupStatus,
  getSubscriptionPill,
  getSubscriptionStatusPill,
  roomStatusSummary,
  type BillingAttention,
  type PortfolioAttention,
  type SubscriptionPillTone,
} from "@tattvix/api";
import type { PlatformPortfolioProperty, Subscription } from "@tattvix/contracts";
import type { Href } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { ListRow, Panel, PhotoTile, StatusPill, colors, space, type } from "@/src/design-system";

const shortDateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" });
const mediumDateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });

/** "8 Dec" from an ISO datetime. */
export const formatShortDate = (iso: string) => shortDateFormat.format(new Date(iso));
/** "8 Dec 2026" from an ISO datetime. */
export const formatMediumDate = (iso: string) => mediumDateFormat.format(new Date(iso));

export function organizationHref(organizationSlug: string) {
  return `/(admin)/organizations/${encodeURIComponent(organizationSlug)}` as Href;
}

// The web's StatusPill calls its red tone "danger"; the native one says "destructive".
const pillTone: Record<SubscriptionPillTone, "neutral" | "success" | "warning" | "destructive"> = {
  neutral: "neutral",
  success: "success",
  warning: "warning",
  danger: "destructive",
};

export function SubscriptionPill({ subscription }: { subscription: Subscription }) {
  const pill = getSubscriptionPill(subscription);
  return <StatusPill tone={pillTone[pill.tone]}>{pill.label}</StatusPill>;
}

export function SubscriptionStatusPill({ subscription }: { subscription: Subscription }) {
  const pill = getSubscriptionStatusPill(subscription);
  return <StatusPill tone={pillTone[pill.tone]}>{pill.label}</StatusPill>;
}

export function SetupPill({ property }: { property: PlatformPortfolioProperty }) {
  const status = getSetupStatus(property);
  return <StatusPill tone={status.tone}>{status.label}</StatusPill>;
}

export function count(value: number, one: string, many: string) {
  return `${value} ${value === 1 ? one : many}`;
}

/** One property in the Hotels list: cover, name, organization and the numbers that matter tonight. */
export function PropertyRow({ property, onPress }: { property: PlatformPortfolioProperty; onPress: () => void }) {
  const owner = property.contacts?.owners[0];
  const detail = [
    property.organization.name,
    `${count(property.rooms.total, "room", "rooms")} · ${formatRateRange(property.rates)} · ${property.stays.inHouse} in house`,
    owner ? `Owner: ${owner.name ? `${owner.name} · ` : ""}${owner.email || "No email"}` : null,
  ]
    .filter(Boolean)
    .join("\n");
  return (
    <ListRow
      leading={<PhotoTile uri={property.coverPhotoUrl} width={44} aspectRatio={1} />}
      title={property.name}
      detail={detail}
      detailLines={3}
      trailing={
        <View style={styles.trailing}>
          <Text style={styles.trailingValue}>{formatPercent(getOccupancyTonight(property))}</Text>
          <Text style={styles.trailingCaption}>tonight</Text>
          <SetupPill property={property} />
        </View>
      }
      chevron
      onPress={onPress}
    />
  );
}

/**
 * The admin's weekly to-do list, derived from the portfolio payload:
 * organizations to chase for payment and hotels that have stopped checking
 * guests in. Rows open the organization, where the trial can be extended.
 */
export function AttentionGroups({ attention, onOpenOrganization }: { attention: PortfolioAttention; onOpenOrganization: (slug: string) => void }) {
  return (
    <>
      <AttentionGroup title="Billing" hint="Trials ended, or ending within 7 days." empty="No trials ending this week.">
        {attention.billing.length ? (
          <Panel>
            {attention.billing.map((row) => (
              <BillingRow key={row.organization.slug} row={row} onPress={() => onOpenOrganization(row.organization.slug)} />
            ))}
          </Panel>
        ) : null}
      </AttentionGroup>
      <AttentionGroup
        title="No check-ins in 7 days"
        hint="Live hotels, onboarded over 7 days ago, with nobody checked in this week."
        empty="Every hotel checked someone in this week."
      >
        {attention.stale.length ? (
          <Panel>
            {attention.stale.map((property) => (
              <ListRow
                key={property.id}
                title={property.name}
                detail={`${property.organization.name} · ${count(property.rooms.total, "room", "rooms")} · ${formatLastActivity(property.lastActivityAt)}`}
                trailing={<StatusPill tone="warning">{property.lastActivityAt ? "Gone quiet" : "Never used"}</StatusPill>}
                chevron
                onPress={() => onOpenOrganization(property.organization.slug)}
              />
            ))}
          </Panel>
        ) : null}
      </AttentionGroup>
    </>
  );
}

function AttentionGroup({ title, hint, empty, children }: { title: string; hint: string; empty: string; children: React.ReactNode }) {
  return (
    <View style={styles.group}>
      <View>
        <Text style={styles.groupTitle}>{title}</Text>
        <Text style={styles.groupHint}>{hint}</Text>
      </View>
      {children ?? <Text style={styles.groupEmpty}>{empty}</Text>}
    </View>
  );
}

function BillingRow({ row, onPress }: { row: BillingAttention; onPress: () => void }) {
  return (
    <ListRow
      title={row.organization.name}
      detail={billingAttentionMeta(row, formatShortDate)}
      trailing={<SubscriptionPill subscription={row.organization.subscription} />}
      chevron
      onPress={onPress}
    />
  );
}

/** The room mix tonight, as one caption line. */
export function RoomMix({ property }: { property: Pick<PlatformPortfolioProperty, "rooms"> }) {
  return <Text style={styles.caption}>{roomStatusSummary(property.rooms)}</Text>;
}

const styles = StyleSheet.create({
  trailing: { alignItems: "flex-end", gap: 2 },
  trailingValue: { ...type.rowTitle, color: colors.foreground, fontVariant: ["tabular-nums"] },
  trailingCaption: { ...type.caption, color: colors.subtleForeground },
  group: { gap: space.md },
  groupTitle: { ...type.rowTitle, color: colors.foreground },
  groupHint: { ...type.caption, color: colors.subtleForeground, marginTop: 2 },
  groupEmpty: { ...type.meta, color: colors.mutedForeground },
  caption: { ...type.caption, color: colors.mutedForeground, fontVariant: ["tabular-nums"] },
});
