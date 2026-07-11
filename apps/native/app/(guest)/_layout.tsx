import { useAuth } from "@clerk/clerk-expo";
import { Redirect, Tabs } from "expo-router";
import { Home, Settings, ShieldCheck, UserRound, UsersRound, type LucideIcon } from "lucide-react-native";
import type { ColorValue } from "react-native";

import { useAppTheme } from "@/src/design-system/theme";

function TabIcon({ icon: Icon, color }: { icon: LucideIcon; color: ColorValue }) {
  return <Icon color={color} size={20} strokeWidth={2} />;
}

export default function GuestLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const { colors } = useAppTheme();

  if (isLoaded && !isSignedIn) return <Redirect href="/" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: 76,
          paddingTop: 8,
          paddingBottom: 10,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: ({ color }) => <TabIcon icon={Home} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: ({ color }) => <TabIcon icon={UserRound} color={color} /> }} />
      <Tabs.Screen name="companions" options={{ title: "Companions", tabBarIcon: ({ color }) => <TabIcon icon={UsersRound} color={color} /> }} />
      <Tabs.Screen name="privacy" options={{ title: "Privacy", tabBarIcon: ({ color }) => <TabIcon icon={ShieldCheck} color={color} /> }} />
      <Tabs.Screen name="account" options={{ title: "Account", tabBarIcon: ({ color }) => <TabIcon icon={Settings} color={color} /> }} />
    </Tabs>
  );
}
