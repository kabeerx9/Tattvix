import { createPropertyNameApi, propertyNameMutation, propertyNameQuery } from "@tattvix/api";
import { propertyNameSchema } from "@tattvix/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Button, SectionTitle, TextField, colors, space, toast, type } from "@/src/design-system";
import { apiClient } from "@/src/lib/api";

const api = createPropertyNameApi(apiClient);

export function PropertyNameForm({ organizationSlug, propertySlug, canManage }: { organizationSlug: string; propertySlug: string; canManage: boolean }) {
  const queryClient = useQueryClient();
  const query = useQuery(propertyNameQuery(api, organizationSlug, propertySlug));
  const [name, setName] = useState("");
  const mutation = useMutation(propertyNameMutation(api, queryClient, organizationSlug, propertySlug));
  useEffect(() => { if (query.data) setName(query.data.name); }, [query.data]);
  const valid = propertyNameSchema.safeParse({ name }).success;

  return (
    <View style={styles.section}>
      <SectionTitle>Property name</SectionTitle>
      {query.data ? (
        <>
          <TextField label="Property name" accessibilityLabel="Property name" value={name} onChangeText={setName} maxLength={255} editable={canManage && !mutation.isPending} error={name !== query.data.name && !valid ? "Enter a property name between 1 and 255 characters." : undefined} />
          {canManage ? <Button label="Save name" variant="outline" disabled={!valid || name.trim() === query.data.name} loading={mutation.isPending} onPress={() => mutation.mutate({ name }, { onSuccess: () => toast("Property name saved") })} /> : null}
          {mutation.isError ? <Text accessibilityRole="alert" style={styles.error}>The property name could not be saved. Please try again.</Text> : null}
        </>
      ) : query.isError ? (
        <><Text style={styles.error}>The property name could not be loaded.</Text><Button label="Try again" variant="outline" onPress={() => void query.refetch()} /></>
      ) : <Text style={styles.loading}>Loading property name…</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: space.xxl, gap: space.lg },
  error: { ...type.caption, color: colors.destructive },
  loading: { ...type.caption, color: colors.mutedForeground },
});
