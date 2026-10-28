// Travel companions: people the signed-in guest travels with, one row each.
// A row opens that person's page (details, ID documents, remove). Reached from
// Home, not a tab. Mirrors apps/web/src/features/companions/components/companions-page.tsx.
import { companionRowDetail, personName } from "@tattvix/api";
import type { CompanionProfile } from "@tattvix/contracts";
import { useQuery } from "@tanstack/react-query";
import { useRouter, type Href } from "expo-router";
import { UsersRound } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { CompanionEditorSheet } from "@/src/components/companions/CompanionEditorSheet";
import { EmptyState, Enter, InitialsAvatar, LargeTitle, ListRow, Panel, Screen, SecondaryHeader, Spinner, TextLink, colors, space } from "@/src/design-system";
import { queries } from "@/src/lib/api";

export default function CompanionsScreen() {
  const router = useRouter();
  const query = useQuery(queries.companions.list());
  const companions = query.data?.companions ?? [];
  const [adding, setAdding] = useState(false);
  const open = (companion: CompanionProfile) => router.push(`/(guest)/companions/${companion.id}` as Href);

  return (
    <Screen refreshing={query.isFetching && !query.isPending} onRefresh={() => void query.refetch()}>
      {/* Back only: the large title below names the page once. */}
      <SecondaryHeader title="" onBack={() => router.back()} />
      <LargeTitle meta="People you check in with" action={companions.length ? <TextLink label="Add" onPress={() => setAdding(true)} /> : undefined}>
        Travel companions
      </LargeTitle>

      <View style={styles.section}>
        {query.isPending ? (
          <View style={styles.center}>
            <Spinner color={colors.mutedForeground} />
          </View>
        ) : query.isError ? (
          <EmptyState icon={UsersRound} text="Your companions could not be loaded." action={{ label: "Try again", onPress: () => void query.refetch(), variant: "outline" }} />
        ) : companions.length === 0 ? (
          <EmptyState icon={UsersRound} text="Save family or friends you travel with, so checking in together takes one scan." action={{ label: "Add companion", onPress: () => setAdding(true) }} />
        ) : (
          <Enter>
            <Panel>
              {companions.map((companion) => (
                <ListRow
                  key={companion.id}
                  title={personName(companion, "Unnamed companion")}
                  detail={companionRowDetail(companion)}
                  leading={<InitialsAvatar initials={initialsFor(companion)} size={40} />}
                  chevron
                  onPress={() => open(companion)}
                />
              ))}
            </Panel>
          </Enter>
        )}
      </View>

      <CompanionEditorSheet open={adding} onClose={() => setAdding(false)} companion={null} onSaved={open} />
    </Screen>
  );
}

function initialsFor(companion: CompanionProfile) {
  const initials = [companion.legalFirstName, companion.legalLastName]
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
  return initials || "?";
}

const styles = StyleSheet.create({
  center: { alignItems: "center", paddingVertical: space.xxxl },
  section: { marginTop: space.xl },
});
