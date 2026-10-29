import type { IdentityDocument } from "@tattvix/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { ApiError } from "@/lib/api";

import {
  IdentityDocumentSaveError,
  identityDocumentMutations,
  type IdentityDocumentSaveInput,
  type IdentityDocumentSaveProgress,
} from "./mutations";

/**
 * Save wiring shared by every document editor: upload progress, a success
 * toast, and partial-failure recovery (details saved, a photo failed), which
 * reports the saved draft so a retry updates it instead of duplicating it.
 */
export function useDocumentSave(
  companionId: number | undefined,
  {
    onSaved,
    onDraftSaved,
  }: {
    onSaved: (document: IdentityDocument) => void;
    onDraftSaved: (document: IdentityDocument) => void;
  },
) {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<IdentityDocumentSaveProgress | null>(null);
  const mutation = useMutation(identityDocumentMutations.save(queryClient, companionId));

  function save(input: IdentityDocumentSaveInput) {
    setProgress(null);
    mutation.mutate(
      { ...input, onProgress: setProgress },
      {
        onSuccess: (document) => {
          toast.success(input.documentId ? "Document updated" : "Document added");
          onSaved(document);
        },
        onError: (error) => {
          if (error instanceof IdentityDocumentSaveError) onDraftSaved(error.document);
        },
        onSettled: () => setProgress(null),
      },
    );
  }

  const error = mutation.error;
  const submitError =
    error instanceof IdentityDocumentSaveError || error instanceof ApiError
      ? error.message
      : error
        ? "The document could not be saved."
        : null;

  return {
    save,
    reset: mutation.reset,
    isSaving: mutation.isPending,
    progress,
    submitError,
    /** The refusal itself, unwrapped from a draft save, so the editor can place the server's field messages. */
    saveError: error instanceof IdentityDocumentSaveError ? error.originalError : error,
  };
}
