import { useAuth } from "@clerk/expo";
import { useMutation } from "@tanstack/react-query";
import { describeAccountDeletionFailure } from "@tattvix/api";
import { useRouter } from "expo-router";
import { Trash2 } from "lucide-react-native";
import { useState } from "react";

import { ConfirmSheet, ListRow } from "@/src/design-system";
import { api } from "@/src/lib/api";

// Google Play requires in-app account deletion. The server removes the
// person's own data and their Clerk user; hotels keep an anonymised stay
// record. On success the session is ended and the app returns to sign-in.
export function DeleteAccountRow() {
  const { signOut } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const mutation = useMutation({
    mutationFn: () => api.currentUser.deleteAccount(),
    onSuccess: async () => {
      setOpen(false);
      await signOut();
      router.replace("/sign-in");
    },
  });

  return (
    <>
      <ListRow
        title="Delete account"
        detail="Removes your profile, companions and ID documents."
        icon={Trash2}
        chevron
        onPress={() => {
          mutation.reset();
          setOpen(true);
        }}
      />
      <ConfirmSheet
        open={open}
        onClose={() => {
          if (!mutation.isPending) setOpen(false);
        }}
        title="Delete your account?"
        description="Your profile, companions and ID documents are deleted now and cannot be recovered. Hotels you stayed at keep a record of the stay without your name or documents, as the law requires."
        confirmLabel="Delete my account"
        tone="destructive"
        loading={mutation.isPending}
        error={mutation.isError ? describeAccountDeletionFailure(mutation.error) : undefined}
        onConfirm={() => mutation.mutate()}
      />
    </>
  );
}
