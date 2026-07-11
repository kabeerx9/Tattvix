export const guestProfileKeys = {
  all: ["guest-profile"] as const,
  detail: () => [...guestProfileKeys.all, "detail"] as const,
};
