import { ChevronDown, ChevronUp, CircleCheck, CircleDashed, X } from "lucide-react-native";
import type { OnboardingAction, OnboardingGuide } from "@tattvix/api";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Button, Card, ListRow, Panel, Screen, SecondaryHeader, SectionTitle, Spinner, TextLink, colors, radii, space, type } from "@/src/design-system";
import { shouldShowOnboardingPrompt } from "@/src/lib/onboarding-paths";

export function OnboardingStatus({ failed, onRetry, onExit }: { failed: boolean; onRetry: () => void; onExit: () => void }) {
  return <Screen>
    <SecondaryHeader title="Getting started" onBack={onExit} />
    <View style={styles.progress}>
      <Text style={styles.guideTitle}>{failed ? "Setup could not load" : "Loading your setup"}</Text>
      <Text style={styles.guideDescription}>{failed ? "Your saved progress is still safe. Try again, or explore and return later." : "Checking your saved progress. You can explore while setup loads."}</Text>
      {failed ? <Button label="Try again" onPress={onRetry} /> : <Spinner color={colors.mutedForeground} />}
      <Button label="Skip for now" variant="outline" onPress={onExit} />
    </View>
  </Screen>;
}

/**
 * Nudge back into setup. `compact` is the quiet one-line row for work screens
 * (hotel Today), where it sits below the work instead of above it.
 */
export function OnboardingPrompt({ guide, dismissed, onOpen, onDismiss, readOnly = false, compact = false }: { guide: OnboardingGuide; dismissed: boolean; onOpen: () => void; onDismiss: () => void; readOnly?: boolean; compact?: boolean }) {
  if (readOnly || !shouldShowOnboardingPrompt({ isComplete: guide.isComplete, dismissed })) return null;
  const dismissButton = (
    <Pressable accessibilityRole="button" accessibilityLabel="Dismiss getting started" hitSlop={10} onPress={onDismiss} style={compact ? styles.rowDismiss : styles.dismiss}>
      <X size={18} color={colors.mutedForeground} strokeWidth={1.8} />
    </Pressable>
  );
  if (compact) {
    return (
      <View style={styles.row}>
        <Text style={styles.rowText} numberOfLines={1}>Finish setup · {guide.completedCount} of {guide.totalCount} done</Text>
        <TextLink label="Continue" onPress={onOpen} />
        {dismissButton}
      </View>
    );
  }
  const next = guide.steps.find((step) => step.id === guide.nextStepId);
  return (
    <Card style={styles.prompt}>
      <View style={styles.promptTop}>
        <View style={styles.promptCopy}>
          <Text style={styles.eyebrow}>Getting started</Text>
          <Text style={styles.promptTitle}>{guide.completedCount} of {guide.totalCount} ready</Text>
          <Text style={styles.promptDetail}>{next ? `Next: ${next.title}` : guide.description}</Text>
        </View>
        {dismissButton}
      </View>
      <Button label="Continue setup" onPress={onOpen} />
    </Card>
  );
}

