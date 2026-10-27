import type { OnboardingGuide, OnboardingStep } from "@tattvix/api";
import { Button } from "@tattvix/ui/components/button";
import { cn } from "@tattvix/ui/lib/utils";
import { Check, ChevronDown, Circle, Lightbulb, RefreshCw } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { PageHeader, Panel, PanelHeader, PanelSection } from "@/components/design-system";

type Scope = { organizationSlug?: string; propertySlug?: string };

function actionTarget(step: OnboardingStep, scope: Scope) {
  if (step.action === "profile") return { to: "/profile" as const };
  if (step.action === "identity") return { to: "/profile" as const, hash: "identity-documents" };
  if (!scope.organizationSlug || !scope.propertySlug) return null;
  return step.action === "property"
    ? { to: "/hotel/$organizationSlug/$propertySlug/details" as const, params: scope as Required<Scope> }
    : { to: "/hotel/$organizationSlug/$propertySlug/rooms" as const, params: scope as Required<Scope> };
}

export function OnboardingGuidePage({
  guide,
  scope,
  isLoading,
  isError,
  onRetry,
  readOnly = false,
}: {
  guide?: OnboardingGuide | null;
  scope?: Scope;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  readOnly?: boolean;
}) {
  if (isLoading && !guide) return <GuideStatus title="Loading your setup" description="Checking the latest saved progress…" action={<GuideExit scope={scope} />} />;
  if (isError || !guide) return <GuideStatus title="Setup could not load" description="Your saved progress is still safe. Check your connection and try again." action={<div className="flex flex-wrap justify-center gap-3"><Button onClick={onRetry}><RefreshCw />Try again</Button><GuideExit scope={scope} /></div>} />;

  const next = guide.steps.find((step) => step.id === guide.nextStepId) ?? guide.steps.find((step) => !step.isComplete);
  return (
    <div className="mx-auto grid w-full max-w-4xl gap-6">
      <PageHeader title="Getting started" meta={`${guide.completedCount} of ${guide.totalCount} complete`} />
      <Panel className="overflow-hidden">
        <PanelHeader title={guide.isComplete ? guide.completeTitle : guide.title} />
        <PanelSection>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{guide.isComplete ? guide.completeDescription : guide.description}</p>
          {!guide.isComplete ? <p className="mt-2 text-sm leading-6 text-muted-foreground">Setup is optional. Explore now and finish these tasks later from Help.</p> : null}
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Setup progress" aria-valuemin={0} aria-valuemax={guide.totalCount} aria-valuenow={guide.completedCount} aria-valuetext={`${guide.completedCount} of ${guide.totalCount} tasks complete`}>
            <div className="h-full origin-left bg-foreground transition-transform duration-(--duration-move) ease-out motion-reduce:transition-none" style={{ transform: `scaleX(${guide.totalCount ? guide.completedCount / guide.totalCount : 0})` }} />
          </div>
          {next && !readOnly ? <div className="mt-5"><GuideAction step={next} scope={scope ?? {}} primary /></div> : null}
          <div className="mt-5"><GuideExit scope={scope} complete={guide.isComplete} /></div>
          {readOnly && !guide.isComplete ? <p className="mt-5 text-sm leading-6 text-muted-foreground">Your subscription is not active, so setup changes are unavailable. You can still review these steps.</p> : null}
        </PanelSection>
      </Panel>
      <Panel className="overflow-hidden">
        <PanelHeader title="Your tasks" />
        <div>{guide.steps.map((step) => <TaskRow key={step.id} step={step} scope={scope ?? {}} readOnly={readOnly} />)}</div>
      </Panel>
      {guide.tips.length ? <Panel><PanelHeader title="Helpful to know" icon={Lightbulb} /><div>{guide.tips.map((tip) => <details key={tip.id} className="group border-t border-border-soft first:border-t-0"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"><span>{tip.title}</span><ChevronDown className="size-4 text-muted-foreground group-open:rotate-180 motion-reduce:transition-none" style={{ transition: "transform var(--duration-press) var(--ease-out)" }} /></summary><p className="border-t border-border-soft px-5 py-4 text-sm leading-6 text-muted-foreground">{tip.body}</p></details>)}</div></Panel> : null}
    </div>
  );
}

function GuideExit({ scope, complete = false }: { scope?: Scope; complete?: boolean }) {
  const variant = complete ? "default" : "outline";
  if (scope?.organizationSlug && scope.propertySlug) return <Button nativeButton={false} variant={variant} render={<Link to="/hotel/$organizationSlug/$propertySlug/dashboard" params={{ organizationSlug: scope.organizationSlug, propertySlug: scope.propertySlug }} />}>{complete ? "Go to Today" : "Skip for now"}</Button>;
  return <Button nativeButton={false} variant={variant} render={<Link to="/guest" />}>{complete ? "Back to your travels" : "Skip for now"}</Button>;
}

function GuideStatus({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return <div className="mx-auto grid min-h-[45svh] max-w-xl place-items-center text-center"><div><h1 className="text-xl font-semibold tracking-tight">{title}</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>{action ? <div className="mt-5">{action}</div> : null}</div></div>;
}

function GuideAction({ step, scope, primary = false }: { step: OnboardingStep; scope: Scope; primary?: boolean }) {
  const target = actionTarget(step, scope);
  if (!target) return null;
  return <Button nativeButton={false} className="max-w-full whitespace-normal text-left" variant={primary ? "default" : "outline"} render={<Link {...target} />}><>{step.actionLabel}</></Button>;
}

function TaskRow({ step, scope, readOnly }: { step: OnboardingStep; scope: Scope; readOnly: boolean }) {
  return <div className="grid grid-cols-[20px_minmax(0,1fr)] items-start gap-x-4 gap-y-3 border-t border-border-soft px-5 py-5 first:border-t-0 sm:grid-cols-[20px_minmax(0,1fr)_auto] sm:items-center">
    {step.isComplete ? <Check className="size-5 shrink-0 text-foreground" aria-label="Complete" /> : <Circle className="size-5 shrink-0 text-muted-foreground" aria-label="Not complete" />}
    <div className="min-w-0 flex-1"><p className={cn("text-sm font-medium", step.isComplete && "text-muted-foreground")}>{step.title}</p><p className="mt-1 text-sm leading-5 text-muted-foreground">{step.description}</p></div>
    {!readOnly ? <div className="col-start-2 w-fit sm:col-start-3"><GuideAction step={step} scope={scope} /></div> : null}
  </div>;
}
