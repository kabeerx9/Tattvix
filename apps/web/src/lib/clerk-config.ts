import type { ClerkProvider } from "@clerk/react";
import type { ComponentProps } from "react";

type ClerkProviderProps = ComponentProps<typeof ClerkProvider>;

// Clerk renders its own inputs at ~13px, which makes iOS zoom on focus.
// Raise them to 16px on touch only; desktop keeps Clerk's density.
const touchFieldFont = { "@media (pointer: coarse)": { fontSize: "16px" } };

export const clerkAppearance: ClerkProviderProps["appearance"] = {
  elements: {
    formFieldInput: touchFieldFont,
    otpCodeFieldInput: touchFieldFont,
  },
};

// Clerk interpolates {{applicationName}} from the dashboard app name, which is
// the repo id. Spell the brand out in every default string that uses it.
const BRAND = "Tattwix";
const continueTo = `to continue to ${BRAND}`;

export const clerkLocalization: ClerkProviderProps["localization"] = {
  organizationList: { subtitle: continueTo },
  signIn: {
    start: {
      title: `Sign in to ${BRAND}`,
      titleCombined: `Continue to ${BRAND}`,
      alternativePhoneCodeProvider: {
        title: `Sign in to ${BRAND} with {{provider}}`,
      },
    },
    alternativePhoneCodeProvider: { subtitle: continueTo },
    emailCode: { subtitle: continueTo },
    emailCodeMfa: { subtitle: continueTo },
    emailLink: { subtitle: continueTo },
    emailLinkMfa: { subtitle: continueTo },
    phoneCode: { subtitle: continueTo },
  },
  signUp: {
    start: {
      alternativePhoneCodeProvider: {
        title: `Sign up to ${BRAND} with {{provider}}`,
      },
    },
    emailLink: { subtitle: continueTo },
  },
};
