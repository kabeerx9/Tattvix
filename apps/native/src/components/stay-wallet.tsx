// Guests in house as a stack of room key cards, like cards in a phone wallet:
// each peeks out with its room and guest, the last one shows in full. A red
// "Late" or amber "Out today" badge marks who needs the desk. Mirrors
// apps/web/src/features/hotel-stays/components/stay-wallet.tsx; order and lines
// come from getStayWallet in @tattvix/api.
import type { WalletCard } from "@tattvix/api";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";

import { fonts, keyCard, radii, space, type } from "@/src/design-system";
import { usePressFeedback } from "@/src/design-system/press";

const CARD = 128;
const PEEK = 58;

const badges = {
  late: { label: "Late", fill: keyCard.danger },
  today: { label: "Out today", fill: keyCard.warning },
} as const;

export function StayWallet({ cards, onOpen }: { cards: WalletCard[]; onOpen: (stayId: string) => void }) {
  return (
    <View style={styles.wallet}>
      {cards.map((card, index) => (
        <WalletKey key={card.stay.id} card={card} first={index === 0} onPress={() => onOpen(card.stay.id)} />
      ))}
    </View>
  );
}

function WalletKey({ card, first, onPress }: { card: WalletCard; first: boolean; onPress: () => void }) {
  const press = usePressFeedback();
  const badge = card.badge ? badges[card.badge] : null;
  const room = card.stay.room?.number ?? "—";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Room ${room}, ${card.stay.guestName}, ${card.line}`}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={!first && styles.overlap}
    >
      <Animated.View style={press.style}>
        <LinearGradient colors={keyCard.gradient} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={styles.card}>
          <View style={styles.top}>
            <Text style={styles.room}>{room}</Text>
            <Text style={styles.name} numberOfLines={1}>
              {card.stay.guestName}
            </Text>
            {badge ? (
              <View style={[styles.badge, { backgroundColor: badge.fill }]}>
                <Text style={styles.badgeText}>{badge.label}</Text>
              </View>
            ) : (
              <Text style={styles.line} numberOfLines={1}>
                {card.line}
              </Text>
            )}
          </View>
          {badge ? (
            <Text style={styles.line} numberOfLines={1}>
              {card.line}
            </Text>
          ) : null}
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wallet: { marginTop: space.lg },
  overlap: { marginTop: PEEK - CARD },
  card: {
    height: CARD,
    borderRadius: 20,
    paddingHorizontal: space.lg,
    paddingTop: 14,
    paddingBottom: space.lg,
    justifyContent: "space-between",
    // A light top edge separates each card from the one under it.
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    // The shadow falls upwards so each card reads as sitting on the one before.
    shadowColor: "#250716",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 6,
  },
  top: { flexDirection: "row", alignItems: "center", gap: space.md },
  room: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28, letterSpacing: -0.5, color: "#ffffff", fontVariant: ["tabular-nums"] },
  name: { flex: 1, fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20, color: "#ffffff" },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.pill },
  badgeText: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 16, color: "#ffffff" },
  line: { ...type.meta, flexShrink: 0, color: "rgba(255,255,255,0.75)" },
});
