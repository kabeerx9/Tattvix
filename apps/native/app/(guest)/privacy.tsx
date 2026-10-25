import { ShieldCheck } from "lucide-react-native";

import { EmptyState, LargeTitle, Screen } from "@/src/design-system";

export default function PrivacyScreen() {
  return (
    <Screen>
      <LargeTitle meta="See what is shared, with whom, and for how long.">Privacy</LargeTitle>
      <EmptyState icon={ShieldCheck} text="Hotels with access to your details will appear here." />
    </Screen>
  );
}