export function OnboardingGuide({ guide, onStep, onExit, readOnly = false }: { guide: OnboardingGuide; onStep: (action: OnboardingAction) => void; onExit: () => void; readOnly?: boolean }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const next = guide.steps.find((step) => step.id === guide.nextStepId);
  const heading = guide.isComplete ? guide.completeTitle : guide.title;
  const description = guide.isComplete ? guide.completeDescription : guide.description;

  return (
    <View style={styles.guide}>
      <Card style={styles.progress}>
        <Text style={styles.eyebrow}>{guide.isComplete ? "Ready" : "Getting started"}</Text>
        <Text style={styles.guideTitle}>{heading}</Text>
        <Text style={styles.guideDescription}>{description}</Text>
        {!guide.isComplete ? <Text style={styles.guideDescription}>Setup is optional. Explore now and finish these tasks later from Help.</Text> : null}
        <Text style={styles.progressText}>{guide.completedCount} of {guide.totalCount} tasks complete</Text>
        <View style={styles.progressTrack} accessibilityRole="progressbar" accessibilityLabel="Setup progress" accessibilityValue={{ min: 0, max: guide.totalCount, now: guide.completedCount, text: `${guide.completedCount} of ${guide.totalCount} tasks complete` }}>
          <View style={[styles.progressFill, { width: `${guide.totalCount ? guide.completedCount / guide.totalCount * 100 : 0}%` }]} />
        </View>
        {readOnly ? <Text style={styles.readOnly}>Your subscription is not active, so setup changes are unavailable.</Text> : !guide.isComplete && next ? <Button label={next.actionLabel} onPress={() => onStep(next.action)} /> : null}
        <Button variant={guide.isComplete ? "primary" : "outline"} label={guide.isComplete ? (guide.kind === "hotel" ? "Go to Today" : "Back to your travels") : "Skip for now"} onPress={onExit} />
      </Card>

      <View style={styles.section}>
        <SectionTitle>Setup tasks</SectionTitle>
        <Panel>
          {guide.steps.map((step) => (
            <ListRow
              key={step.id}
              icon={step.isComplete ? CircleCheck : CircleDashed}
              title={step.title}
              detail={step.description}
              titleLines={0}
              detailLines={0}
              trailing={!step.isComplete && !readOnly ? <Text style={styles.action}>{step.id === guide.nextStepId ? "Next" : "Open"}</Text> : <Text style={styles.done}>{step.isComplete ? "Done" : "Unavailable"}</Text>}
              chevron={!readOnly}
              onPress={readOnly ? undefined : () => onStep(step.action)}
            />
          ))}
        </Panel>
      </View>

      <View style={styles.section}>
        <SectionTitle>Helpful to know</SectionTitle>
        <Panel>
          {guide.tips.map((tip) => {
            const open = expanded === tip.id;
            return (
              <Pressable key={tip.id} accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setExpanded(open ? null : tip.id)}>
                <View style={styles.tip}>
                  <View style={styles.tipCopy}>
                    <Text style={styles.tipTitle}>{tip.title}</Text>
                    {open ? <Text style={styles.tipBody}>{tip.body}</Text> : null}
                  </View>
                  {open ? <ChevronUp size={18} color={colors.mutedForeground} /> : <ChevronDown size={18} color={colors.mutedForeground} />}
                </View>
              </Pressable>
            );
          })}
        </Panel>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  prompt: { gap: space.md, padding: space.lg },
  promptTop: { flexDirection: "row", alignItems: "flex-start", gap: space.md },
  promptCopy: { flex: 1, gap: 3 },
  eyebrow: { ...type.caption, color: colors.subtleForeground },
  promptTitle: { ...type.rowTitle, color: colors.foreground },
  promptDetail: { ...type.caption, color: colors.mutedForeground },
  row: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 48, paddingLeft: space.lg, backgroundColor: colors.card, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderSoft, borderRadius: radii.card },
  rowText: { ...type.meta, color: colors.mutedForeground, flex: 1 },
  rowDismiss: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  dismiss: { minWidth: 40, minHeight: 40, alignItems: "center", justifyContent: "center", marginTop: -space.sm, marginRight: -space.sm },
  guide: { gap: space.xxxl },
  progress: { gap: space.md, padding: space.xl },
  guideTitle: { ...type.pageTitle, color: colors.foreground },
  guideDescription: { ...type.body, color: colors.mutedForeground },
  progressText: { ...type.meta, color: colors.mutedForeground, fontVariant: ["tabular-nums"] },
  progressTrack: { height: 4, backgroundColor: colors.muted, borderRadius: radii.pill, overflow: "hidden" },
  progressFill: { height: 4, backgroundColor: colors.foreground },
  section: { gap: space.md },
  action: { ...type.caption, color: colors.foreground },
  done: { ...type.caption, color: colors.mutedForeground },
  readOnly: { ...type.caption, color: colors.mutedForeground },
  tip: { flexDirection: "row", gap: space.md, alignItems: "flex-start", minHeight: 56, paddingHorizontal: space.lg, paddingVertical: space.md },
  tipCopy: { flex: 1, gap: space.sm },
  tipTitle: { ...type.rowTitle, color: colors.foreground },
  tipBody: { ...type.caption, color: colors.mutedForeground },
});
