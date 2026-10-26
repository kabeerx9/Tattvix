import { QueryClient, useQuery } from "@tanstack/react-query";
import { createSupportApi, getSupportContacts, supportContactsQuery, SUPPORT_PHONE_PLACEHOLDER } from "@tattvix/api";
import { createApiClient } from "@tattvix/contracts";
import { env } from "@tattvix/env/native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";

import { Button, LargeTitle, Screen, SecondaryHeader, SectionTitle, colors, space, type } from "@/src/design-system";

const supportApi = createSupportApi(createApiClient({
  baseUrl: env.EXPO_PUBLIC_SERVER_URL,
  getToken: async () => null,
}));
// This public configuration also works signed out. Keep it outside the account
// cache, which AuthWiring clears as Clerk resolves a signed-out session.
const supportQueryClient = new QueryClient({ defaultOptions: { queries: { retry: 1 } } });

export default function SupportScreen() {
  const router = useRouter();
  const query = useQuery(supportContactsQuery(supportApi), supportQueryClient);
  const [linkError, setLinkError] = useState<string | null>(null);
  const contacts = query.data ? getSupportContacts(query.data) : null;

  async function openContact(href: string) {
    setLinkError(null);
    try {
      await Linking.openURL(href);
    } catch {
      setLinkError("Could not open the contact link. Please use the number shown above.");
    }
  }

  return (
    <Screen onRefresh={() => void query.refetch()} refreshing={query.isFetching && !query.isPending}>
      <SecondaryHeader title="Help desk" onBack={() => router.canGoBack() ? router.back() : router.replace("/")} />
      <LargeTitle>Help desk</LargeTitle>
      <Text style={styles.intro}>Get help with your account, hotel, check-in or anything else on Tattwix.</Text>
      {query.isError ? <View style={styles.section}>
        <Text accessibilityRole="alert" style={styles.error}>Support contacts could not be refreshed. Please try again.</Text>
        <Button label="Try again" variant="outline" onPress={() => void query.refetch()} />
      </View> : null}
      {contacts ? (
        <>
          <View style={styles.section}>
            <SectionTitle>WhatsApp</SectionTitle>
            <Text selectable style={styles.phone}>{contacts.whatsapp?.label ?? SUPPORT_PHONE_PLACEHOLDER}</Text>
            {!contacts.whatsapp ? <Text style={styles.muted}>WhatsApp support is being set up.</Text> : null}
            <Button label="Chat on WhatsApp" disabled={!contacts.whatsapp} onPress={() => { if (contacts.whatsapp) void openContact(contacts.whatsapp.href); }} />
          </View>
          <View style={styles.section}>
            <SectionTitle>Phone</SectionTitle>
            <Text selectable style={styles.phone}>{contacts.call?.label ?? SUPPORT_PHONE_PLACEHOLDER}</Text>
            {!contacts.call ? <Text style={styles.muted}>Phone support is being set up.</Text> : null}
            <Button label="Call support" variant="outline" disabled={!contacts.call} onPress={() => { if (contacts.call) void openContact(contacts.call.href); }} />
          </View>
        </>
      ) : !query.isError ? <View style={styles.section}><Text style={styles.muted}>Loading support contacts…</Text></View> : null}
      {linkError ? <Text accessibilityRole="alert" style={[styles.error, styles.intro]}>{linkError}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { ...type.body, color: colors.mutedForeground, marginTop: space.lg },
  section: { marginTop: space.xxxl, gap: space.lg },
  phone: { ...type.body, color: colors.foreground },
  muted: { ...type.caption, color: colors.mutedForeground },
  error: { ...type.caption, color: colors.destructive },
});
