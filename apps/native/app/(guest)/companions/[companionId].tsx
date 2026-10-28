// One travel companion: their saved details (Edit opens the editor sheet),
// their identity documents, and removing them. Mirrors the companion page on web.
import { companionKeys, companionMissingFieldLabels, getCompanionFacts, identityDocumentKeys, personName } from "@tattvix/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { UsersRound } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { CompanionEditorSheet } from "@/src/components/companions/CompanionEditorSheet";
import { IdentityDocumentsSection } from "@/src/components/identity/IdentityDocumentsSection";
import { PendingScreen } from "@/src/components/status-screens";
import { Button, ConfirmSheet, EmptyState, Enter, FactRow, Panel, Screen, SecondaryHeader, SectionTitle, TextLink, colors, space, toast, type } from "@/src/design-system";
import { api, queries } from "@/src/lib/api";
import { errorMessage } from "@/src/lib/format";

export default function CompanionScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { companionId } = useLocalSearchParams<{ companionId: string }>();
  const query = useQuery(queries.companions.list());
  const companion = query.data?.companions.find((item) => String(item.id) === companionId) ?? null;
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState(false);

  const remove = useMutation({
    mutationFn: (id: number) => api.companions.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: companionKeys.list() });
      void queryClient.invalidateQueries({ queryKey: identityDocumentKeys.all });
      setRemoving(false);
      toast("Companion removed");
      router.back();
    },
  });

  if (!companion) {
    if (query.isPending) return <PendingScreen />;
    return (
      <Screen>
        <SecondaryHeader title="Companion" onBack={() => router.back()} />
        <View style={styles.section}>
          <EmptyState
            icon={UsersRound}
            text={query.isError ? "This companion could not be loaded." : "This companion is no longer saved."}
            action={query.isError ? { label: "Try again", onPress: () => void query.refetch(), variant: "outline" } : { label: "Back to companions", onPress: () => router.back(), variant: "outline" }}
          />
        </View>
      </Screen>
    );
  }

  const name = personName(companion, "Unnamed companion");
  const missing = companion.readiness.missingFields.map((field) => companionMissingFieldLabels[field]);

  return (
    <Screen refreshing={query.isFetching && !query.isPending} onRefresh={() => void query.refetch()}>
      <SecondaryHeader title="Companion" onBack={() => router.back()} />
      <Text accessibilityRole="header" style={styles.name}>
        {name}
      </Text>
      {missing.length ? <Text style={styles.meta}>{`Still needed: ${missing.join(", ")}`}</Text> : null}

      <Enter style={styles.section}>
        <SectionTitle action={<TextLink label="Edit" onPress={() => setEditing(true)} />}>Details</SectionTitle>
        <Panel>
          {getCompanionFacts(companion).map((fact) => (
            <FactRow key={fact.label} label={fact.label} value={fact.value} />
          ))}
        </Panel>
      </Enter>

      <Enter index={1} style={styles.section}>
        <IdentityDocumentsSection companionId={companion.id} title="Identity documents" />
      </Enter>

      <View style={styles.remove}>
        <Button label="Remove companion" variant="destructive" onPress={() => setRemoving(true)} />
      </View>

      <CompanionEditorSheet open={editing} onClose={() => setEditing(false)} companion={companion} />
      <ConfirmSheet
        open={removing}
        onClose={() => {
          if (!remove.isPending) setRemoving(false);
        }}
        title={`Remove ${name}?`}
        description={
          remove.isError
            ? errorMessage(remove.error, "The companion could not be removed.") ?? "The companion could not be removed."
            : "Their details and saved ID documents are deleted."
        }
        confirmLabel="Remove companion"
        tone="destructive"
        loading={remove.isPending}
        onConfirm={() => remove.mutate(companion.id)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  name: { ...type.pageTitle, color: colors.foreground, marginTop: space.sm },
  meta: { ...type.meta, color: colors.mutedForeground, marginTop: space.xs },
  section: { marginTop: space.xxl, gap: space.md },
  remove: { marginTop: space.xxxl, alignItems: "flex-start" },
});
