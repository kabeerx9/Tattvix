// Dev reference for the native design kit. Not linked from any screen; open it with
// `tattwix://gallery`. Every sample is made-up data for layout, never real guests.
import { Bed, FileText, Inbox, QrCode, ShieldCheck, Sun, Users } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  BottomSheet,
  BrandLogo,
  Button,
  Card,
  ConfirmSheet,
  EmptyState,
  InitialsAvatar,
  Kpi,
  KpiRow,
  LargeTitle,
  ListRow,
  Panel,
  PhotoTile,
  PillTabs,
  Rail,
  Screen,
  SectionTitle,
  SecondaryHeader,
  Splash,
  StatusPill,
  TextField,
  TextLink,
  colors,
  space,
  type,
} from "@/src/design-system";

const PHOTOS = {
  deluxe: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=70",
  suite: "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&q=70",
  standard: "https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800&q=70",
};

const STAYS = [
  { id: "1", initials: "RS", name: "Rohan Sharma", sub: "Room 204 · Deluxe", facts: [["Nights", "3"], ["Guests", "2"], ["Due", "₹9,400"]] },
  { id: "2", initials: "AM", name: "Anita Mehra", sub: "Room 101 · Standard", facts: [["Nights", "1"], ["Guests", "1"], ["Due", "₹2,200"]] },
] as const;

const TABS = [
  { key: "out", label: "Checking out", count: 2 },
  { key: "in", label: "Hosting", count: 7 },
  { key: "arriving", label: "Arriving", count: 3 },
  { key: "done", label: "Checked out", count: 1 },
];

