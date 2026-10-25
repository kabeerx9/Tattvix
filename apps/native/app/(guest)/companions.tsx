// Travel companions: people the signed-in guest travels with. Mirrors
// apps/web/src/features/companions/components/companions-page.tsx. Reached from
// Home, not a tab. Tapping a companion expands its detail inline (edit, remove,
// identity documents) so only one modal is ever open at a time.
import { companionKeys, companionSummary, identityDocumentKeys, personName } from "@tattvix/api";
import type { CompanionProfile, CompanionProfileMissingField } from "@tattvix/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Plus, UsersRound } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { CompanionEditorSheet } from "@/src/components/companions/CompanionEditorSheet";
import { IdentityDocumentsSection } from "@/src/components/identity/IdentityDocumentsSection";
import {
  Button,
  Card,
  ConfirmSheet,
  EmptyState,
  InitialsAvatar,
  Kpi,
  KpiRow,
  LargeTitle,
  ListRow,
  Panel,
  Screen,
  SecondaryHeader,
  Spinner,
  StatusPill,
  colors,
  space,
  toast,
  type,
} from "@/src/design-system";
import { api, queries } from "@/src/lib/api";
import { errorMessage } from "@/src/lib/format";

const missingFieldLabels: Record<CompanionProfileMissingField, string> = {
  legalFirstName: "Legal first name",
  legalLastName: "Legal last name",
  dateOfBirth: "Date of birth",
  relationship: "Relationship",
  nationality: "Nationality",
};

export default function CompanionsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const query = useQuery(queries.companions.list());
  const companions = query.data?.companions ?? [];

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = companions.find((companion) => companion.id === selectedId) ?? null;

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorTarget, setEditorTarget] = useState<CompanionProfile | null>(null);
  const [confirmingRemoval, setConfirmingRemoval] = useState(false);

  const remove = useMutation({
    mutationFn: (id: number) => api.companions.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: companionKeys.list() });
      void queryClient.invalidateQueries({ queryKey: identityDocumentKeys.all });
      setConfirmingRemoval(false);
      setSelectedId(null);
      toast("Companion removed");
    },
  });

  function openEditor(companion: CompanionProfile | null) {
    setEditorTarget(companion);
    setEditorOpen(true);
  }

  const ready = companions.filter((companion) => companion.readiness.isReady).length;

  return (
    <Screen refreshing={query.isFetching && !query.isPending} onRefresh={() => void query.refetch()}>
      <SecondaryHeader title="Companions" onBack={() => router.back()} />
      <LargeTitle meta="Save accompanying guest profiles so group check-in takes less time.">Travel companions</LargeTitle>

      {query.isPending ? (
        <View style={styles.center}>
          <Spinner color={colors.mutedForeground} />
        </View>
      ) : query.isError ? (
        <View style={styles.section}>
          <EmptyState
            icon={UsersRound}
            text="Your companions could not be loaded."
            action={{ label: "Try again", onPress: () => void query.refetch(), variant: "outline" }}
          />
        </View>
      ) : (
        <>
          <View style={styles.section}>
            <KpiRow>
              <Kpi label="Saved" value={companions.length} />
              <Kpi label="Ready" value={ready} />
              <Kpi label="Incomplete" value={companions.length - ready} />
            </KpiRow>
            <Button label="Add companion" icon={Plus} onPress={() => openEditor(null)} />
          </View>

          {companions.length === 0 ? (
            <View style={styles.section}>
              <EmptyState
                icon={UsersRound}
                text="No companions yet. Add family members or people you travel with often. This is optional and does not add anyone to a hotel stay."
              />
            </View>
          ) : (
            <View style={styles.section}>
              <Panel>
                {companions.map((companion) => (
                  <ListRow
                    key={companion.id}
                    title={personName(companion, "Unnamed companion")}
                    detail={companionDetail(companion)}
                    leading={<InitialsAvatar initials={initialsFor(companion)} size={40} />}
                    trailing={
                      companion.readiness.isReady ? (
                        <StatusPill tone="success">Profile ready</StatusPill>
                      ) : (
                        <StatusPill tone="neutral">{neededLabel(companion)}</StatusPill>
                      )
                    }
                    chevron
                    onPress={() => setSelectedId(selectedId === companion.id ? null : companion.id)}
                  />
                ))}
              </Panel>
            </View>
          )}

          {selected ? (
            <View style={styles.section}>
              <Card>
                <Text style={styles.name}>{personName(selected, "Unnamed companion")}</Text>
                <Text style={styles.meta}>{companionSummary(selected)}</Text>
                <Text style={styles.meta}>{ageLabel(selected)}</Text>
                {!selected.readiness.isReady ? (
                  <Text style={styles.caption}>
                    Still needed: {selected.readiness.missingFields.map((field) => missingFieldLabels[field]).join(", ")}.
                  </Text>
                ) : null}
                <View style={styles.actions}>
                  <Button label="Edit" variant="outline" size="sm" onPress={() => openEditor(selected)} />
                  <Button label="Remove" variant="destructive" size="sm" onPress={() => setConfirmingRemoval(true)} />
                </View>
              </Card>
              <IdentityDocumentsSection companionId={selected.id} title="Identity documents" />
            </View>
          ) : null}
        </>
      )}

      <CompanionEditorSheet
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        companion={editorTarget}
        onSaved={(saved) => setSelectedId(saved.id)}
      />

      <ConfirmSheet
        open={confirmingRemoval}
        onClose={() => {
          if (!remove.isPending) setConfirmingRemoval(false);
        }}
        title={`Remove ${selected ? personName(selected, "this companion") : "this companion"}?`}
        description={
          remove.isError
            ? errorMessage(remove.error, "The companion could not be removed.") ?? "The companion could not be removed."
            : "Remove this companion permanently?"
        }
        confirmLabel="Remove companion"
        tone="destructive"
        loading={remove.isPending}
        onConfirm={() => {
          if (selected) remove.mutate(selected.id);
        }}
      />
    </Screen>
  );
}

function initialsFor(companion: CompanionProfile) {
  const initials = [companion.legalFirstName, companion.legalLastName]
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
  return initials || "?";
}

function companionDetail(companion: CompanionProfile) {
  return `${companionSummary(companion)} · ${ageLabel(companion)}`;
}

function ageLabel(companion: CompanionProfile) {
  if (companion.isMinor === null) return "Age pending";
  return companion.isMinor ? "Minor" : "Adult";
}

function neededLabel(companion: CompanionProfile) {
  const count = companion.readiness.missingFields.length;
  return `${count} detail${count === 1 ? "" : "s"} needed`;
}

const styles = StyleSheet.create({
  center: { alignItems: "center", paddingVertical: space.xxxl },
  section: { marginTop: space.xxl, gap: space.md },
  name: { ...type.cardTitle, color: colors.foreground },
  meta: { ...type.meta, color: colors.mutedForeground },
  caption: { ...type.caption, color: colors.mutedForeground, marginTop: space.xs },
  actions: { flexDirection: "row", gap: space.sm, marginTop: space.md },
});
