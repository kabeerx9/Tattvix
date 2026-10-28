// Who is travelling with the guest. Companions come from the saved list; each
// selected companion can optionally share one of their own complete IDs. A
// companion with missing details is completed in the shared companion sheet.
// Mirrors check-in-companions-step.tsx on the web.
import { companionKeys, documentLabel, personName } from "@tattvix/api";
import type { CompanionProfile } from "@tattvix/contracts";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { CompanionEditorSheet } from "@/src/components/companions/CompanionEditorSheet";
import { Button, InitialsAvatar, PillTabs, colors, space, type } from "@/src/design-system";
import { queries } from "@/src/lib/api";
import { initialsOf } from "@/src/lib/format";

import { ChoiceCard } from "./check-in-choice-card";

/** The API accepts at most 20 companions per check-in. */
const MAX_COMPANIONS = 20;

export function CompanionsStep({
  companions,
  selectedIds,
  documentIds,
  onToggle,
  onDocumentChange,
}: {
  companions: CompanionProfile[];
  selectedIds: number[];
  documentIds: Record<number, number>;
  onToggle: (id: number, selected: boolean) => void;
  onDocumentChange: (companionId: number, documentId: number | null) => void;
}) {
  const queryClient = useQueryClient();
  // null: closed; "new": adding; a companion: completing that one.
  const [editing, setEditing] = useState<CompanionProfile | "new" | null>(null);

  return (
    <View style={styles.stack}>
      {companions.map((companion) => {
        const ready = companion.readiness.isReady;
        const selected = selectedIds.includes(companion.id);
        const detail = [companion.relationship, companion.isMinor ? "Minor" : null].filter(Boolean).join(" · ");
        return (
          <ChoiceCard
            key={companion.id}
            kind="checkbox"
            selected={selected}
            disabled={!ready || (!selected && selectedIds.length >= MAX_COMPANIONS)}
            onPress={() => onToggle(companion.id, !selected)}
            leading={<InitialsAvatar initials={initialsOf(personName(companion, "?"))} name={personName(companion, "?")} size={40} />}
            title={personName(companion, "Unnamed companion")}
            description={ready ? detail : "Add the missing details to bring them along"}
          >
            {!ready ? (
              <Button label="Complete details" variant="outline" size="sm" onPress={() => setEditing(companion)} />
            ) : selected ? (
              <CompanionDocumentChoice
                companion={companion}
                documentId={documentIds[companion.id] ?? null}
                onChange={(documentId) => onDocumentChange(companion.id, documentId)}
              />
            ) : null}
          </ChoiceCard>
        );
      })}

      <Button
        label={companions.length ? "Add someone else" : "Add someone travelling with you"}
        variant="outline"
        icon={Plus}
        onPress={() => setEditing("new")}
      />

      <CompanionEditorSheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        companion={editing === "new" ? null : editing}
        onSaved={(companion) => {
          setEditing(null);
          void queryClient.invalidateQueries({ queryKey: companionKeys.list() });
          if (companion.readiness.isReady && !selectedIds.includes(companion.id)) onToggle(companion.id, true);
        }}
      />
    </View>
  );
}

/** Optional: share one of the companion's saved, complete IDs. Saving an ID never shares it. */
function CompanionDocumentChoice({
  companion,
  documentId,
  onChange,
}: {
  companion: CompanionProfile;
  documentId: number | null;
  onChange: (documentId: number | null) => void;
}) {
  const documents = useQuery(queries.identityDocuments.list(companion.id));
  if (documents.isPending) return <Text style={styles.caption}>Loading saved IDs…</Text>;
  if (documents.isError) {
    return (
      <View style={styles.inline}>
        <Text style={styles.error}>Could not load {companion.legalFirstName}’s IDs.</Text>
        <Button label="Retry" variant="outline" size="sm" onPress={() => void documents.refetch()} />
      </View>
    );
  }
  const ready = documents.data.documents.filter((document) => document.readiness.isReady);
  if (!ready.length) {
    return <Text style={styles.caption}>No saved ID. The hotel may ask to see one at the desk.</Text>;
  }
  const items = [
    { key: "none", label: "Don’t share an ID" },
    ...ready.map((document) => ({ key: String(document.id), label: documentLabel(document) })),
  ];
  return (
    <View style={styles.choice}>
      <Text style={styles.label}>{companion.legalFirstName}’s ID (optional)</Text>
      <PillTabs items={items} value={documentId ? String(documentId) : "none"} onChange={(key) => onChange(key === "none" ? null : Number(key))} />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space.md },
  caption: { ...type.caption, color: colors.subtleForeground },
  error: { ...type.caption, color: colors.destructive, flex: 1 },
  inline: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.md },
  choice: { gap: space.sm },
  label: { ...type.label, color: colors.foreground },
});
