import { useAuth } from "@clerk/clerk-expo";
import { Redirect, Tabs } from "expo-router";
import { Home, Settings, ShieldCheck, UserRound, UsersRound, type LucideIcon } from "lucide-react-native";
import type { ColorValue } from "react-native";

import { TabBar, colors } from "@/src/design-system";

// Neutral line icons, stroke 1.6 idle and 2.1 when active.
function tabIcon(Icon: LucideIcon) {
  return ({ color, focused }: { color: ColorValue; focused: boolean }) => <Icon color={color as string} size={24} strokeWidth={focused ? 2.1 : 1.6} />;
}

export default function GuestLayout() {
  const { isLoaded, isSignedIn } = useAuth();

  if (isLoaded && !isSignedIn) return <Redirect href="/" />;

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: tabIcon(Home) }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: tabIcon(UserRound) }} />
      <Tabs.Screen name="companions" options={{ title: "Companions", tabBarIcon: tabIcon(UsersRound) }} />
      <Tabs.Screen name="privacy" options={{ title: "Privacy", tabBarIcon: tabIcon(ShieldCheck) }} />
      <Tabs.Screen name="account" options={{ title: "Account", tabBarIcon: tabIcon(Settings) }} />
    </Tabs>
  );
}
