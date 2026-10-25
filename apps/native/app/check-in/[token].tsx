// The guest QR check-in: the page the hotel's QR opens (the web's
// /check-in/<token>). Works signed out (welcome, then sign-in resumes here),
// signed in with a live stay (its status), or signed in without one (the flow).
import { useAuth } from "@clerk/clerk-expo";
import { ApiError } from "@tattvix/contracts";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";

import { CheckInFlow } from "@/src/components/check-in/check-in-flow";
import { CheckInStayStatus } from "@/src/components/check-in/check-in-stay-status";
import { CheckInUnavailable } from "@/src/components/check-in/check-in-unavailable";
import { CheckInWelcome } from "@/src/components/check-in/check-in-welcome";
import { PendingScreen } from "@/src/components/status-screens";
import { queries } from "@/src/lib/api";
import { setPendingPath } from "@/src/lib/pending-path";

export default function CheckInRoute() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const [newVisit, setNewVisit] = useState(false);
  const context = useQuery({
    ...queries.checkIn.context(token),
    // Reception's actions (room assigned, checked in) show up without a reload.
    refetchInterval: (query) =>
      query.state.data?.existingStay && query.state.data.existingStay.operationalStatus !== "CHECKED_OUT" ? 5000 : false,
  });

  if (!isLoaded || context.isPending) return <PendingScreen />;

  if (context.isError) {
    if (context.error instanceof ApiError && context.error.status === 404) {
      return (
        <CheckInUnavailable
          title="This QR code is no longer active"
          description="Ask the front desk for the property’s current Tattwix check-in QR and scan it again."
          actionLabel="Return to Tattwix"
          onAction={() => router.replace("/")}
        />
      );
    }
    return (
      <CheckInUnavailable
        title="This check-in is temporarily unavailable"
        description="Check your connection or ask the front desk to try the property QR again."
        actionLabel="Try again"
        onAction={() => void context.refetch()}
      />
    );
  }

  const data = context.data;

  if (!isSignedIn) {
    return (
      <CheckInWelcome
        property={data.property}
        signedIn={false}
        onSignIn={() => {
          // Sign-in resumes this check-in once the guest is signed in.
          setPendingPath(`/check-in/${token}`);
          router.replace("/sign-in");
        }}
      />
    );
  }

  if (data.existingStay && !newVisit) {
    return (
      <CheckInStayStatus
        stay={data.existingStay}
        propertyName={data.property.name}
        graceHours={data.accessPolicy.postCheckoutGraceHours}
        onNewVisit={() => setNewVisit(true)}
      />
    );
  }

  return <CheckInFlow token={token} context={data} onSubmitted={() => setNewVisit(false)} />;
}