export default function GalleryRoute() {
  const router = useRouter();
  const [tab, setTab] = useState("out");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [splashKey, setSplashKey] = useState<number | null>(null);

  return (
    <View style={styles.root}>
      <Screen>
        <SecondaryHeader title="Design kit" onBack={() => (router.canGoBack() ? router.back() : router.replace("/"))} />

        <LargeTitle meta="Saturday, 25 October · Sun Shine Lodge">Today</LargeTitle>

        <View style={styles.block}>
          <SectionTitle meta="3 arriving, 2 checking out today">Your reservations</SectionTitle>
          <PillTabs items={TABS} value={tab} onChange={setTab} />
          <Rail autoCols={84}>
            {STAYS.map((stay) => (
              <Card key={stay.id} style={styles.stayCard}>
                <View style={styles.stayTop}>
                  <InitialsAvatar initials={stay.initials} />
                  <View style={styles.grow}>
                    <Text style={styles.name}>{stay.name}</Text>
                    <Text style={styles.sub}>{stay.sub}</Text>
                  </View>
                </View>
                <StatusPill tone="warning">Checking out</StatusPill>
                <View style={styles.facts}>
                  {stay.facts.map(([k, v]) => (
                    <Text key={k} style={styles.fact}>
                      {k} <Text style={styles.factValue}>{v}</Text>
                    </Text>
                  ))}
                </View>
                <Button label="Check out" size="sm" onPress={() => {}} />
              </Card>
            ))}
          </Rail>
        </View>

        <View style={styles.block}>
          <View style={styles.rowBetween}>
            <View style={styles.grow}>
              <SectionTitle meta="4 rooms are clean and free tonight">Ready to check in</SectionTitle>
            </View>
            <TextLink label="All rooms" onPress={() => {}} />
          </View>
          <Rail autoCols={62}>
            <View style={styles.room}>
              <PhotoTile uri={PHOTOS.deluxe} label="Room 205" />
              <Text style={styles.caption}>
                <Text style={styles.captionStrong}>Deluxe</Text> · ₹3,200 / night
              </Text>
            </View>
            <View style={styles.room}>
              <PhotoTile uri={PHOTOS.suite} label="Room 301" />
              <Text style={styles.caption}>
                <Text style={styles.captionStrong}>Suite</Text> · ₹5,800 / night
              </Text>
            </View>
            <View style={styles.room}>
              <PhotoTile uri={PHOTOS.standard} label="Room 102" />
              <Text style={styles.caption}>
                <Text style={styles.captionStrong}>Standard</Text> · ₹2,200 / night
              </Text>
            </View>
            <View style={styles.room}>
              <PhotoTile label="No photo yet" />
              <Text style={styles.caption}>
                <Text style={styles.captionStrong}>Twin</Text> · ₹2,600 / night
              </Text>
            </View>
          </Rail>
        </View>

        <View style={styles.block}>
          <SectionTitle>Tonight</SectionTitle>
          <View style={styles.kpis}>
            <KpiRow>
              <Kpi label="Occupied" value="7 / 12" />
              <Kpi label="Arriving" value={3} />
              <Kpi label="Cleaning" value={1} />
            </KpiRow>
          </View>
        </View>

        <View style={styles.block}>
          <Panel>
            <ListRow icon={QrCode} title="Show check-in QR" detail="Guests scan it to share their ID" chevron onPress={() => {}} />
            <ListRow icon={FileText} title="Aadhaar · XXXX 4471" detail="Rohan Sharma · DOB 14 Mar 1991" trailing={<StatusPill tone="success">Verified</StatusPill>} />
            <ListRow leading={<InitialsAvatar initials="PS" size={40} />} title="Priya Sharma" detail="Companion" chevron onPress={() => {}} />
            <ListRow icon={Users} title="Companions" trailing={<Text style={styles.value}>2</Text>} chevron compact onPress={() => {}} />
          </Panel>
        </View>

        <View style={styles.block}>
          <SectionTitle>Buttons</SectionTitle>
          <View style={styles.stack}>
            <Button label="Primary" onPress={() => {}} />
            <Button label="Primary with icon" icon={Sun} onPress={() => {}} />
            <Button label="Loading" loading onPress={() => {}} />
            <Button label="Disabled" disabled onPress={() => {}} />
            <Button label="Outline" variant="outline" onPress={() => {}} />
            <Button label="Ghost" variant="ghost" onPress={() => {}} />
            <Button label="Destructive" variant="destructive" onPress={() => {}} />
            <View style={styles.row}>
              <Button label="Small" size="sm" onPress={() => {}} />
              <Button label="Small outline" size="sm" variant="outline" onPress={() => {}} />
            </View>
          </View>
        </View>

        <View style={styles.block}>
          <SectionTitle>Fields</SectionTitle>
          <View style={styles.stack}>
            <TextField label="Email" placeholder="Email address" />
            <TextField label="Focused" placeholder="Email address" focused value="kabeer786joshi@gmail.com" onChangeText={() => {}} />
            <TextField label="Error" placeholder="Password" error="Enter at least 8 characters." secureTextEntry />
          </View>
        </View>

        <View style={styles.block}>
          <SectionTitle>Status</SectionTitle>
          <View style={styles.row}>
            <StatusPill>Neutral</StatusPill>
            <StatusPill tone="success">Ready</StatusPill>
            <StatusPill tone="warning">Checking out</StatusPill>
            <StatusPill tone="destructive">Overdue</StatusPill>
          </View>
        </View>

        <View style={styles.block}>
          <SectionTitle>Avatars</SectionTitle>
          <View style={styles.row}>
            <InitialsAvatar initials="KJ" />
            <InitialsAvatar initials="PS" size={40} />
          </View>
        </View>

        <View style={styles.block}>
          <SectionTitle>Brand</SectionTitle>
          <View style={styles.stack}>
            <BrandLogo size="sm" />
            <BrandLogo size="md" />
            <BrandLogo size="lg" />
          </View>
        </View>

        <View style={styles.block}>
          <SectionTitle>Empty state</SectionTitle>
          <Card>
            <EmptyState icon={Inbox} text="Stays that are checking in today will appear here." action={{ label: "Add a stay", onPress: () => {} }} />
          </Card>
          <Card style={styles.gap}>
            <EmptyState icon={Bed} text="No rooms are free tonight." />
          </Card>
        </View>

        <View style={styles.block}>
          <SectionTitle>Sheets</SectionTitle>
          <View style={styles.stack}>
            <Button label="Open bottom sheet" variant="outline" onPress={() => setSheetOpen(true)} />
            <Button label="Open confirm sheet" variant="outline" onPress={() => setConfirmOpen(true)} />
            <Button label="Replay splash" variant="ghost" onPress={() => setSplashKey(Date.now())} />
          </View>
        </View>

        <View style={styles.block}>
          <Card>
            <ListRow icon={ShieldCheck} title="Privacy" detail="1 hotel has access right now" chevron />
          </Card>
        </View>
      </Screen>

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Switch place" footer={<Button label="Done" onPress={() => setSheetOpen(false)} />}>
        <Panel>
          <ListRow icon={Bed} title="Sun Shine Lodge" detail="Owner · Sunshine Hospitality" trailing={<StatusPill tone="success">Current</StatusPill>} />
          <ListRow icon={Bed} title="Sun Shine Annexe" detail="Owner · Sunshine Hospitality" />
          <ListRow icon={Users} title="Personal" detail="My stays, profile and privacy" />
        </Panel>
      </BottomSheet>

      <ConfirmSheet
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Void this charge?"
        description="The ₹200 late checkout charge will be removed from the bill. This cannot be undone."
        confirmLabel="Void charge"
        tone="destructive"
        onConfirm={() => setConfirmOpen(false)}
      />

      {splashKey !== null ? <Splash key={splashKey} onDone={() => setSplashKey(null)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  block: { marginTop: space.xxxl, gap: space.xs },
  grow: { flex: 1 },
  rowBetween: { flexDirection: "row", alignItems: "flex-end", gap: space.md },
  stack: { gap: space.md, marginTop: space.sm },
  row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: space.sm, marginTop: space.sm },
  gap: { marginTop: space.md },
  stayCard: { gap: space.md },
  stayTop: { flexDirection: "row", alignItems: "center", gap: space.md },
  name: { ...type.rowTitle, fontSize: 16, color: colors.foreground },
  sub: { ...type.caption, color: colors.mutedForeground, marginTop: 2 },
  facts: { flexDirection: "row", gap: space.lg },
  fact: { ...type.caption, color: colors.mutedForeground },
  factValue: { ...type.caption, color: colors.foreground, fontVariant: ["tabular-nums"] },
  room: { width: "100%", gap: space.sm },
  caption: { ...type.caption, color: colors.mutedForeground },
  captionStrong: { ...type.caption, color: colors.foreground },
  kpis: { marginTop: space.lg },
  value: { ...type.rowTitle, color: colors.foreground, fontVariant: ["tabular-nums"] },
});
