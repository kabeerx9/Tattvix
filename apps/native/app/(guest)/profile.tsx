import { UserRound } from "lucide-react-native";

import { EmptyState, LargeTitle, Screen } from "@/src/design-system";

export default function ProfileScreen() {
  return (
    <Screen>
      <LargeTitle meta="Keep the essentials ready and choose what is shared at check-in.">Profile</LargeTitle>
      <EmptyState icon={UserRound} text="Your personal details and identity document will appear here." />
    </Screen>
  );
}
