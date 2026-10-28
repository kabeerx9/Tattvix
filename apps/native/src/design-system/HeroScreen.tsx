import { Image, type ImageSource } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import type { LucideIcon } from "lucide-react-native";
import { useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useState, type PropsWithChildren, type ReactNode } from "react";
import { Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import Animated, { Extrapolation, interpolate, useAnimatedReaction, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { usePressFeedback } from "./press";
import { Screen } from "./Screen";
import { LargeTitle } from "./Titles";
import { colors, fonts, radii, space, type } from "./theme";

// Hubs (Today, guest Home) get the tall photo; other guest pages a shorter cover.
const HEIGHTS = { hub: 260, page: 196 } as const;
const SHEET_OVERLAP = 24;

type HeroScreenProps = PropsWithChildren<{
  /** A real photo (hotel cover) or a bundled decorative one. Null falls back to a plain large title. */
  image: string | ImageSource | null | undefined;
  /** Small line above the title, e.g. the date. */
  eyebrow?: string;
  title: string;
  /** One short line under the title. */
  subtitle?: string;
  size?: keyof typeof HEIGHTS;
  /** A compact action pinned to the top-right of the photo, e.g. the check-in QR. */
  action?: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
}>;

// Photo-led hub screen: the place's photo fills the top, the title sits on a
// scrim, and the content rides up over it on a white sheet. The photo moves at
// half speed while scrolling; past it, a compact title bar fades in so the
// status bar stays legible. Without a photo it is an ordinary Screen with a
// LargeTitle: we never put a stand-in image where a hotel's own photo belongs.
export function HeroScreen({ image, eyebrow, title, subtitle, size = "hub", action, refreshing = false, onRefresh, children }: HeroScreenProps) {
  const insets = useSafeAreaInsets();
  const hero = HEIGHTS[size];
  // Only the focused screen owns the status bar, or a background tab overrides it.
  const [focused, setFocused] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  const scrollY = useSharedValue(0);
  const [pastHero, setPastHero] = useState(false);
  const [failed, setFailed] = useState(false);

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });
  const collapseAt = hero + insets.top - SHEET_OVERLAP - 56;
  useAnimatedReaction(
    () => scrollY.value > collapseAt,
    (past, previous) => {
      if (past !== previous) scheduleOnRN(setPastHero, past);
    },
  );

  const photoStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(scrollY.value, [0, hero], [0, hero / 2], Extrapolation.CLAMP) }],
  }));
  const copyStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, hero * 0.6], [1, 0], Extrapolation.CLAMP),
  }));
  const barStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [collapseAt - 24, collapseAt], [0, 1], Extrapolation.CLAMP),
  }));

  if (!image || failed) {
    return (
      <Screen refreshing={refreshing} onRefresh={onRefresh}>
        {focused ? <StatusBar style="dark" /> : null}
        <LargeTitle meta={subtitle ?? eyebrow} action={action}>
          {title}
        </LargeTitle>
        {children}
      </Screen>
    );
  }

  const heroHeight = hero + insets.top;
  return (
    <View style={styles.root}>
      {focused ? <StatusBar style={pastHero ? "dark" : "light"} /> : null}
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} progressViewOffset={insets.top} tintColor={colors.mutedForeground} colors={[colors.foreground]} /> : undefined}
      >
        <Animated.View style={[{ height: heroHeight }, photoStyle]}>
          <Image source={typeof image === "string" ? { uri: image } : image} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} onError={() => setFailed(true)} accessible={false} />
          <LinearGradient colors={["rgba(0,0,0,0.32)", "rgba(0,0,0,0)"]} locations={[0, 0.35]} style={StyleSheet.absoluteFill} />
          <LinearGradient colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.6)"]} locations={[0.45, 1]} style={StyleSheet.absoluteFill} />
          <Animated.View style={[styles.copy, { bottom: SHEET_OVERLAP + space.lg }, copyStyle]}>
            {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
            <Text accessibilityRole="header" style={styles.title} numberOfLines={2}>
              {title}
            </Text>
            {subtitle ? <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text> : null}
          </Animated.View>
        </Animated.View>
        <View style={styles.sheet}>{children}</View>
      </Animated.ScrollView>

      <Animated.View pointerEvents={pastHero ? "auto" : "none"} style={[styles.bar, { paddingTop: insets.top, height: insets.top + 52 }, barStyle]}>
        <Text style={styles.barTitle} numberOfLines={1}>
          {title}
        </Text>
      </Animated.View>
      {action ? <View style={[styles.action, { top: insets.top + space.sm }]}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  copy: { position: "absolute", left: space.xl, right: space.xl },
  eyebrow: { ...type.meta, color: "rgba(255,255,255,0.88)" },
  title: { ...type.largeTitle, color: "#ffffff", marginTop: 2 },
  subtitle: { ...type.meta, color: "rgba(255,255,255,0.88)", marginTop: space.xs },
  sheet: {
    marginTop: -SHEET_OVERLAP,
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.sheet + 4,
    borderTopRightRadius: radii.sheet + 4,
    paddingHorizontal: space.xl,
    paddingTop: space.xl,
    paddingBottom: space.xxxl,
    minHeight: 600,
  },
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSoft,
    justifyContent: "center",
  },
  // Left-aligned so the pinned action on the right never crowds it.
  barTitle: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22, color: colors.foreground, paddingLeft: space.xl, paddingRight: 150 },
  action: { position: "absolute", right: space.lg },
});

/** White chip for the photo's top-right action. */
export function HeroAction({ label, icon: Icon, onPress }: { label: string; icon?: LucideIcon; onPress: () => void }) {
  const press = usePressFeedback();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut} hitSlop={6}>
      <Animated.View style={[chip.root, press.style]}>
        {Icon ? <Icon color={colors.foreground} size={16} strokeWidth={1.75} /> : null}
        <Text style={chip.label}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

const chip = StyleSheet.create({
  root: { flexDirection: "row", alignItems: "center", gap: 6, height: 36, paddingHorizontal: 14, borderRadius: radii.pill, backgroundColor: "rgba(255,255,255,0.94)" },
  label: { ...type.buttonSm, color: colors.foreground },
});
