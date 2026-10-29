import { useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import type { LucideIcon } from "lucide-react-native";
import { useCallback, useState, type PropsWithChildren, type ReactNode } from "react";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { RefreshControl, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";

import { colors, fonts, guestCard, space, type } from "./theme";

/**
 * A flat page whose title sits on a teal band, with one summary line inside it
 * (Profile: how ready the guest is; Privacy: who can see their ID). Below the
 * band the page is the usual white. Photos stay on the hubs; this is how a
 * flat page gets its colour.
 */
export function BandScreen({
  title,
  meta,
  action,
  summary,
  refreshing = false,
  onRefresh,
  children,
}: PropsWithChildren<{
  title: string;
  meta?: string;
  action?: ReactNode;
  summary?: { leading: ReactNode; title: string; detail?: string };
  refreshing?: boolean;
  onRefresh?: () => void;
}>) {
  const insets = useSafeAreaInsets();
  // Only the focused screen owns the status bar, or a background tab overrides it.
  const [focused, setFocused] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  // Light status-bar text over the band, dark once the band has scrolled away.
  const [pastBand, setPastBand] = useState(false);
  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const past = event.nativeEvent.contentOffset.y > 120;
    if (past !== pastBand) setPastBand(past);
  };

  return (
    <View style={styles.root}>
      {focused ? <StatusBar style={pastBand ? "dark" : "light"} /> : null}
      <KeyboardAwareScrollView
        bottomOffset={space.xl}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScroll={onScroll}
        scrollEventThrottle={32}
        refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} progressViewOffset={insets.top} tintColor={colors.mutedForeground} colors={[colors.foreground]} /> : undefined}
      >
        <LinearGradient colors={guestCard.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.band, { paddingTop: insets.top + space.lg }]}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text accessibilityRole="header" style={styles.title}>
                {title}
              </Text>
              {meta ? <Text style={styles.meta}>{meta}</Text> : null}
            </View>
            {action}
          </View>
          {summary ? (
            <View style={styles.summary}>
              {summary.leading}
              <View style={{ flex: 1 }}>
                <Text style={styles.summaryTitle}>{summary.title}</Text>
                {summary.detail ? (
                  <Text style={styles.summaryDetail} numberOfLines={2}>
                    {summary.detail}
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null}
        </LinearGradient>
        <View style={styles.body}>{children}</View>
      </KeyboardAwareScrollView>
    </View>
  );
}

/** A small white ring for the band: how much of something is done. */
export function ProgressRing({ done, total, size = 40 }: { done: number; total: number; size?: number }) {
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const share = total ? Math.min(1, done / total) : 0;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: total, now: done }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(255,255,255,0.22)" strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#ffffff"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference * share} ${circumference}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text style={styles.ringText}>{share === 1 ? "✓" : `${done}/${total}`}</Text>
    </View>
  );
}

/** The band's leading icon when there is nothing to count. */
export function BandIcon({ icon: Icon }: { icon: LucideIcon }) {
  return <Icon color="#ffffff" size={22} strokeWidth={1.8} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: space.xxxl },
  band: { paddingHorizontal: space.xl, paddingBottom: space.xl, borderBottomLeftRadius: 26, borderBottomRightRadius: 26 },
  titleRow: { flexDirection: "row", alignItems: "flex-end", gap: 12, marginTop: 12 },
  title: { ...type.largeTitle, color: "#ffffff" },
  meta: { ...type.meta, marginTop: 6, color: "rgba(255,255,255,0.78)" },
  summary: { flexDirection: "row", alignItems: "center", gap: space.md, marginTop: space.lg, paddingVertical: 10, paddingHorizontal: space.md, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.12)" },
  summaryTitle: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20, color: "#ffffff" },
  summaryDetail: { ...type.meta, fontSize: 13, color: "rgba(255,255,255,0.8)" },
  ringText: { fontFamily: fonts.bold, fontSize: 11, color: "#ffffff" },
  body: { paddingHorizontal: space.xl },
});
