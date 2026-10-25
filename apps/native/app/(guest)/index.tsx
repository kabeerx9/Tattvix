import { useUser } from "@clerk/clerk-expo";
import { Home } from "lucide-react-native";

import { EmptyState, LargeTitle, Screen } from "@/src/design-system";

export default function GuestHome() {
  const { user } = useUser();
  const name = user?.firstName || user?.username || "Guest";

  return (
    <Screen>
      <LargeTitle meta="Your travel details and privacy choices, ready when you need them.">{`Hello, ${name}`}</LargeTitle>
      <EmptyState icon={Home} text="Your stays and check-in details will appear here." />
    </Screen>
  );
}
