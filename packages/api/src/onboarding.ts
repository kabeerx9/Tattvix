import type { GuestProfileResponse, HotelRoom, PropertyDetails } from "@tattvix/contracts";

export type OnboardingAction = "profile" | "identity" | "property" | "rooms";
export type OnboardingStep = {
  id: string;
  title: string;
  description: string;
  action: OnboardingAction;
  actionLabel: string;
  isComplete: boolean;
};
export type OnboardingTip = { id: string; title: string; body: string };
export type OnboardingGuide = {
  kind: "guest" | "hotel";
  title: string;
  description: string;
  completeTitle: string;
  completeDescription: string;
  steps: OnboardingStep[];
  tips: OnboardingTip[];
  completedCount: number;
  totalCount: number;
  isComplete: boolean;
  nextStepId: string | null;
};

function guide(input: Omit<OnboardingGuide, "completedCount" | "totalCount" | "isComplete" | "nextStepId">): OnboardingGuide {
  const completedCount = input.steps.filter((step) => step.isComplete).length;
  return { ...input, completedCount, totalCount: input.steps.length,
    isComplete: completedCount === input.steps.length,
    nextStepId: input.steps.find((step) => !step.isComplete)?.id ?? null };
}

/** Completion is the server's saved readiness, never the local tour's history. */
export function getGuestOnboarding(profile: GuestProfileResponse): OnboardingGuide {
  const missing = profile.readiness.missingFields;
  return guide({
    kind: "guest",
    title: "Arrive with less to do.",
    description: "A little preparation now. A smoother check-in when you arrive.",
    completeTitle: "You're ready for check-in.",
    completeDescription: "Your profile and ID are prepared. At the hotel, scan its check-in QR and review what you share.",
    steps: [
      { id: "profile", title: "Make yourself at home", description: "Save your legal name, contact details and address so you don't have to start from scratch at reception.",
        action: "profile", actionLabel: "Complete your profile", isComplete: !missing.some((field) => field !== "identityDocuments") },
      { id: "identity", title: "Have your ID ready", description: "Add a government ID, its details and the required photos. Use a document accepted by the hotel.",
        action: "identity", actionLabel: "Prepare your ID", isComplete: !missing.includes("identityDocuments") },
    ],
    tips: [
      { id: "consent", title: "Your ID. Your say.", body: "Saving an ID prepares your travel profile. It does not check you in or share it with a hotel. Review the hotel's request and approve sharing during check-in." },
      { id: "arrival", title: "At reception, start with the QR", body: "Scan the hotel's check-in QR with your phone camera. Confirm the hotel, review your details and consent, then submit. Reception assigns your room and completes check-in." },
      { id: "companions", title: "Travelling together?", body: "Companions are optional. Add their profiles and IDs from Companions, then select who is joining you when you check in." },
    ],
  });
}

/** Permissions determine which setup work this person can do, not role labels. */
export function getHotelOnboarding(input: {
  details: PropertyDetails;
  rooms: HotelRoom[];
  canManageHotel: boolean;
  canManageRooms: boolean;
}): OnboardingGuide | null {
  const { details, rooms, canManageHotel, canManageRooms } = input;
  if (!canManageHotel && !canManageRooms) return null;
  const activeRooms = rooms.filter((room) => room.isActive);
  const steps: OnboardingStep[] = [];
  if (canManageHotel) steps.push({
    id: "property", title: "Introduce your property",
    description: "Confirm your property name, then save an address, contact phone and check-in and check-out times.",
    action: "property", actionLabel: "Set up property details",
    isComplete: [details.address, details.contactPhone, details.checkInTime, details.checkOutTime].every((value) => Boolean(value.trim())),
  });
  if (canManageRooms) steps.push(
    { id: "rooms", title: "Make room for your guests", description: "Add your rooms with their numbers, floors and room types. Start with one; you can add the rest whenever you're ready.",
      action: "rooms", actionLabel: "Add your rooms", isComplete: activeRooms.length > 0 },
    { id: "rates", title: "Set the nightly rates", description: "Save a nightly rate for each active room so reception can start the bill when assigning it.",
      action: "rooms", actionLabel: "Set room rates", isComplete: activeRooms.length > 0 && activeRooms.every((room) => room.nightlyRateMinor != null) },
  );
  return guide({
    kind: "hotel", title: "Get ready to welcome guests.",
    description: "Your property, your rooms, your first check-in. Let's get the essentials in place.",
    completeTitle: "Your setup essentials are ready.",
    completeDescription: "The setup tasks you manage are complete. Open the check-in QR from Today when a guest arrives.",
    steps,
    tips: [
      { id: "desk", title: "How your first check-in works", body: "Open Check-in QR from Today and show it at reception. The guest scans it, prepares their details and approves sharing. Their reservation appears on Today, where reception assigns a room and completes check-in." },
      { id: "team", title: "Give your team their own access", body: "An owner can find an existing Tattwix user by email in Team, choose their role and select their properties. Each person signs in with their own account." },
      { id: "later", title: "Start small. Refine as you go.", body: "Property photos, a description and amenities can be added from Hotel details. Rooms and rates remain editable as your property grows." },
    ],
  });
}

// SecureStore permits only alphanumerics, dot, dash and underscore. Encoding
// every UTF-16 code unit also avoids collisions from sanitizing user/scope IDs.
export function onboardingStorageKey(clerkUserId: string, scope: string): string {
  const encode = (value: string) => value.split("").map((char) => char.charCodeAt(0).toString(16).padStart(4, "0")).join("");
  return `tattwix.onboarding.v1.${encode(clerkUserId)}.${encode(scope)}`;
}
