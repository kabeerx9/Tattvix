// The guest's current stay as a hotel keycard they can turn over: the stay on
// the front (gold chip, room, check-in and checkout), the hotel on the back
// (address, times, who has opened their ID, a call button). Tap it, or drag it
// sideways and let go: a spring carries it to the nearer face, and a flick
// turns it even from a short drag. Reduced motion cross-fades instead. Mirrors
// apps/web/src/features/check-in/components/guest-key-card.tsx; text comes from
// getGuestKeyCard in @tattvix/api.
import type { GuestKeyCard as GuestKeyCardModel } from "@tattvix/api";
import { LinearGradient } from "expo-linear-gradient";
import { CircleCheck, Clock3, LogOut, MapPin, Phone, ShieldCheck } from "lucide-react-native";
import { useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { fonts, guestCard, keyCard, radii, space, type } from "@/src/design-system";

const HEIGHT = 240;
// Degrees of turn per pixel of drag: a full card width turns it about 200°.
const DEG_PER_PX = 0.6;
const SETTLE = { duration: 500, dampingRatio: 0.8 } as const;

const statusLook = {
  success: { fill: keyCard.success, Icon: CircleCheck },
  warning: { fill: keyCard.warning, Icon: Clock3 },
  muted: { fill: "rgba(255,255,255,0.18)", Icon: LogOut },
} as const;

/** Which face an angle shows: true from 90° to 270° (mod 360). */
function backShowing(angle: number) {
  "worklet";
  const turned = ((angle % 360) + 360) % 360;
  return turned > 90 && turned < 270;
}

export function GuestKeyCard({ card }: { card: GuestKeyCardModel }) {
  const reduced = useReducedMotion();
  const angle = useSharedValue(0);
  const start = useSharedValue(0);
  const [showBack, setShowBack] = useState(false);

  function flip() {
    if (reduced) {
      const next = !showBack;
      angle.set(withTiming(next ? 180 : 0, { duration: 200 }));
      setShowBack(next);
      return;
    }
    const target = Math.round(angle.get() / 180) * 180 + 180;
    angle.set(withSpring(target, SETTLE));
    setShowBack(backShowing(target));
  }

  // Horizontal only, so a vertical swipe still scrolls the page.
  const pan = Gesture.Pan()
    .enabled(!reduced)
    .activeOffsetX([-10, 10])
    .failOffsetY([-12, 12])
    .onBegin(() => {
      start.set(angle.get());
    })
    .onUpdate((event) => {
      angle.set(start.get() + event.translationX * DEG_PER_PX);
    })
    .onEnd((event) => {
      const velocity = event.velocityX * DEG_PER_PX;
      // Where a flick would carry it, snapped to a face, at most one turn away.
      const projected = angle.get() + velocity * 0.12;
      const target = Math.min(start.get() + 180, Math.max(start.get() - 180, Math.round(projected / 180) * 180));
      angle.set(withSpring(target, { ...SETTLE, velocity }));
      scheduleOnRN(setShowBack, backShowing(target));
    });

  // The call button on the back is its own tap; the card's tap waits for it to
  // fail, so calling never also turns the card.
  const call = Gesture.Tap()
    .enabled(showBack && Boolean(card.phone))
    .runOnJS(true)
    .onEnd(() => void Linking.openURL(`tel:${card.phone}`));
  // Tap and drag are exclusive: a drag that turns the card never also counts as a tap.
  const tap = Gesture.Tap().runOnJS(true).requireExternalGestureToFail(call).onEnd(flip);
  const gesture = Gesture.Exclusive(pan, tap);

  // Rotation drives both faces; reduced motion keeps them flat and fades them.
  const front = useAnimatedStyle(() => {
    const a = angle.get();
    if (reduced) return { opacity: 1 - a / 180, transform: [] };
    const lift = 1 + 0.04 * Math.abs(Math.sin((a * Math.PI) / 180));
    return { opacity: backShowing(a) ? 0 : 1, transform: [{ perspective: 1100 }, { rotateY: `${a}deg` }, { scale: lift }] };
  });
  const back = useAnimatedStyle(() => {
    const a = angle.get();
    if (reduced) return { opacity: a / 180, transform: [] };
    const lift = 1 + 0.04 * Math.abs(Math.sin((a * Math.PI) / 180));
    return { opacity: backShowing(a) ? 1 : 0, transform: [{ perspective: 1100 }, { rotateY: `${a + 180}deg` }, { scale: lift }] };
  });

  const status = statusLook[card.tone];
  const times = [card.checkOut ? `Check-out by ${card.checkOut}` : null, card.checkIn ? `check-in ${card.checkIn}` : null].filter(Boolean).join(" · ");

  return (
    <GestureDetector gesture={gesture}>
      <View
        accessible
        onAccessibilityTap={flip}
        // The card reads as one button, so calling is offered as an action on it.
        accessibilityActions={card.phone ? [{ name: "call", label: "Call reception" }] : undefined}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === "call") void Linking.openURL(`tel:${card.phone}`);
        }}
        accessibilityRole="button"
        accessibilityLabel={`Your stay card at ${card.hotel}, showing the ${showBack ? "back" : "front"}`}
        accessibilityHint={`Turns the card to show the ${showBack ? "front" : "back"}`}
        style={styles.stage}
      >
        <Animated.View style={[styles.face, front]} pointerEvents={showBack ? "none" : "auto"}>
          <LinearGradient colors={guestCard.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fill}>
            <View style={styles.topRow}>
              <Text style={styles.eyebrow} numberOfLines={1}>
                {card.hotel}
              </Text>
              <View style={[styles.pill, { backgroundColor: status.fill }]}>
                <status.Icon color="#ffffff" size={13} strokeWidth={2.2} />
                <Text style={styles.pillText}>{card.status}</Text>
              </View>
            </View>
            <LinearGradient colors={guestCard.chip} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.chip}>
              <View style={styles.chipLine} />
            </LinearGradient>
            <View style={styles.roomBlock}>
              <Text style={styles.dim}>Room</Text>
              <Text style={[styles.room, !card.room && styles.noRoom]} numberOfLines={1} adjustsFontSizeToFit>{card.room ?? "Reception is assigning it"}</Text>
            </View>
            <View style={styles.foot}>
              {card.since ? (
                <View style={{ flexShrink: 1 }}>
                  <Text style={styles.footLabel}>{card.since.label}</Text>
                  <Text style={styles.footValue} numberOfLines={1}>
                    {card.since.when}
                  </Text>
                </View>
              ) : (
                <View />
              )}
              {card.checkOut ? (
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.footLabel}>Check-out by</Text>
                  <Text style={styles.footValue}>{card.checkOut}</Text>
                </View>
              ) : null}
            </View>
          </LinearGradient>
        </Animated.View>

        <Animated.View style={[styles.face, back]} pointerEvents={showBack ? "box-none" : "none"}>
          <LinearGradient colors={guestCard.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.fill, styles.backFill]}>
            <View style={styles.stripe} />
            <View style={styles.lines}>
              <Text style={styles.backTitle} numberOfLines={1}>
                {card.hotel}
              </Text>
              <Line Icon={MapPin} text={card.address ?? "The hotel hasn't added its address yet"} lines={1} />
              {times ? <Line Icon={Clock3} text={times} /> : null}
              <Line Icon={ShieldCheck} text={card.idViews} />
            </View>
            {card.phone ? (
              <GestureDetector gesture={call}>
                <View style={styles.call}>
                  <Phone color="#ffffff" size={16} strokeWidth={2} />
                  <Text style={styles.callText}>Call reception</Text>
                </View>
              </GestureDetector>
            ) : null}
          </LinearGradient>
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

