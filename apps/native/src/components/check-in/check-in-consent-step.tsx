import { formatPostCheckoutWindow } from "@tattvix/api";
// The consent notice: the only place consent is captured. It lists who
// receives what, why, for how long and how to stop, then an unticked checkbox
// the guest must tick. Sending stays disabled until then (buildSubmitInput).
// Copy mirrors check-in-consent-step.tsx on the web (DPDP notice requirements).
import { documentImagesLabel, documentLabel, personName } from "@tattvix/api";
import type { CheckInContext, CompanionProfile, GuestProfileInput, IdentityDocument } from "@tattvix/contracts";
import { useQueries } from "@tanstack/react-query";
import { useRouter, type Href } from "expo-router";
import { CheckSquare, Square } from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, fonts, radii, space, type } from "@/src/design-system";
import { queries } from "@/src/lib/api";

type AccessPolicy = CheckInContext["accessPolicy"];

export function ConsentStep({
  propertyName,
  organizationName,
  profile,
  document,
  companions,
  companionDocumentIds,
  accessPolicy,
  accepted,
  showError,
  onAcceptedChange,
}: {
  propertyName: string;
  organizationName: string;
  profile: GuestProfileInput;
  document: IdentityDocument;
  companions: CompanionProfile[];
  companionDocumentIds: Record<number, number>;
  accessPolicy: AccessPolicy;
  accepted: boolean;
  showError: boolean;
  onAcceptedChange: (accepted: boolean) => void;
}) {
  const router = useRouter();
  const companionDocuments = useQueries({
    queries: companions.map((companion) => queries.identityDocuments.list(companion.id)),
  });
  const runBy = organizationName && organizationName !== propertyName ? `, run by ${organizationName}` : "";

  return (
    <View style={styles.stack}>
      <Notice title="Who receives it">
        <Text style={styles.body}>
          {propertyName}
          {runBy}.
        </Text>
      </Notice>

      <Notice title="Why">
        <Text style={styles.body}>To confirm who is staying and record your check-in for this stay only. Not for marketing.</Text>
      </Notice>

      <Notice title="What is shared">
        <View style={styles.participants}>
          <Participant
            name={`${personName(profile)} (you)`}
            items={[
              "Legal name, phone number, date of birth, nationality and home address",
              `${documentLabel(document)}: number, name on it, issuing country${document.expiryDate ? ", expiry date" : ""} and ${documentImagesLabel(document)}`,
            ]}
          />
          {companions.map((companion, index) => {
            const chosenId = companionDocumentIds[companion.id];
            const chosen = companionDocuments[index]?.data?.documents.find((item) => item.id === chosenId);
            return (
              <Participant
                key={companion.id}
                name={personName(companion)}
                items={[
                  "Legal name, date of birth, relationship to you and nationality",
                  chosen
                    ? `${documentLabel(chosen)}: number, name on it, issuing country and ${documentImagesLabel(chosen)}`
                    : "No ID",
                ]}
              />
            );
          })}
        </View>
        <Text style={styles.small}>
          Not shared: your other saved IDs, companions you didn’t select, your email and account details.
        </Text>
      </Notice>

      <Notice title="For how long">
        <Text style={styles.body}>
          Access stays active throughout your stay and ends {formatPostCheckoutWindow(accessPolicy.postCheckoutGraceHours)} after checkout, and
          the ID photos shared with the hotel are scheduled for deletion. Each time the hotel opens your details it is recorded, and you
          can see it in Privacy.
        </Text>
      </Notice>

      <Notice title="Changing your mind">
        <Text style={styles.body}>
          The hotel uses your details while you stay. After checkout you can stop sharing from this check-in or from{" "}
          <Text style={styles.link} onPress={() => router.push("/(guest)/privacy" as Href)}>
            Privacy
          </Text>
          , and the hotel loses access straight away. If you don’t, access ends on its own.
        </Text>
      </Notice>

      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: accepted }}
        onPress={() => onAcceptedChange(!accepted)}
        style={[styles.consent, accepted ? styles.consentOn : showError ? styles.consentError : null]}
      >
        {accepted ? (
          <CheckSquare color={colors.foreground} size={22} strokeWidth={2} />
        ) : (
          <Square color={showError ? colors.destructive : colors.input} size={22} strokeWidth={1.8} />
        )}
        <Text style={styles.consentText}>I agree to share the details above with {propertyName} for this stay.</Text>
      </Pressable>
      {showError ? (
        <Text accessibilityRole="alert" style={styles.error}>
          Tick the box to agree before sending.
        </Text>
      ) : null}
    </View>
  );
}

function Notice({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.notice}>
      <Text style={styles.noticeTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Participant({ name, items }: { name: string; items: string[] }) {
  return (
    <View style={styles.participant}>
      <Text style={styles.participantName}>{name}</Text>
      {items.map((item) => (
        <Text key={item} style={styles.participantItem}>
          • {item}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space.xxl },
  notice: { gap: space.xs },
  noticeTitle: { ...type.caption, fontFamily: fonts.semibold, color: colors.subtleForeground },
  body: { ...type.body, color: colors.foreground },
  participants: { gap: space.md, marginTop: space.xs },
  participant: {
    padding: space.lg,
    gap: space.xs,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  participantName: { ...type.rowTitle, color: colors.foreground },
  participantItem: { ...type.caption, color: colors.mutedForeground },
  small: { ...type.caption, color: colors.subtleForeground, marginTop: space.sm },
  link: { color: colors.primary, fontFamily: fonts.semibold },
  consent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.md,
    padding: space.lg,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  consentOn: { borderColor: colors.foreground, borderWidth: 2 },
  consentError: { borderColor: colors.destructive },
  consentText: { ...type.rowTitle, color: colors.foreground, flex: 1 },
  error: { ...type.caption, color: colors.destructive },
});
