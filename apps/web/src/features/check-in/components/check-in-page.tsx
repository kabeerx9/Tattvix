import { useRouteContext } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";

import { checkInQueries } from "@/features/check-in/queries";
import type { CheckInStep } from "@/features/check-in/steps";

import { CheckInFlow } from "./check-in-flow";
import { CheckInStayStatus } from "./check-in-stay-status";
import { CheckInWelcome } from "./check-in-welcome";

/**
 * Guest QR check-in. Signed out: the hotel landing with sign-in. Signed in
 * with a live stay at this hotel: its status. Otherwise the step flow, whose
 * current step lives in the URL so the phone's back gesture moves between
 * steps.
 */
export function CheckInPage({
  token,
  step,
  edit,
}: {
  token: string;
  step: CheckInStep | undefined;
  edit: boolean;
}) {
  const { auth } = useRouteContext({ from: "__root__" });
  const { data: context } = useSuspenseQuery({
    ...checkInQueries.context(token),
    // Reception's actions (room assigned, checked in) show up without a reload.
    refetchInterval: (query) =>
      query.state.data?.existingStay && query.state.data.existingStay.operationalStatus !== "CHECKED_OUT"
        ? 5000
        : false,
  });
  const [newVisit, setNewVisit] = useState(false);
  const redirect = `/check-in/${token}`;

  if (!auth.isAuthenticated) {
    return <CheckInWelcome property={context.property} signedIn={false} redirect={redirect} onStart={() => {}} />;
  }

  if (context.existingStay && !newVisit) {
    return (
      <CheckInStayStatus
        token={token}
        stay={context.existingStay}
        propertyName={context.property.name}
        onNewVisit={() => setNewVisit(true)}
      />
    );
  }

  return (
    <CheckInFlow
      token={token}
      step={step}
      edit={edit}
      context={context}
      onSubmitted={() => setNewVisit(false)}
    />
  );
}
