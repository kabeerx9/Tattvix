// The person's identity documents: a list that opens the viewer, and an Add
// action that opens the editor. Mirrors
// apps/web/src/features/identity-documents/components/identity-documents-section.tsx.
// Photos are fetched only when a document is opened, never for the list.
import { documentImagesLabel, documentLabel, summarizeDocument } from "@tattvix/api";
import type { IdentityDocument, IdentityDocumentType } from "@tattvix/contracts";
import { useQuery } from "@tanstack/react-query";
import { BookUser, Car, IdCard, Vote, type LucideIcon } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Button, EmptyState, ListRow, Panel, GroupTitle, StatusPill, TextLink, colors, space, type } from "@/src/design-system";
import { queries } from "@/src/lib/api";

import { DocumentEditorSheet } from "./DocumentEditorSheet";
import { DocumentViewerSheet } from "./DocumentViewerSheet";

const typeIcons: Record<IdentityDocumentType, LucideIcon> = {
  AADHAAR: IdCard,
  PASSPORT: BookUser,
  DRIVING_LICENCE: Car,
  VOTER_ID: Vote,
};

const toneFor = { success: "success", warning: "warning", danger: "destructive", neutral: "neutral" } as const;

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function IdentityDocumentsSection({ companionId, title = "Identity documents" }: { companionId?: number; title?: string }) {
  const documents = useQuery(queries.identityDocuments.list(companionId));
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  // Kept while the editor animates out, so its title and content do not change mid-exit.
  const [editTarget, setEditTarget] = useState<IdentityDocument | null>(null);

  const list = documents.data?.documents ?? [];
  const viewing = viewingId !== null ? (list.find((item) => item.id === viewingId) ?? null) : null;

  function openEditor(target: IdentityDocument | null) {
    setEditTarget(target);
    setEditOpen(true);
  }

  let body: React.ReactNode;
  if (documents.isPending) {
    body = <Text style={styles.meta}>Loading documents…</Text>;
  } else if (documents.isError) {
    body = (
      <View style={styles.errorBlock}>
        <Text style={styles.error}>Documents couldn't be loaded.</Text>
        <Button label="Try again" variant="outline" size="sm" onPress={() => void documents.refetch()} />
      </View>
    );
  } else if (list.length === 0) {
    body = (
      <EmptyState
        icon={IdCard}
        text="Add Aadhaar, a passport, driving licence or voter ID once, and pick it at check-in. You can save a draft and finish it later."
        action={{ label: "Add document", onPress: () => openEditor(null) }}
      />
    );
  } else {
    body = (
      <Panel>
        {list.map((document) => {
          const summary = summarizeDocument(document);
          const Icon = (document.documentType && typeIcons[document.documentType]) || IdCard;
          return (
            <ListRow
              key={document.id}
              icon={Icon}
              title={documentLabel(document)}
              detail={capitalize(documentImagesLabel(document))}
              trailing={<StatusPill tone={toneFor[summary.tone]}>{summary.label}</StatusPill>}
              chevron
              onPress={() => setViewingId(document.id)}
            />
          );
        })}
      </Panel>
    );
  }

  return (
    <View style={styles.section}>
      <GroupTitle action={list.length ? <TextLink label="Add document" onPress={() => openEditor(null)} /> : undefined}>{title}</GroupTitle>
      <View style={styles.body}>{body}</View>

      {viewing ? (
        <DocumentViewerSheet
          open
          companionId={companionId}
          document={viewing}
          onClose={() => setViewingId(null)}
          onEdit={() => {
            // Unmount the viewer before the editor opens: two sheets must not be presented at once.
            setViewingId(null);
            openEditor(viewing);
          }}
        />
      ) : null}

      <DocumentEditorSheet open={editOpen} onClose={() => setEditOpen(false)} companionId={companionId} document={editTarget} />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: space.md },
  body: { gap: space.md },
  meta: { ...type.meta, color: colors.mutedForeground },
  errorBlock: { gap: space.md, alignItems: "flex-start" },
  error: { ...type.meta, color: colors.destructive },
});
