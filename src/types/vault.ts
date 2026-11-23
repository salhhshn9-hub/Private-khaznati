export type RecordType = 'email' | 'app';

export type AccountCategory =
  | 'email'
  | 'social'
  | 'work'
  | 'finance'
  | 'gaming'
  | 'entertainment'
  | 'shopping'
  | 'government'
  | 'education'
  | 'other';

export type LoginMethod =
  | 'email_password'
  | 'google_oauth'
  | 'apple_id'
  | 'phone_otp'
  | 'username_password'
  | 'sso';

export type TwoFactorMethod =
  | 'none'
  | 'authenticator'
  | 'sms'
  | 'email'
  | 'hardware_key'
  | 'biometric';

export type SubscriptionStatus = 'none' | 'free' | 'monthly' | 'yearly' | 'lifetime';

export type AccountStatus = 'active' | 'suspended' | 'needs_update' | 'archived';

export type SiteSignupMethod =
  | 'oauth_button'
  | 'email_same_pwd'
  | 'email_custom_pwd'
  | 'username_only'
  | 'phone_otp';

export type RegisteredSiteStatus = 'active' | 'inactive' | 'deleted';

export type RegisteredGender = 'unspecified' | 'male' | 'female';

export type SubscriptionCurrency = 'SAR' | 'USD' | 'AED' | 'EUR' | 'OTHER';

export interface SecurityQuestionItem {
  question: string;
  answer: string;
}

export interface RegisteredSiteItem {
  id: string;
  name: string;
  platformKey: string;
  url: string;
  signupMethod: SiteSignupMethod;
  username: string;
  displayName: string;
  password: string;
  phoneNumber: string;
  pinCode: string;
  registeredBirthdate: string;
  createdAtDate: string;
  isApproximateDate: boolean;
  twoFactorEnabled: boolean;
  twoFactorNote: string;
  linkedCardHint: string;
  subscriptionCost: string;
  renewalDate: string;
  deviceUsed: string;
  status: RegisteredSiteStatus;
  notes: string;
}

export interface PasswordHistoryEntry {
  password: string;
  changedAt: string;
  note: string;
}

export interface AccountTimelineEvent {
  id: string;
  date: string;
  title: string;
}

export interface CustomFieldItem {
  id: string;
  label: string;
  value: string;
  isSecret: boolean;
}

export interface VaultAccount {
  id: string;
  ownerId: string;
  recordType: RecordType;
  title: string;
  platformKey: string;
  category: AccountCategory;
  emailAddress: string;
  parentEmailId: string;
  username: string;
  displayName: string;
  registeredFullName: string;
  registeredGender: RegisteredGender;
  accountRegion: string;
  billingAddressHint: string;
  billingEmail: string;
  accountExternalId: string;
  linkedPaymentHint: string;
  password: string;
  loginMethod: LoginMethod;
  websiteUrl: string;
  phoneNumber: string;
  recoveryEmail: string;
  recoveryPhone: string;
  recoveryContactPerson: string;
  registeredBirthdate: string;
  accountCreatedAt: string;
  createdDateApproximate: boolean;
  creationContext: string;
  lastAccessedAt: string;
  lastPasswordChangedAt: string;
  twoFactorEnabled: boolean;
  twoFactorMethod: TwoFactorMethod;
  totpSecret: string;
  passkeyEnabled: boolean;
  biometricDevice: string;
  backupCodes: string;
  securityQuestions: SecurityQuestionItem[];
  pinCode: string;
  subscriptionStatus: SubscriptionStatus;
  subscriptionCost: string;
  subscriptionAmount: number;
  subscriptionCurrency: SubscriptionCurrency;
  autoRenew: boolean;
  renewalDate: string;
  primaryDevice: string;
  trustedDevices: string[];
  registeredSites: RegisteredSiteItem[];
  passwordHistory: PasswordHistoryEntry[];
  timelineEvents: AccountTimelineEvent[];
  customFields: CustomFieldItem[];
  emergencyInstructions: string;
  status: AccountStatus;
  isFavorite: boolean;
  notes: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type VaultAccountDraft = Omit<VaultAccount, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>;

export interface VaultPreferences {
  ownerId: string;
  realBirthdate: string;
  vaultPinHash: string;
  autoLockMinutes: number;
  clipboardClearSeconds?: number;
  theme: 'light' | 'dark';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export const VAULT_LIMITS = {
  idMax: 128,
  idPattern: /^[a-zA-Z0-9_-]+$/,
  datePattern: /^(\d{4}-\d{2}-\d{2})?$/,
  titleMax: 120,
  platformKeyMax: 60,
  emailMax: 160,
  usernameMax: 120,
  displayNameMax: 120,
  fullNameMax: 140,
  regionMax: 80,
  billingAddressMax: 240,
  externalIdMax: 140,
  paymentHintMax: 120,
  creationContextMax: 240,
  passwordMax: 512,
  websiteUrlMax: 300,
  phoneMax: 40,
  dateMax: 20,
  totpSecretMax: 256,
  backupCodesMax: 1000,
  securityQuestionsMax: 5,
  securityQuestionTextMax: 200,
  pinCodeMax: 32,
  subscriptionCostMax: 40,
  primaryDeviceMax: 100,
  trustedDevicesMax: 15,
  registeredSitesMax: 150,
  passwordHistoryMax: 20,
  timelineEventsMax: 30,
  customFieldsMax: 20,
  customFieldLabelMax: 80,
  customFieldValueMax: 400,
  notesMax: 2000,
  vaultPinHashMax: 128,
} as const;
