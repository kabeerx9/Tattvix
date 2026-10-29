// Fetchers and TanStack Query option factories shared by web and native.
// Every module exports pure `keys`, a `create<Feature>Api(client)` and a
// `create<Feature>Queries(api)`; apps build them once with their own
// ApiClient (web: cookie + bearer; native: Clerk getToken) and re-export.
export { classifyApiError, describeLoadFailure, shouldRetryQuery, type ApiFailure, type LoadFailure } from "./errors";
export { UPLOAD_STEP_TIMEOUT_MS, UploadStepError, runUploadStep, type UploadStep } from "./upload-steps";
export { describeHotelIdentityAccess } from "./hotel-identity-access";
export { checkInKeys, createCheckInApi, createCheckInQueries, type CheckInApi } from "./check-in";
export {
  buildSubmitInput,
  checkInSteps,
  initialStep,
  isCheckInStep,
  nextStep,
  resolveStep,
  stepNumber,
  stepProfileFields,
  validateProfileStep,
  type CheckInSelection,
  type CheckInStep,
  type ProfileFieldErrors,
  type ProfileStep,
} from "./check-in-steps";
export { companionKeys, createCompanionQueries, createCompanionsApi, type CompanionsApi } from "./companions";
export { createCurrentUserApi, createCurrentUserQueries, currentUserKeys, type CurrentUserApi } from "./current-user";
export {
  EXPIRING_SOON_DAYS,
  MAX_UPLOAD_BYTES,
  documentNumberFieldProps,
  documentRequirements,
  documentTypeHint,
  documentTypes,
  formatIsoDate,
  getExpiryStatus,
  documentTypeLabels as identityDocumentTypeLabels,
  localIsoDate,
  maskDocumentNumber,
  missingFieldLabels,
  photoSlots,
  requirementsFor,
  showsExpiry,
  sideLabel,
  summarizeDocument,
  validateUploadFile,
  type DocumentRequirements,
  type DocumentSummary,
  type ExpiryStatus,
} from "./document-model";
export {
  accessActivityLabel,
  describeGuestAccess,
  formatPostCheckoutWindow,
  getGuestAccessAction,
  getGuestAccessSummary,
  getPrivacyHeadline,
  groupAccessEvents,
  isHotelAccessOpen,
  type AccessEventGroup,
  type GuestAccessAction,
} from "./guest-access";
export {
  companionSummary,
  documentImagesLabel,
  documentLabel,
  documentTypeLabels,
  avatarTone,
  placeInitials,
  placeTone,
  type PlaceTone,
  formatDate,
  formatDateTime,
  personName,
} from "./guest-format";
export { createGuestProfileApi, createGuestProfileQueries, guestProfileKeys, type GuestProfileApi } from "./guest-profile";
export { createGuestStayQueries, createGuestStaysApi, type GuestStaysApi } from "./guest-stays";
export { getCurrentGuestStay, getGuestKeyCard, getGuestStayFacts, stayStatusLabel, type GuestKeyCard } from "./guest-stay-status";
export { createHotelDetailsApi, createHotelDetailsQueries, hotelDetailsKeys, type HotelDetailsApi } from "./hotel-details";
export * from "./hotel-metrics";
export * from "./platform-metrics";
export { createHotelOperationsApi, createHotelOperationsQueries, hotelOperationsKeys, type HotelOperationsApi } from "./hotel-operations";
export { createHotelOverviewApi, createHotelOverviewQueries, hotelOverviewKeys, type HotelOverviewApi } from "./hotel-overview";
export {
  createHotelRegistrationApi,
  createHotelRegistrationQueries,
  getLatestRejectedRequest,
  hasPendingHotelRequest,
  hotelRegistrationKeys,
  type HotelRegistrationApi,
} from "./hotel-registration";
export { createHotelReportsApi, createHotelReportsQueries, hotelReportsKeys, type HotelReportsApi } from "./hotel-reports";
export { createHotelStayQueries, createHotelStaysApi, hotelStayKeys, type HotelStaysApi } from "./hotel-stays";
export {
  createIdentityDocumentQueries,
  createIdentityDocumentsApi,
  identityDocumentKeys,
  type IdentityDocumentsApi,
} from "./identity-documents";
export * from "./money";
export {
  createPlatformOrganizationQueries,
  createPlatformOrganizationsApi,
  platformOrganizationKeys,
  type PlatformOrganizationsApi,
} from "./platform-organizations";
export { createPlatformOversightApi, createPlatformOversightQueries, platformOversightKeys, type PlatformOversightApi } from "./platform-oversight";
export { createPlatformPortfolioApi, createPlatformPortfolioQueries, platformPortfolioKeys, type PlatformPortfolioApi } from "./platform-portfolio";
export { createPlatformUserQueries, createPlatformUsersApi, platformUserKeys, type PlatformUsersApi } from "./platform-users";
export { createPropertyPhotoQueries, createPropertyPhotosApi, propertyPhotosKeys, type PropertyPhotosApi } from "./property-photos";
export { createPropertyNameApi, propertyNameQuery, propertyNameMutation, propertyNameKeys } from "./property-name";
export { createSupportApi, supportContactsQuery, getSupportContacts, SUPPORT_PHONE_PLACEHOLDER } from "./support";
export { getAccountSettings } from "./account-settings";
export * from "./team";
export * from "./onboarding";
export * from "./reviews";
export * from "./referrals";
export { countries, countryName, searchCountries, type Country } from "./countries";
export { formatDay, formatTime, getReservationDetail, getStayKeyCard, getStayWallet, getTodayHeadline, partyLabel, type StayKeyCard, type WalletCard } from "./desk-format";
export {
  companionMissingFieldLabels,
  companionRowDetail,
  factTones,
  getCompanionFacts,
  getProfileReadiness,
  getProfileSections,
  profileMissingFieldLabels,
  firstMissingProfileField,
  profileSectionTitles,
  readinessLine,
  type FactIcon,
  type FactTone,
  type ProfileFact,
  type ProfileSectionKey,
} from "./guest-profile-view";