function Line({ Icon, text, lines = 2 }: { Icon: typeof MapPin; text: string; lines?: number }) {
  return (
    <View style={styles.line}>
      <Icon color="rgba(255,255,255,0.8)" size={15} strokeWidth={1.8} />
      <Text style={styles.lineText} numberOfLines={lines}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { height: HEIGHT },
  face: {
    position: "absolute",
    inset: 0,
    borderRadius: 20,
    backfaceVisibility: "hidden",
    shadowColor: "#052222",
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  fill: { flex: 1, borderRadius: 20, padding: space.lg, overflow: "hidden" },
  backFill: { paddingTop: 0 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.md },
  eyebrow: { flexShrink: 1, fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16, letterSpacing: 0.5, textTransform: "uppercase", color: "rgba(255,255,255,0.78)" },
  pill: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 4, paddingLeft: 8, paddingRight: 10, borderRadius: radii.pill },
  pillText: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 16, color: "#ffffff" },
  chip: { width: 38, height: 28, borderRadius: 7, marginTop: space.md, padding: 6 },
  chipLine: { flex: 1, borderWidth: 1, borderColor: "rgba(80,50,10,0.45)", borderRadius: 4 },
  roomBlock: { marginTop: "auto" },
  dim: { ...type.meta, fontSize: 12, color: "rgba(255,255,255,0.7)" },
  room: { fontFamily: fonts.bold, fontSize: 32, lineHeight: 36, letterSpacing: -1, color: "#ffffff", fontVariant: ["tabular-nums"] },
  noRoom: { fontSize: 18, lineHeight: 24, letterSpacing: -0.2, color: "rgba(255,255,255,0.85)" },
  foot: { flexDirection: "row", justifyContent: "space-between", gap: space.md, marginTop: space.sm },
  footLabel: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 14, color: "rgba(255,255,255,0.65)" },
  footValue: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, color: "#ffffff" },
  stripe: { height: 34, marginHorizontal: -space.lg, marginTop: space.lg, backgroundColor: guestCard.stripe },
  lines: { gap: 8, marginTop: space.md },
  backTitle: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20, color: "#ffffff" },
  line: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  lineText: { flex: 1, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: "#ffffff" },
  call: { marginTop: "auto", flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, paddingVertical: 10, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.14)" },
  callText: { fontFamily: fonts.semibold, fontSize: 14, color: "#ffffff" },
});
