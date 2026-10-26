import { createFileRoute } from "@tanstack/react-router";

import { GuestOnboardingPage } from "@/features/onboarding/components/guest-onboarding";

export const Route = createFileRoute("/_auth/getting-started")({ component: GuestOnboardingPage });
