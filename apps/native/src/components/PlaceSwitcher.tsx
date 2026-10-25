import { useAuth } from "@clerk/clerk-expo";
import { useRouter, type Href } from "expo-router";
import { BarChart3, BedDouble, Building2, LogOut, QrCode, Settings, UserRound } from "lucide-react-native";
import { useState } from "react";

import { BottomSheet, ConfirmSheet, ListRow, Panel, StatusPill } from "@/src/design-system";
import { useCurrentUser } from "@/src/lib/current-user";
import { writeLastPlace } from "@/src/lib/last-place";
import { describeHotelPlace, getHotelPlaces, hotelHref } from "@/src/lib/workspace";
import { SectionTitle, space } from "@/src/design-system";
import { StyleSheet, View } from "react-native";

export type SwitcherCurrent = { kind: "guest" } | { kind: "hotel"; key: string };

/**
 * The rows of the place switcher: Personal, every hotel the person may open,
 * then account and sign out. Rendered inside the Menu sheet, and as the Menu
 * tab's own screen when someone lands on it directly.
 */
export function PlaceSwitcherRows({ current, onNavigate, onSignOut }: { current: SwitcherCurrent; onNavigate?: () => void; onSignOut: () => void }) {
  const router = useRouter();
  const user = useCurrentUser();
  const places = getHotelPlaces(user.data ?? null);
  // Replace rather than push: switching place is a change of context, not a step back.
  const go = (href: Href) => {
    onNavigate?.();
    router.replace(href);
  };

  return (
    <Panel flat>
      <ListRow
        icon={UserRound}
        title="Personal"
        detail="My stays, profile and privacy"
        trailing={current.kind === "guest" ? <StatusPill tone="success">Current</StatusPill> : undefined}
        onPress={() => go("/(guest)" as Href)}
      />
      {places.map((place) => {
        const isCurrent = current.kind === "hotel" && current.key === place.key;
        return (
          <ListRow
            key={place.key}
            icon={BedDouble}
            title={place.propertyName}
            detail={describeHotelPlace(place)}
            trailing={isCurrent ? <StatusPill tone="success">Current</StatusPill> : undefined}
            onPress={() => {
              if (user.clerkUserId) writeLastPlace(user.clerkUserId, place.key);
              go(hotelHref(place) as Href);
            }}
          />
        );
      })}
      <ListRow icon={Settings} title="Account" detail={user.data?.email} compact chevron onPress={() => go("/(guest)/account" as Href)} />
      <ListRow icon={LogOut} title="Sign out" compact onPress={onSignOut} />
    </Panel>
  );
}

/**
 * In hotel mode the Menu also carries the management screens that have no
 * tab: reports, hotel details and the desk QR. Pushed, not replaced: they
 * are a step forward inside the same place.
 */
function HotelMenuRows({ placeKey, onNavigate }: { placeKey: string; onNavigate: () => void }) {
  const router = useRouter();
  const user = useCurrentUser();
  const place = getHotelPlaces(user.data ?? null).find((entry) => entry.key === placeKey);
  if (!place) return null;
  const base = hotelHref(place);
  const go = (path: string) => {
    onNavigate();
    router.push(`${base}/${path}` as Href);
  };
  return (
    <View style={menuStyles.section}>
      <SectionTitle>{place.propertyName}</SectionTitle>
      <Panel flat>
        <ListRow icon={BarChart3} title="Reports" detail="Register, in-house and occupancy" chevron onPress={() => go("reports")} />
        <ListRow icon={Building2} title="Hotel details" detail="Address, times, amenities and photos" chevron onPress={() => go("details")} />
        <ListRow icon={QrCode} title="Check-in QR" detail="Show the code at the desk" chevron onPress={() => go("desk-qr")} />
      </Panel>
    </View>
  );
}

const menuStyles = StyleSheet.create({ section: { gap: space.sm, marginBottom: space.lg } });

/** The Menu sheet: the switcher rows plus the sign-out confirmation. */
export function PlaceSwitcherSheet({ open, onClose, current }: { open: boolean; onClose: () => void; current: SwitcherCurrent }) {
  const { signOut } = useAuth();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  return (
    <>
      <BottomSheet open={open} onClose={onClose} title={current.kind === "hotel" ? "Menu" : "Switch place"}>
        {current.kind === "hotel" ? <HotelMenuRows placeKey={current.key} onNavigate={onClose} /> : null}
        <PlaceSwitcherRows
          current={current}
          onNavigate={onClose}
          onSignOut={() => {
            onClose();
            setConfirmOpen(true);
          }}
        />
      </BottomSheet>
      <ConfirmSheet
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Sign out?"
        description="Anyone using this phone next will need to sign in again."
        confirmLabel="Sign out"
        tone="destructive"
        loading={signingOut}
        onConfirm={async () => {
          setSigningOut(true);
          try {
            await signOut();
          } finally {
            setSigningOut(false);
            setConfirmOpen(false);
          }
        }}
      />
    </>
  );
}
