import { getAccountSettings } from "@tattvix/api";
import type { MeResponse } from "@tattvix/contracts";
import { useRouter, type Href } from "expo-router";
import { BedDouble, ShieldCheck, UserRound, UserPlus, UsersRound } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { ListRow, Panel, SectionTitle, colors, space, type } from "@/src/design-system";
import { hotelHref } from "@/src/lib/workspace";

export function AccountSettingsSections({ user }: { user: Pick<MeResponse, "memberships"> }) {
  const settings = getAccountSettings(user);
  const router = useRouter();
  return <View style={styles.sections}>
    {settings.isOwner ? <View style={styles.group}>
      <SectionTitle>Your hotels</SectionTitle>
      <Panel><ListRow icon={UserPlus} title="Referrals" detail="Share a code and track hotel registrations" chevron onPress={() => router.push("/(guest)/referrals" as Href)} /></Panel>
      {settings.hotels.map((hotel) => <View style={styles.group} key={hotel.id}>
        <Text style={styles.organization}>{hotel.organization.name}</Text>
        <Text style={styles.muted}>{hotel.subscriptionLabel}</Text>
        <Panel>
          <ListRow
            icon={UsersRound}
            title="Manage team"
            detail="People, roles and property access"
            chevron
            onPress={() => router.push(`/(hotel-team)/${hotel.organization.slug}/team` as Href)}
          />
        </Panel>
        {hotel.properties.length ? <Panel>
          {hotel.properties.map((property) => <ListRow
            key={property.id}
            icon={BedDouble}
            title={property.name}
            detail="Property settings"
            chevron
            onPress={() => router.push(`${hotelHref({ organizationSlug: hotel.organization.slug, propertySlug: property.slug })}/details` as Href)}
          />)}
        </Panel> : <Text style={styles.muted}>No properties are available. Contact the help desk for assistance.</Text>}
      </View>)}
    </View> : null}
    <View style={styles.group}>
      <SectionTitle>Personal settings</SectionTitle>
      <Panel>
        <ListRow icon={UserRound} title="Guest profile" detail="Your identity details and documents" chevron onPress={() => router.push("/(guest)/(tabs)/profile")} />
        <ListRow icon={ShieldCheck} title="Privacy and sharing" detail="Manage identity sharing with hotels" chevron onPress={() => router.push("/(guest)/(tabs)/privacy")} />
        <ListRow icon={BedDouble} title="My stays" chevron onPress={() => router.push("/(guest)/(tabs)/stays")} />
      </Panel>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  sections: { gap: space.xxxl },
  group: { gap: space.md },
  organization: { ...type.rowTitle, color: colors.foreground },
  muted: { ...type.caption, color: colors.mutedForeground },
});
