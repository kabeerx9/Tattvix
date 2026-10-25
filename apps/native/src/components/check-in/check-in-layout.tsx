// Phone-first chrome for the check-in: a header with back and a segmented
// progress bar, one task per screen, and the primary action pinned at the
// bottom above the home indicator. Mirrors check-in-layout.tsx on the web.
import { checkInSteps, stepNumber, type CheckInStep } from "@tattvix/api";
import { ArrowLeft } from "lucide-react-native";
import type { PropsWithChildren, ReactNode } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BrandLogo, colors, space, type } from "@/src/design-system";

/** Brand bar for the screens outside the numbered steps (welcome, stay status, unavailable). */
export function CheckInBrandBar() {
  return (
    <SafeAreaView edges={["top"]} style={styles.brandSafe}>
      <View style={styles.brandBar}>
        <BrandLogo size="sm" />
        <Text style={styles.brandNote}>Secure hotel check-in</Text>
      </View>
    </SafeAreaView>
  );
}

/** Full-height page: scrolls the body, keeps the footer pinned. */
export function CheckInScaffold({
  header,
  footer,
  children,
}: PropsWithChildren<{ header?: ReactNode; footer?: ReactNode }>) {
  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.page}>
      {header}
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function StepHeader({
  step,
  propertyName,
  onBack,
}: {
  step: CheckInStep;
  propertyName: string;
  onBack: () => void;
}) {
  const current = stepNumber(step);
  return (
    <View style={styles.stepHeader}>
      <View style={styles.stepRow}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={8} onPress={onBack} style={styles.back}>
          <ArrowLeft color={colors.foreground} size={22} strokeWidth={2} />
        </Pressable>
        <View style={styles.stepCopy}>
          <Text numberOfLines={1} style={styles.stepProperty}>
            {propertyName}
          </Text>
          <Text style={styles.stepCount}>
            Step {current} of {checkInSteps.length}
          </Text>
        </View>
        <View style={styles.back} />
      </View>
      <View
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 1, max: checkInSteps.length, now: current }}
        style={styles.progress}
      >
        {checkInSteps.map((item, index) => (
          <View key={item} style={[styles.segment, index < current && styles.segmentDone]} />
        ))}
      </View>
    </View>
  );
}

/** Title and one line of orienting copy at the top of a step. */
export function StepIntro({ title, description }: { title: string; description?: string }) {
  return (
    <View style={styles.intro}>
      <Text accessibilityRole="header" style={styles.introTitle}>
        {title}
      </Text>
      {description ? <Text style={styles.introDescription}>{description}</Text> : null}
    </View>
  );
}

export function ErrorNotice({ children }: { children: string }) {
  return (
    <Text accessibilityRole="alert" style={styles.error}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { flex: 1, backgroundColor: colors.background },
  body: { paddingHorizontal: space.xl, paddingTop: space.xl, paddingBottom: space.xxxl, gap: space.xxl },
  footer: {
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    paddingBottom: space.md,
    gap: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  brandSafe: { backgroundColor: colors.background },
  brandBar: {
    height: 56,
    paddingHorizontal: space.xl,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  brandNote: { ...type.caption, color: colors.subtleForeground },
  stepHeader: { backgroundColor: colors.background, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderSoft },
  stepRow: { height: 56, flexDirection: "row", alignItems: "center", paddingHorizontal: space.sm },
  back: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  stepCopy: { flex: 1, alignItems: "center" },
  stepProperty: { ...type.caption, color: colors.subtleForeground },
  stepCount: { ...type.meta, color: colors.foreground, fontVariant: ["tabular-nums"] },
  progress: { flexDirection: "row", gap: space.xs, paddingHorizontal: space.xl, paddingBottom: space.md },
  // Progress uses the foreground, not the accent: rose is reserved for the primary action.
  segment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.muted },
  segmentDone: { backgroundColor: colors.foreground },
  intro: { gap: space.sm },
  introTitle: { ...type.sectionTitle, color: colors.foreground },
  introDescription: { ...type.body, color: colors.mutedForeground },
  error: { ...type.meta, color: colors.destructive },
});
