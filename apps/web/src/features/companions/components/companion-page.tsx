// One travel companion: their saved details (Edit opens the editor sheet),
// their identity documents, and removing them. Mirrors
// apps/native/app/(guest)/companions/[companionId].tsx.
import { companionMissingFieldLabels, getCompanionFacts, personName } from "@tattvix/api";
import { Button } from "@tattvix/ui/components/button";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog, EmptyState, FactList, PageHeader, Panel, SectionTitle } from "@/components/design-system";
import { companionMutations } from "@/features/companions/mutations";
import { companionQueries } from "@/features/companions/queries";
import { IdentityDocumentsSection } from "@/features/identity-documents/components/identity-documents-section";
import { ApiError } from "@/lib/api";
import { UsersRound } from "lucide-react";

import { CompanionEditorSheet, mutationError } from "./companions-page";

export function CompanionPage({ companionId }: { companionId: string }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data } = useSuspenseQuery(companionQueries.list());
  const companion = data.companions.find((item) => String(item.id) === companionId) ?? null;
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const updateMutation = useMutation(companionMutations.update(queryClient));
  const removeMutation = useMutation(companionMutations.remove(queryClient));

  if (!companion) {
    return (
      <Panel className="mx-auto w-full max-w-3xl">
        <EmptyState
          icon={UsersRound}
          title="This companion is no longer saved"
          description="They may have been removed on another device."
          action={<Button nativeButton={false} variant="outline" render={<Link to="/companions" />}>All companions</Button>}
        />
      </Panel>
    );
  }

  const name = personName(companion, "Unnamed companion");
  const missing = companion.readiness.missingFields.map((field) => companionMissingFieldLabels[field]);
  const removeError = removeMutation.error instanceof ApiError ? removeMutation.error.message : removeMutation.isError ? "The companion could not be removed." : null;

  return (
    <div className="mx-auto grid max-w-3xl gap-8">
      <PageHeader
        title={name}
        meta={missing.length ? `Still needed: ${missing.join(", ")}` : undefined}
        actions={<Button nativeButton={false} variant="outline" render={<Link to="/companions" />}>All companions</Button>}
      />

      <section className="grid gap-3">
        <SectionTitle
          title="Details"
          action={
            <button
              type="button"
              onClick={() => {
                updateMutation.reset();
                setEditing(true);
              }}
              className="text-sm font-semibold underline underline-offset-4 outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
            >
              Edit
            </button>
          }
        />
        <Panel>
          <FactList facts={getCompanionFacts(companion)} />
        </Panel>
      </section>

      <IdentityDocumentsSection companionId={companion.id} participantName={name} />

      <div>
        <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setRemoving(true)}>
          Remove companion
        </Button>
      </div>

      <CompanionEditorSheet
        open={editing}
        onOpenChange={setEditing}
        companion={companion}
        isSaving={updateMutation.isPending}
        submitError={mutationError(updateMutation.error, updateMutation.isError)}
        onSubmit={(input) =>
          updateMutation.mutate(
            { id: companion.id, input },
            {
              onSuccess: () => {
                toast.success("Saved");
                setEditing(false);
              },
            },
          )
        }
      />
      <ConfirmDialog
        open={removing}
        onOpenChange={(open) => {
          if (!open && !removeMutation.isPending) setRemoving(false);
        }}
        title={`Remove ${name}?`}
        description={removeError ?? "Their details and saved ID documents are deleted."}
        confirmLabel="Remove companion"
        tone="destructive"
        pending={removeMutation.isPending}
        onConfirm={() =>
          removeMutation.mutate(companion.id, {
            onSuccess: () => {
              toast.success("Companion removed");
              void navigate({ to: "/companions" });
            },
          })
        }
      />
    </div>
  );
}
