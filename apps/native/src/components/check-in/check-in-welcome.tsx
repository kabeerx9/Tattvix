// The QR landing. Shows the hotel's own details from the check-in context
// (no decorative photo: the context carries no property image) and one action
// in the thumb zone. Mirrors check-in-welcome.tsx on the web.
import { formatMoneyMinor } from "@tattvix/api";
import type { CheckInContext } from "@tattvix/contracts";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { MapPin, Phone } from "lucide-react-native";

import { Button, colors, space, type } from "@/src/design-system";

import { CheckInBrandBar, CheckInScaffold } from "./check-in-layout";

type Property = CheckInContext["property"];

export function CheckInWelcome({
  property,
  signedIn,
  onStart,
  onSignIn,
}: {
  property: Property;
  signedIn: boolean;
  onStart?: () => void;
  onSignIn?: () => void;
}) {
  const details = property.details;
  const from = details?.nightlyRateFromMinor ?? null;
  const to = details?.nightlyRateToMinor ?? null;
  const rate =
    from === null ? null : from === to || to === null ? formatMoneyMinor(from) : `${formatMoneyMinor(from)} – ${formatMoneyMinor(to)}`;

  const footer = signedIn ? (
    <Button label="Start check-in" onPress={onStart ?? (() => {})} />
  ) : (
    <Button label="Sign in to continue" onPress={onSignIn ?? (() => {})} />
  );

  return (
    <CheckInScaffold footer={footer} header={<CheckInBrandBar />}>
      <View style={styles.hero}>
        <Text style={styles.kicker}>Checking in at</Text>
        <Text accessibilityRole="header" style={styles.name}>
          {property.name}
        </Text>
        {details?.address ? (
          <View style={styles.addressRow}>
            <MapPin color={colors.mutedForeground} size={16} strokeWidth={1.8} />
            <Text style={styles.address}>{details.address}</Text>
          </View>
        ) : null}
      </View>

      {details && (details.checkInTime || details.checkOutTime || rate) ? (
        <View style={styles.facts}>
          {details.checkInTime ? <Fact label="Check-in" value={details.checkInTime} /> : null}
          {details.checkOutTime ? <Fact label="Check-out" value={details.checkOutTime} /> : null}
          {rate ? <Fact label="Rooms from" value={formatMoneyMinor(from!)} /> : null}
        </View>
      ) : null}

      <View style={styles.copy}>
        {signedIn ? (
          <Text style={styles.lede}>Check in from your phone in about two minutes. Keep your ID handy.</Text>
        ) : (
          <Text style={styles.lede}>Sign in to check in from your phone. Keep your ID handy.</Text>
        )}
        <Text style={styles.muted}>Nothing is shared with the hotel until you agree on the last step.</Text>
        {rate ? <Text style={styles.caption}>Rooms {rate} a night. Reception assigns your room and confirms the rate.</Text> : null}
        {details?.amenities.length ? <Text style={styles.caption}>{details.amenities.join(" · ")}</Text> : null}
        {details?.contactPhone ? (
          <Pressable
            accessibilityRole="link"
            onPress={() => void Linking.openURL(`tel:${details.contactPhone}`)}
            style={styles.phoneRow}
          >
            <Phone color={colors.primary} size={14} strokeWidth={1.8} />
            <Text style={styles.phone}>{details.contactPhone}</Text>
          </Pressable>
        ) : null}
      </View>
    </CheckInScaffold>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { gap: space.xs },
  kicker: { ...type.meta, color: colors.subtleForeground },
  name: { ...type.pageTitle, color: colors.foreground },
  addressRow: { flexDirection: "row", alignItems: "flex-start", gap: space.sm, marginTop: space.xs },
  address: { ...type.body, color: colors.mutedForeground, flex: 1 },
  facts: {
    flexDirection: "row",
    gap: space.md,
    paddingVertical: space.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSoft,
  },
  fact: { flex: 1, minWidth: 0 },
  factLabel: { ...type.caption, color: colors.subtleForeground },
  factValue: { ...type.rowTitle, color: colors.foreground, marginTop: 2, fontVariant: ["tabular-nums"] },
  copy: { gap: space.md },
  lede: { ...type.body, color: colors.foreground },
  muted: { ...type.body, color: colors.mutedForeground },
  caption: { ...type.caption, color: colors.subtleForeground },
  phoneRow: { flexDirection: "row", alignItems: "center", gap: space.sm, marginTop: space.xs, alignSelf: "flex-start" },
  phone: { ...type.meta, color: colors.primary },
});
