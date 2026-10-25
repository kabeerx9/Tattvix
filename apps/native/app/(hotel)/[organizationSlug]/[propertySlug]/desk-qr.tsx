// The desk QR (prototype decision, issue #52): full screen, the property's
// name, one instruction, the code at ~290pt, a quiet footer. The phone goes
// to full brightness while this is up and "Flip for the guest" turns the
// code round so it reads from across the desk.
import { useMutation } from "@tanstack/react-query";
import { env } from "@tattvix/env/native";
import * as Brightness from "expo-brightness";
import { useFocusEffect, useRouter } from "expo-router";
import { QrCode, X } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";

import { BrandMark, Button, EmptyState, Screen, Spinner, colors, motion, space, type } from "@/src/design-system";
import { getDeskScope } from "@/src/lib/desk-scope";
import { errorMessage, formatDate } from "@/src/lib/format";
import { hotelMutations } from "@/src/lib/hotel-mutations";
import { useHotelPlace } from "@/src/lib/hotel-place";

const QR_SIZE = 290;

export default function DeskQrScreen() {
  const place = useHotelPlace();
  const scope = getDeskScope(place);
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const generate = useMutation(hotelMutations.generateQr());
  const [flipped, setFlipped] = useState(false);
  const turn = useSharedValue(0);

  const refresh = useCallback(() => {
    if (!scope.readOnly) generate.mutate({ organizationSlug: scope.organizationSlug, propertySlug: scope.propertySlug });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope.readOnly, scope.organizationSlug, scope.propertySlug]);

  useEffect(refresh, [refresh]);

  // Full brightness while the code is on screen; back to the system value on leave.
  useFocusEffect(
    useCallback(() => {
      let previous: number | null = null;
      Brightness.getBrightnessAsync()
        .then((value) => {
          previous = value;
          return Brightness.setBrightnessAsync(1);
        })
        .catch(() => {});
      return () => {
        if (Platform.OS === "android") Brightness.restoreSystemBrightnessAsync().catch(() => {});
        else if (previous !== null) Brightness.setBrightnessAsync(previous).catch(() => {});
      };
    }, []),
  );

  const flipStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value}deg` }] }));
  function flip() {
    const next = !flipped;
    setFlipped(next);
    turn.value = reduceMotion ? (next ? 180 : 0) : withTiming(next ? 180 : 0, { duration: motion.duration.move, easing: motion.easeInOut });
  }

  const token = generate.data;
  const checkInUrl = token ? `${env.EXPO_PUBLIC_WEB_URL}${token.checkInPath}` : null;
  const error = errorMessage(generate.error, "The check-in QR could not be generated.");

  return (
    <Screen mode="fixed">
      <View style={styles.top}>
        <BrandMark size={28} />
        <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={8} onPress={() => router.back()} style={({ pressed }) => [styles.close, pressed && { backgroundColor: colors.muted }]}>
          <X color={colors.foreground} size={22} strokeWidth={2} />
        </Pressable>
      </View>

      <Animated.View style={[styles.stage, flipStyle]}>
        <Text style={styles.property}>{place.propertyName}</Text>
        <Text style={styles.instruction}>Scan to check in. Your ID stays on your phone until you agree to share it.</Text>
        <View style={styles.code}>
          {scope.readOnly ? (
            <EmptyState icon={QrCode} text="Check-ins are paused because the subscription has ended. Guests already in house can still check out." />
          ) : checkInUrl ? (
            <QRCode value={checkInUrl} size={QR_SIZE} color={colors.foreground} backgroundColor={colors.background} ecl="M" />
          ) : error ? (
            <EmptyState icon={QrCode} text={error} action={{ label: "Try again", onPress: refresh }} />
          ) : (
            <View style={styles.placeholder}>
              <Spinner color={colors.mutedForeground} size={24} />
            </View>
          )}
        </View>
        <Text style={styles.footer}>{token ? `Code valid until ${formatDate(token.expiresAt.slice(0, 10))} · Tattwix` : scope.readOnly ? "Tattwix" : "Preparing a fresh code"}</Text>
      </Animated.View>

      <View style={styles.actions}>
        <Button label={flipped ? "Flip back" : "Flip for the guest"} variant="outline" onPress={flip} disabled={!checkInUrl} />
        {token ? <Button label="New code" variant="ghost" onPress={refresh} loading={generate.isPending} /> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", height: 48, marginRight: -8 },
  close: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  stage: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.lg },
  property: { ...type.pageTitle, color: colors.foreground, textAlign: "center" },
  instruction: { ...type.body, color: colors.mutedForeground, textAlign: "center", maxWidth: 300 },
  code: { width: QR_SIZE + space.xl * 2, minHeight: QR_SIZE + space.xl * 2, alignItems: "center", justifyContent: "center", padding: space.xl, marginVertical: space.sm },
  placeholder: { width: QR_SIZE, height: QR_SIZE, alignItems: "center", justifyContent: "center" },
  footer: { ...type.caption, color: colors.subtleForeground, textAlign: "center" },
  actions: { gap: space.sm, paddingBottom: space.sm },
});
