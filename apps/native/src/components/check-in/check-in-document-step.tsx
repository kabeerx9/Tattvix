// Choose which saved, complete ID goes to the hotel. Adding or finishing an ID
// opens the shared document editor; a document that becomes ready there is
// chosen for the guest. Mirrors check-in-document-step.tsx on the web.
import { documentImagesLabel, documentLabel } from "@tattvix/api";
import type { IdentityDocument } from "@tattvix/contracts";
import { Plus } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { DocumentEditorSheet } from "@/src/components/identity/DocumentEditorSheet";
import { Button, StatusPill, colors, space, type } from "@/src/design-system";

import { ChoiceCard } from "./check-in-choice-card";
import { ErrorNotice } from "./check-in-layout";

export function DocumentStep({
  documents,
  documentId,
  showError,
  onSelect,
}: {
  documents: IdentityDocument[];
  documentId: number | null;
  showError: boolean;
  onSelect: (id: number) => void;
}) {
  // null: closed; "new": adding; a document: finishing that one.
  const [editing, setEditing] = useState<IdentityDocument | "new" | null>(null);
  const knownReady = useRef<Set<number> | null>(null);

  useEffect(() => {
    const ready = documents.filter((document) => document.readiness.isReady);
    const previous = knownReady.current ?? new Set(ready.map((document) => document.id));
    const fresh = ready.find((document) => !previous.has(document.id));
    knownReady.current = new Set(ready.map((document) => document.id));
    if (fresh) onSelect(fresh.id);
    else if (documentId === null && ready[0]) onSelect(ready[0].id);
  }, [documents, documentId, onSelect]);

  const readyCount = documents.filter((document) => document.readiness.isReady).length;

  return (
    <View style={styles.stack}>
      {/* Aadhaar (Sharing of Information) Regulations reg 5(1)(b): say it is optional and name the alternatives. */}
      <Text style={styles.note}>Aadhaar is optional. A passport, driving licence or voter ID works too.</Text>

      {documents.length ? (
        <View style={styles.list}>
          {documents.map((document) => {
            const isReady = document.readiness.isReady;
            const missing = document.readiness.missingFields.length;
            return (
              <ChoiceCard
                key={document.id}
                kind="radio"
                selected={isReady && document.id === documentId}
                disabled={!isReady}
                onPress={() => onSelect(document.id)}
                title={documentLabel(document)}
                description={
                  isReady
                    ? `Ready, with ${documentImagesLabel(document)}`
                    : `${missing} ${missing === 1 ? "detail" : "details"} needed before it can be shared`
                }
              >
                {isReady ? null : (
                  <View style={styles.incomplete}>
                    <StatusPill tone="warning">Incomplete</StatusPill>
                    <Button label="Finish this ID" variant="outline" size="sm" onPress={() => setEditing(document)} />
                  </View>
                )}
              </ChoiceCard>
            );
          })}
        </View>
      ) : null}

      {showError ? <ErrorNotice>{readyCount ? "Choose the ID to share with the hotel." : "Add an ID with its photos to continue."}</ErrorNotice> : null}

      <Button
        label={documents.length ? "Add another ID" : "Add your ID"}
        variant={documents.length ? "outline" : "primary"}
        icon={Plus}
        onPress={() => setEditing("new")}
      />

      <DocumentEditorSheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        document={editing === "new" ? null : editing}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space.lg },
  note: { ...type.caption, color: colors.subtleForeground },
  list: { gap: space.md },
  incomplete: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.md },
});
