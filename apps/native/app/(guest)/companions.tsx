import { UsersRound } from "lucide-react-native";

import { EmptyState, LargeTitle, Screen } from "@/src/design-system";

export default function CompanionsScreen() {
  return (
    <Screen>
      <LargeTitle meta="Save accompanying guest profiles so group check-in takes less time.">Companions</LargeTitle>
      <EmptyState icon={UsersRound} text="Companions you save for future stays will appear here." />
    </Screen>
  );
}
