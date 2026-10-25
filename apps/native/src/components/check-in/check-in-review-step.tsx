// Everything that will be shared, one row per step, each with Edit. Mirrors
// check-in-review-step.tsx on the web.
import { documentImagesLabel, documentLabel, formatDate, personName } from "@tattvix/api";
import type { CompanionProfile, GuestProfileInput, IdentityDocument } from "@tattvix/contracts";
import { StyleSheet, Text, View } from "react-native";

import { Panel, TextLink, colors, space, type } from "@/src/design-system";

import type { CheckInStep } from "@tattvix/api";

type Row = { step: CheckInStep; label: string; value: string; detail?: string };

export function ReviewStep({
  profile,
  document,
  companions,
  onEdit,
}: {
  profile: GuestProfileInput;
  document: IdentityDocument | null;
  companions: CompanionProfile[];
  onEdit: (step: CheckInStep) => void;
}) {
  const rows: Row[] = [
    {
      step: "about",
      label: "You",
      value: personName(profile),
      detail: [profile.phoneNumber, formatDate(profile.dateOfBirth), `Nationality ${profile.nationality}`]
        .filter(Boolean)
        .join(" · "),
    },
    {
      step: "address",
      label: "Home address",
      value: [profile.city, profile.stateRegion].filter(Boolean).join(", "),
      detail: [profile.addressLine1, profile.addressLine2, profile.postalCode, profile.country].filter(Boolean).join(", "),
    },
    {
      step: "document",
      label: "ID",
      value: document ? documentLabel(document) : "No ID chosen",
      detail: document ? `With ${documentImagesLabel(document)}` : undefined,
    },
    {
      step: "companions",
      label: "With you",
      value: companions.length ? companions.map((companion) => personName(companion)).join(", ") : "Just you",
    },
  ];

  return (
    <Panel>
      {rows.map((row) => (
        <View key={row.step} style={styles.row}>
          <View style={styles.copy}>
            <Text style={styles.label}>{row.label}</Text>
            <Text style={styles.value}>{row.value}</Text>
            {row.detail ? <Text style={styles.detail}>{row.detail}</Text> : null}
          </View>
          <TextLink label="Edit" onPress={() => onEdit(row.step)} />
        </View>
      ))}
    </Panel>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", gap: space.md, padding: space.lg },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  label: { ...type.caption, color: colors.subtleForeground },
  value: { ...type.rowTitle, color: colors.foreground },
  detail: { ...type.caption, color: colors.mutedForeground, fontVariant: ["tabular-nums"] },
});
