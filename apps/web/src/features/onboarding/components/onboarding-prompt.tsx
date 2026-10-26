import type { OnboardingGuide } from "@tattvix/api";
import { Button } from "@tattvix/ui/components/button";
import { X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Panel } from "@/components/design-system";

import { dismissOnboardingPrompt, isOnboardingPromptDismissed } from "../storage";

export function OnboardingPrompt({ guide, storageKey, to, params }: { guide?: OnboardingGuide | null; storageKey: string; to: "/getting-started" | "/hotel/$organizationSlug/$propertySlug/getting-started"; params?: { organizationSlug: string; propertySlug: string } }) {
  return <ScopedPrompt key={storageKey} guide={guide} storageKey={storageKey} to={to} params={params} />;
}

function ScopedPrompt({ guide, storageKey, to, params }: Parameters<typeof OnboardingPrompt>[0]) {
  const [dismissed, setDismissed] = useState(() => isOnboardingPromptDismissed(storageKey));
  if (!guide || guide.isComplete || dismissed) return null;
  const next = guide.steps.find((step) => step.id === guide.nextStepId);
  return <Panel className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="text-sm font-semibold">{guide.completedCount} of {guide.totalCount} setup tasks complete</p><p className="mt-1 text-sm text-muted-foreground">{next ? `Next: ${next.title}` : guide.description}</p></div><div className="flex shrink-0 items-center gap-2"><Button nativeButton={false} size="sm" render={<Link to={to} params={params} />}>View setup</Button><Button size="icon-sm" variant="ghost" aria-label="Dismiss setup prompt" onClick={() => { dismissOnboardingPrompt(storageKey); setDismissed(true); }}><X /></Button></div></Panel>;
}
