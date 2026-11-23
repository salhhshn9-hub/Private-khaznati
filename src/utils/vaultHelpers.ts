import {
  AccountCategory,
  AccountStatus,
  LoginMethod,
  RecordType,
  RegisteredGender,
  RegisteredSiteItem,
  RegisteredSiteStatus,
  SiteSignupMethod,
  SubscriptionCurrency,
  SubscriptionStatus,
  TwoFactorMethod,
  VAULT_LIMITS,
  VaultAccount,
  VaultAccountDraft,
  VaultPreferences,
} from '../types/vault';

export interface PlatformPreset {
  key: string;
  label: string;
  recordType: RecordType;
  category: AccountCategory;
  defaultUrl: string;
  accentHex: string;
  shortCode: string;
}

export const PLATFORM_PRESETS: PlatformPreset[] = [
  // Emails
  { key: 'gmail', label: 'Gmail / Google', recordType: 'email', category: 'email', defaultUrl: 'https://mail.google.com', accentHex: '#DC2626', shortCode: 'GM' },
  { key: 'outlook', label: 'Outlook / Hotmail', recordType: 'email', category: 'email', defaultUrl: 'https://outlook.live.com', accentHex: '#0284C7', shortCode: 'OL' },
  { key: 'icloud', label: 'iCloud Mail', recordType: 'email', category: 'email', defaultUrl: 'https://www.icloud.com', accentHex: '#2563EB', shortCode: 'IC' },
  { key: 'yahoo', label: 'Yahoo Mail', recordType: 'email', category: 'email', defaultUrl: 'https://mail.yahoo.com', accentHex: '#7C3AED', shortCode: 'YH' },
  { key: 'proton', label: 'Proton Mail', recordType: 'email', category: 'email', defaultUrl: 'https://mail.proton.me', accentHex: '#4F46E5', shortCode: 'PM' },

  // Social
  { key: 'instagram', label: 'Instagram', recordType: 'app', category: 'social', defaultUrl: 'https://instagram.com', accentHex: '#E11D48', shortCode: 'IG' },
  { key: 'facebook', label: 'Facebook', recordType: 'app', category: 'social', defaultUrl: 'https://facebook.com', accentHex: '#1D4ED8', shortCode: 'FB' },
  { key: 'x', label: 'X (Twitter)', recordType: 'app', category: 'social', defaultUrl: 'https://x.com', accentHex: '#0F172A', shortCode: 'X' },
  { key: 'tiktok', label: 'TikTok', recordType: 'app', category: 'social', defaultUrl: 'https://tiktok.com', accentHex: '#18181B', shortCode: 'TT' },
  { key: 'snapchat', label: 'Snapchat', recordType: 'app', category: 'social', defaultUrl: 'https://snapchat.com', accentHex: '#CA8A04', shortCode: 'SC' },
  { key: 'whatsapp', label: 'WhatsApp', recordType: 'app', category: 'social', defaultUrl: 'https://web.whatsapp.com', accentHex: '#16A34A', shortCode: 'WA' },
  { key: 'telegram', label: 'Telegram', recordType: 'app', category: 'social', defaultUrl: 'https://web.telegram.org', accentHex: '#0284C7', shortCode: 'TG' },
  { key: 'threads', label: 'Threads', recordType: 'app', category: 'social', defaultUrl: 'https://threads.net', accentHex: '#18181B', shortCode: 'TH' },
  { key: 'reddit', label: 'Reddit', recordType: 'app', category: 'social', defaultUrl: 'https://reddit.com', accentHex: '#EA580C', shortCode: 'RD' },

  // AI & Work & Tech
  { key: 'chatgpt', label: 'ChatGPT / OpenAI', recordType: 'app', category: 'work', defaultUrl: 'https://chatgpt.com', accentHex: '#0D9488', shortCode: 'AI' },
  { key: 'github', label: 'GitHub', recordType: 'app', category: 'work', defaultUrl: 'https://github.com', accentHex: '#0F172A', shortCode: 'GH' },
  { key: 'linkedin', label: 'LinkedIn', recordType: 'app', category: 'work', defaultUrl: 'https://linkedin.com', accentHex: '#0369A1', shortCode: 'IN' },
  { key: 'apple', label: 'Apple ID', recordType: 'app', category: 'work', defaultUrl: 'https://appleid.apple.com', accentHex: '#334155', shortCode: 'AP' },
  { key: 'canva', label: 'Canva', recordType: 'app', category: 'work', defaultUrl: 'https://canva.com', accentHex: '#0284C7', shortCode: 'CV' },
  { key: 'adobe', label: 'Adobe Creative', recordType: 'app', category: 'work', defaultUrl: 'https://account.adobe.com', accentHex: '#DC2626', shortCode: 'AD' },
  { key: 'notion', label: 'Notion', recordType: 'app', category: 'work', defaultUrl: 'https://notion.so', accentHex: '#1E293B', shortCode: 'NT' },
  { key: 'figma', label: 'Figma', recordType: 'app', category: 'work', defaultUrl: 'https://figma.com', accentHex: '#7C3AED', shortCode: 'FG' },

  // Entertainment & Streaming
  { key: 'youtube', label: 'YouTube', recordType: 'app', category: 'entertainment', defaultUrl: 'https://youtube.com', accentHex: '#DC2626', shortCode: 'YT' },
  { key: 'netflix', label: 'Netflix', recordType: 'app', category: 'entertainment', defaultUrl: 'https://netflix.com', accentHex: '#B91C1C', shortCode: 'NF' },
  { key: 'shahid', label: 'شاهد (Shahid VIP)', recordType: 'app', category: 'entertainment', defaultUrl: 'https://shahid.mbc.net', accentHex: '#0F766E', shortCode: 'SH' },
  { key: 'osn', label: 'OSN+', recordType: 'app', category: 'entertainment', defaultUrl: 'https://osnplus.com', accentHex: '#1D4ED8', shortCode: 'OS' },
  { key: 'spotify', label: 'Spotify', recordType: 'app', category: 'entertainment', defaultUrl: 'https://spotify.com', accentHex: '#16A34A', shortCode: 'SP' },
  { key: 'anghami', label: 'أنغامي (Anghami)', recordType: 'app', category: 'entertainment', defaultUrl: 'https://play.anghami.com', accentHex: '#7C3AED', shortCode: 'AN' },
  { key: 'twitch', label: 'Twitch', recordType: 'app', category: 'entertainment', defaultUrl: 'https://twitch.tv', accentHex: '#7C3AED', shortCode: 'TW' },

  // Gaming
  { key: 'playstation', label: 'PlayStation', recordType: 'app', category: 'gaming', defaultUrl: 'https://playstation.com', accentHex: '#1D4ED8', shortCode: 'PS' },
  { key: 'xbox', label: 'Xbox / Microsoft', recordType: 'app', category: 'gaming', defaultUrl: 'https://xbox.com', accentHex: '#15803D', shortCode: 'XB' },
  { key: 'steam', label: 'Steam', recordType: 'app', category: 'gaming', defaultUrl: 'https://store.steampowered.com', accentHex: '#1E293B', shortCode: 'ST' },
  { key: 'discord', label: 'Discord', recordType: 'app', category: 'gaming', defaultUrl: 'https://discord.com', accentHex: '#4F46E5', shortCode: 'DC' },
  { key: 'epic', label: 'Epic Games', recordType: 'app', category: 'gaming', defaultUrl: 'https://store.epicgames.com', accentHex: '#334155', shortCode: 'EP' },
  { key: 'roblox', label: 'Roblox', recordType: 'app', category: 'gaming', defaultUrl: 'https://roblox.com', accentHex: '#475569', shortCode: 'RB' },

  // Shopping & Delivery
  { key: 'amazon', label: 'Amazon', recordType: 'app', category: 'shopping', defaultUrl: 'https://amazon.sa', accentHex: '#D97706', shortCode: 'AZ' },
  { key: 'noon', label: 'نون (Noon)', recordType: 'app', category: 'shopping', defaultUrl: 'https://noon.com', accentHex: '#CA8A04', shortCode: 'NN' },
  { key: 'shein', label: 'SHEIN', recordType: 'app', category: 'shopping', defaultUrl: 'https://shein.com', accentHex: '#18181B', shortCode: 'SN' },
  { key: 'aliexpress', label: 'AliExpress', recordType: 'app', category: 'shopping', defaultUrl: 'https://aliexpress.com', accentHex: '#EA580C', shortCode: 'AE' },
  { key: 'hungerstation', label: 'هنقرستيشن (HungerStation)', recordType: 'app', category: 'shopping', defaultUrl: 'https://hungerstation.com', accentHex: '#CA8A04', shortCode: 'HS' },
  { key: 'jahez', label: 'جاهز (Jahez)', recordType: 'app', category: 'shopping', defaultUrl: 'https://jahez.net', accentHex: '#DC2626', shortCode: 'JH' },
  { key: 'uber', label: 'Uber / Careem', recordType: 'app', category: 'shopping', defaultUrl: 'https://uber.com', accentHex: '#0F172A', shortCode: 'UB' },

  // Finance & Gov & Custom
  { key: 'paypal', label: 'PayPal', recordType: 'app', category: 'finance', defaultUrl: 'https://paypal.com', accentHex: '#1D4ED8', shortCode: 'PP' },
  { key: 'stcpay', label: 'stc pay / محفظة رقمية', recordType: 'app', category: 'finance', defaultUrl: '', accentHex: '#6D28D9', shortCode: 'ST' },
  { key: 'bank', label: 'حساب بنكي / مالي', recordType: 'app', category: 'finance', defaultUrl: '', accentHex: '#0F766E', shortCode: 'BK' },
  { key: 'absher', label: 'أبشر / نفاذ / حكومي', recordType: 'app', category: 'government', defaultUrl: 'https://absher.sa', accentHex: '#15803D', shortCode: 'AB' },
  { key: 'booking', label: 'Booking / سفر', recordType: 'app', category: 'other', defaultUrl: 'https://booking.com', accentHex: '#1D4ED8', shortCode: 'TR' },
  { key: 'custom', label: 'تطبيق / موقع مخصص', recordType: 'app', category: 'other', defaultUrl: '', accentHex: '#475569', shortCode: 'WB' },
];

export const CATEGORY_LABELS: Record<AccountCategory, string> = {
  email: 'بريد إلكتروني',
  social: 'تواصل اجتماعي',
  work: 'عمل وإنتاجية',
  finance: 'بنوك ومالية',
  gaming: 'ألعاب',
  entertainment: 'ترفيه وبث',
  shopping: 'تسوق وتوصيل',
  government: 'حكومي ورسمي',
  education: 'تعليم ودورات',
  other: 'أخرى',
};

export const LOGIN_METHOD_LABELS: Record<LoginMethod, string> = {
  email_password: 'بريد إلكتروني + كلمة مرور',
  google_oauth: 'تسجيل دخول عبر Google',
  apple_id: 'تسجيل دخول عبر Apple',
  phone_otp: 'رقم الجوال + رمز التحقق',
  username_password: 'اسم المستخدم + كلمة مرور',
  sso: 'دخول موحد (SSO)',
};

export const SITE_SIGNUP_METHOD_LABELS: Record<SiteSignupMethod, string> = {
  oauth_button: 'تسجيل مباشر بهذا الحساب (OAuth / نقرة واحدة)',
  email_same_pwd: 'نفس البريد ونفس كلمة المرور',
  email_custom_pwd: 'نفس البريد بكلمة مرور مختلفة',
  username_only: 'اسم مستخدم مرتبط بالحساب',
  phone_otp: 'عبر رقم الجوال المسجّل',
};

export const SITE_STATUS_LABELS: Record<RegisteredSiteStatus, string> = {
  active: 'نشط',
  inactive: 'غير مستخدم حالياً',
  deleted: 'تم حذفه / إغلاقه',
};

export const GENDER_LABELS: Record<RegisteredGender, string> = {
  unspecified: 'غير محدد',
  male: 'ذكر',
  female: 'أنثى',
};

export const CURRENCY_LABELS: Record<SubscriptionCurrency, string> = {
  SAR: 'ر.س (SAR)',
  USD: 'دولار (USD)',
  AED: 'د.إ (AED)',
  EUR: 'يورو (EUR)',
  OTHER: 'عملة أخرى',
};

export const TWO_FACTOR_LABELS: Record<TwoFactorMethod, string> = {
  none: 'غير مفعل',
  authenticator: 'تطبيق المصادقة (Authenticator)',
  sms: 'رسالة نصية (SMS)',
  email: 'بريد الاسترداد',
  hardware_key: 'مفتاح أمان فعلي',
  biometric: 'بصمة / Passkey',
};

export const SUBSCRIPTION_LABELS: Record<SubscriptionStatus, string> = {
  none: 'بدون اشتراك',
  free: 'خطة مجانية',
  monthly: 'اشتراك شهري',
  yearly: 'اشتراك سنوي',
  lifetime: 'دفع لمرة واحدة',
};

export const STATUS_LABELS: Record<AccountStatus, string> = {
  active: 'نشط',
  suspended: 'مجمّد / مؤقت',
  needs_update: 'يحتاج تحديث أمان',
  archived: 'مؤرشف',
};

export function getPresetByKey(key: string): PlatformPreset {
  return PLATFORM_PRESETS.find((p) => p.key === key) || PLATFORM_PRESETS[PLATFORM_PRESETS.length - 1];
}

export function createEmptyAccountDraft(overrides?: Partial<VaultAccountDraft>): VaultAccountDraft {
  return {
    recordType: 'app',
    title: '',
    platformKey: 'custom',
    category: 'social',
    emailAddress: '',
    parentEmailId: '',
    username: '',
    displayName: '',
    registeredFullName: '',
    registeredGender: 'unspecified',
    accountRegion: '',
    billingAddressHint: '',
    billingEmail: '',
    accountExternalId: '',
    linkedPaymentHint: '',
    password: '',
    loginMethod: 'email_password',
    websiteUrl: '',
    phoneNumber: '',
    recoveryEmail: '',
    recoveryPhone: '',
    recoveryContactPerson: '',
    registeredBirthdate: '',
    accountCreatedAt: '',
    createdDateApproximate: false,
    creationContext: '',
    lastAccessedAt: '',
    lastPasswordChangedAt: new Date().toISOString().slice(0, 10),
    twoFactorEnabled: false,
    twoFactorMethod: 'none',
    totpSecret: '',
    passkeyEnabled: false,
    biometricDevice: '',
    backupCodes: '',
    securityQuestions: [],
    pinCode: '',
    subscriptionStatus: 'free',
    subscriptionCost: '',
    subscriptionAmount: 0,
    subscriptionCurrency: 'SAR',
    autoRenew: false,
    renewalDate: '',
    primaryDevice: '',
    trustedDevices: [],
    registeredSites: [],
    passwordHistory: [],
    timelineEvents: [],
    customFields: [],
    emergencyInstructions: '',
    status: 'active',
    isFavorite: false,
    notes: '',
    ...overrides,
  };
}

export function createEmptySiteItem(overrides?: Partial<RegisteredSiteItem>): RegisteredSiteItem {
  return {
    id: generateSafeId('site'),
    name: '',
    platformKey: 'custom',
    url: '',
    signupMethod: 'oauth_button',
    username: '',
    displayName: '',
    password: '',
    phoneNumber: '',
    pinCode: '',
    registeredBirthdate: '',
    createdAtDate: '',
    isApproximateDate: false,
    twoFactorEnabled: false,
    twoFactorNote: '',
    linkedCardHint: '',
    subscriptionCost: '',
    renewalDate: '',
    deviceUsed: '',
    status: 'active',
    notes: '',
    ...overrides,
  };
}

function clampStr(value: unknown, max: number): string {
  const s = typeof value === 'string' ? value.trim() : '';
  return s.length > max ? s.slice(0, max) : s;
}

function clampDate(value: unknown): string {
  const s = typeof value === 'string' ? value.trim() : '';
  return VAULT_LIMITS.datePattern.test(s) ? s : '';
}

export function generateSafeId(prefix = 'acc'): string {
  const randomPart =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 14)
      : Math.random().toString(36).slice(2, 12);
  return `${prefix}_${Date.now().toString(36)}_${randomPart}`;
}

export function sanitizeAccountPayload(
  draft: Partial<VaultAccountDraft>,
  ownerId: string,
  accountId: string,
  validParentIds?: Set<string>
): Omit<VaultAccount, 'createdAt' | 'updatedAt'> {
  const safeParentId = clampStr(draft.parentEmailId, VAULT_LIMITS.idMax);
  const resolvedParentId =
    safeParentId &&
    safeParentId !== accountId &&
    VAULT_LIMITS.idPattern.test(safeParentId) &&
    (!validParentIds || validParentIds.has(safeParentId))
      ? safeParentId
      : '';

  const safeQuestions = (Array.isArray(draft.securityQuestions) ? draft.securityQuestions : [])
    .slice(0, VAULT_LIMITS.securityQuestionsMax)
    .map((item) => ({
      question: clampStr(item?.question, VAULT_LIMITS.securityQuestionTextMax),
      answer: clampStr(item?.answer, VAULT_LIMITS.securityQuestionTextMax),
    }))
    .filter((item) => item.question.length > 0 || item.answer.length > 0);

  const safeTrustedDevices = (Array.isArray(draft.trustedDevices) ? draft.trustedDevices : [])
    .slice(0, VAULT_LIMITS.trustedDevicesMax)
    .map((d) => clampStr(d, VAULT_LIMITS.primaryDeviceMax))
    .filter(Boolean);

  const safeRegisteredSites: RegisteredSiteItem[] = (
    Array.isArray(draft.registeredSites) ? draft.registeredSites : []
  )
    .slice(0, VAULT_LIMITS.registeredSitesMax)
    .map((site) => ({
      id: clampStr(site?.id, VAULT_LIMITS.idMax) || generateSafeId('site'),
      name: clampStr(site?.name, VAULT_LIMITS.titleMax),
      platformKey: clampStr(site?.platformKey, VAULT_LIMITS.platformKeyMax) || 'custom',
      url: clampStr(site?.url, VAULT_LIMITS.websiteUrlMax),
      signupMethod:
        site?.signupMethod && site.signupMethod in SITE_SIGNUP_METHOD_LABELS
          ? site.signupMethod
          : 'oauth_button',
      username: clampStr(site?.username, VAULT_LIMITS.usernameMax),
      displayName: clampStr(site?.displayName, VAULT_LIMITS.displayNameMax),
      password:
        typeof site?.password === 'string' ? site.password.slice(0, VAULT_LIMITS.passwordMax) : '',
      phoneNumber: clampStr(site?.phoneNumber, VAULT_LIMITS.phoneMax),
      pinCode: clampStr(site?.pinCode, VAULT_LIMITS.pinCodeMax),
      registeredBirthdate: clampDate(site?.registeredBirthdate),
      createdAtDate: clampDate(site?.createdAtDate),
      isApproximateDate: Boolean(site?.isApproximateDate),
      twoFactorEnabled: Boolean(site?.twoFactorEnabled),
      twoFactorNote: clampStr(site?.twoFactorNote, 120),
      linkedCardHint: clampStr(site?.linkedCardHint, VAULT_LIMITS.paymentHintMax),
      subscriptionCost: clampStr(site?.subscriptionCost, VAULT_LIMITS.subscriptionCostMax),
      renewalDate: clampDate(site?.renewalDate),
      deviceUsed: clampStr(site?.deviceUsed, VAULT_LIMITS.primaryDeviceMax),
      status:
        site?.status && site.status in SITE_STATUS_LABELS ? site.status : 'active',
      notes: clampStr(site?.notes, VAULT_LIMITS.notesMax),
    }))
    .filter((s) => s.name.length > 0 || s.url.length > 0);

  const safePasswordHistory = (
    Array.isArray(draft.passwordHistory) ? draft.passwordHistory : []
  )
    .slice(0, VAULT_LIMITS.passwordHistoryMax)
    .map((entry) => ({
      password:
        typeof entry?.password === 'string'
          ? entry.password.slice(0, VAULT_LIMITS.passwordMax)
          : '',
      changedAt: clampDate(entry?.changedAt) || new Date().toISOString().slice(0, 10),
      note: clampStr(entry?.note, 140),
    }))
    .filter((e) => e.password.length > 0);

  const safeTimelineEvents = (
    Array.isArray(draft.timelineEvents) ? draft.timelineEvents : []
  )
    .slice(0, VAULT_LIMITS.timelineEventsMax)
    .map((ev) => ({
      id: clampStr(ev?.id, VAULT_LIMITS.idMax) || generateSafeId('evt'),
      date: clampDate(ev?.date),
      title: clampStr(ev?.title, 200),
    }))
    .filter((ev) => ev.title.length > 0 || ev.date.length > 0);

  const safeCustomFields = (Array.isArray(draft.customFields) ? draft.customFields : [])
    .slice(0, VAULT_LIMITS.customFieldsMax)
    .map((cf) => ({
      id: clampStr(cf?.id, VAULT_LIMITS.idMax) || generateSafeId('cf'),
      label: clampStr(cf?.label, VAULT_LIMITS.customFieldLabelMax),
      value: clampStr(cf?.value, VAULT_LIMITS.customFieldValueMax),
      isSecret: Boolean(cf?.isSecret),
    }))
    .filter((cf) => cf.label.length > 0 || cf.value.length > 0);

  const parsedAmount =
    typeof draft.subscriptionAmount === 'number' &&
    Number.isFinite(draft.subscriptionAmount) &&
    draft.subscriptionAmount >= 0
      ? Math.round(draft.subscriptionAmount * 100) / 100
      : 0;

  return {
    id: clampStr(accountId, VAULT_LIMITS.idMax),
    ownerId: clampStr(ownerId, VAULT_LIMITS.idMax),
    recordType: draft.recordType === 'email' ? 'email' : 'app',
    title: clampStr(draft.title, VAULT_LIMITS.titleMax) || 'حساب بدون عنوان',
    platformKey: clampStr(draft.platformKey, VAULT_LIMITS.platformKeyMax) || 'custom',
    category: draft.category && draft.category in CATEGORY_LABELS ? draft.category : 'other',
    emailAddress: clampStr(draft.emailAddress, VAULT_LIMITS.emailMax),
    parentEmailId: resolvedParentId,
    username: clampStr(draft.username, VAULT_LIMITS.usernameMax),
    displayName: clampStr(draft.displayName, VAULT_LIMITS.displayNameMax),
    registeredFullName: clampStr(draft.registeredFullName, VAULT_LIMITS.fullNameMax),
    registeredGender:
      draft.registeredGender && draft.registeredGender in GENDER_LABELS
        ? draft.registeredGender
        : 'unspecified',
    accountRegion: clampStr(draft.accountRegion, VAULT_LIMITS.regionMax),
    billingAddressHint: clampStr(draft.billingAddressHint, VAULT_LIMITS.billingAddressMax),
    billingEmail: clampStr(draft.billingEmail, VAULT_LIMITS.emailMax),
    accountExternalId: clampStr(draft.accountExternalId, VAULT_LIMITS.externalIdMax),
    linkedPaymentHint: clampStr(draft.linkedPaymentHint, VAULT_LIMITS.paymentHintMax),
    password: typeof draft.password === 'string' ? draft.password.slice(0, VAULT_LIMITS.passwordMax) : '',
    loginMethod: draft.loginMethod && draft.loginMethod in LOGIN_METHOD_LABELS ? draft.loginMethod : 'email_password',
    websiteUrl: clampStr(draft.websiteUrl, VAULT_LIMITS.websiteUrlMax),
    phoneNumber: clampStr(draft.phoneNumber, VAULT_LIMITS.phoneMax),
    recoveryEmail: clampStr(draft.recoveryEmail, VAULT_LIMITS.emailMax),
    recoveryPhone: clampStr(draft.recoveryPhone, VAULT_LIMITS.phoneMax),
    recoveryContactPerson: clampStr(draft.recoveryContactPerson, VAULT_LIMITS.fullNameMax),
    registeredBirthdate: clampDate(draft.registeredBirthdate),
    accountCreatedAt: clampDate(draft.accountCreatedAt),
    createdDateApproximate: Boolean(draft.createdDateApproximate),
    creationContext: clampStr(draft.creationContext, VAULT_LIMITS.creationContextMax),
    lastAccessedAt: clampDate(draft.lastAccessedAt),
    lastPasswordChangedAt: clampDate(draft.lastPasswordChangedAt),
    twoFactorEnabled: Boolean(draft.twoFactorEnabled),
    twoFactorMethod: draft.twoFactorEnabled
      ? draft.twoFactorMethod && draft.twoFactorMethod in TWO_FACTOR_LABELS && draft.twoFactorMethod !== 'none'
        ? draft.twoFactorMethod
        : 'authenticator'
      : 'none',
    totpSecret: clampStr(draft.totpSecret, VAULT_LIMITS.totpSecretMax),
    passkeyEnabled: Boolean(draft.passkeyEnabled),
    biometricDevice: clampStr(draft.biometricDevice, VAULT_LIMITS.primaryDeviceMax),
    backupCodes: typeof draft.backupCodes === 'string' ? draft.backupCodes.slice(0, VAULT_LIMITS.backupCodesMax) : '',
    securityQuestions: safeQuestions,
    pinCode: clampStr(draft.pinCode, VAULT_LIMITS.pinCodeMax),
    subscriptionStatus: draft.subscriptionStatus && draft.subscriptionStatus in SUBSCRIPTION_LABELS ? draft.subscriptionStatus : 'none',
    subscriptionCost: clampStr(draft.subscriptionCost, VAULT_LIMITS.subscriptionCostMax),
    subscriptionAmount: parsedAmount,
    subscriptionCurrency:
      draft.subscriptionCurrency && draft.subscriptionCurrency in CURRENCY_LABELS
        ? draft.subscriptionCurrency
        : 'SAR',
    autoRenew: Boolean(draft.autoRenew),
    renewalDate: clampDate(draft.renewalDate),
    primaryDevice: clampStr(draft.primaryDevice, VAULT_LIMITS.primaryDeviceMax),
    trustedDevices: safeTrustedDevices,
    registeredSites: safeRegisteredSites,
    passwordHistory: safePasswordHistory,
    timelineEvents: safeTimelineEvents,
    customFields: safeCustomFields,
    emergencyInstructions: clampStr(draft.emergencyInstructions, VAULT_LIMITS.notesMax),
    status: draft.status && draft.status in STATUS_LABELS ? draft.status : 'active',
    isFavorite: Boolean(draft.isFavorite),
    notes: typeof draft.notes === 'string' ? draft.notes.slice(0, VAULT_LIMITS.notesMax) : '',
  };
}

export function sanitizePreferencesPayload(
  prefs: Partial<VaultPreferences>,
  ownerId: string
): Omit<VaultPreferences, 'createdAt' | 'updatedAt'> {
  return {
    ownerId: clampStr(ownerId, VAULT_LIMITS.idMax),
    realBirthdate: clampDate(prefs.realBirthdate),
    vaultPinHash: clampStr(prefs.vaultPinHash, VAULT_LIMITS.vaultPinHashMax),
    autoLockMinutes:
      typeof prefs.autoLockMinutes === 'number' && prefs.autoLockMinutes >= 0 && prefs.autoLockMinutes <= 120
        ? Math.round(prefs.autoLockMinutes)
        : 15,
    clipboardClearSeconds:
      typeof prefs.clipboardClearSeconds === 'number' &&
      prefs.clipboardClearSeconds >= 0 &&
      prefs.clipboardClearSeconds <= 300
        ? Math.round(prefs.clipboardClearSeconds)
        : 30,
    theme: prefs.theme === 'dark' ? 'dark' : 'light',
  };
}

export function calculateAgeFromBirthdate(dateStr: string): number | null {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const birth = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}

export function calculateAccountDuration(dateStr: string): { label: string; days: number } | null {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const created = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(created.getTime())) return null;
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  if (diffMs < 0) return { label: 'تاريخ مستقبلي', days: 0 };
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);

  if (years > 0 && months > 0) {
    return { label: `منذ ${years} ${years === 1 ? 'سنة' : years === 2 ? 'سنتين' : 'سنوات'} و ${months} ${months === 1 ? 'شهر' : months <= 10 ? 'أشهر' : 'شهراً'}`, days };
  }
  if (years > 0) {
    return { label: `منذ ${years} ${years === 1 ? 'سنة' : years === 2 ? 'سنتين' : 'سنوات'}`, days };
  }
  if (months > 0) {
    return { label: `منذ ${months} ${months === 1 ? 'شهر' : months === 2 ? 'شهرين' : months <= 10 ? 'أشهر' : 'شهراً'}`, days };
  }
  if (days > 0) {
    return { label: `منذ ${days} ${days === 1 ? 'يوم' : days === 2 ? 'يومين' : days <= 10 ? 'أيام' : 'يوماً'}`, days };
  }
  return { label: 'أُنشئ اليوم', days: 0 };
}

export function formatReadableDate(dateStr: string): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return 'غير مسجل';
  return dateStr.replace(/-/g, '/');
}

export interface PasswordEvaluation {
  score: number;
  label: string;
  tier: 'weak' | 'fair' | 'strong' | 'excellent';
  entropyBits: number;
  crackEstimate: string;
}

export function evaluatePasswordStrength(password: string): PasswordEvaluation {
  if (!password) {
    return { score: 0, label: 'غير محددة', tier: 'weak', entropyBits: 0, crackEstimate: '—' };
  }

  let charsetSize = 0;
  if (/[a-z]/.test(password)) charsetSize += 26;
  if (/[A-Z]/.test(password)) charsetSize += 26;
  if (/[0-9]/.test(password)) charsetSize += 10;
  if (/[^a-zA-Z0-9]/.test(password)) charsetSize += 32;
  if (charsetSize === 0) charsetSize = 26;

  const entropyBits = Math.round(password.length * Math.log2(charsetSize));
  let score = Math.min(100, Math.round((entropyBits / 90) * 100));

  if (/^(.)\1+$/.test(password)) score = Math.min(score, 15);
  if (password.length < 8) score = Math.min(score, 35);

  let crackEstimate = 'أقل من ثانية';
  if (entropyBits >= 85) crackEstimate = 'ملايين السنين';
  else if (entropyBits >= 65) crackEstimate = 'مئات السنين';
  else if (entropyBits >= 50) crackEstimate = 'عدة سنوات';
  else if (entropyBits >= 38) crackEstimate = 'أيام إلى أسابيع';
  else if (entropyBits >= 28) crackEstimate = 'ساعات';

  if (score < 40) return { score, label: 'ضعيفة', tier: 'weak', entropyBits, crackEstimate };
  if (score < 65) return { score, label: 'متوسطة', tier: 'fair', entropyBits, crackEstimate };
  if (score < 85) return { score, label: 'قوية', tier: 'strong', entropyBits, crackEstimate };
  return { score, label: 'ممتازة', tier: 'excellent', entropyBits, crackEstimate };
}

export interface PasswordGeneratorOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
}

export function generateSecurePassword(opts: PasswordGeneratorOptions): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const nums = '23456789';
  const syms = '!@#$%^&*_-+=?';

  let pool = '';
  const guaranteed: string[] = [];

  if (opts.uppercase) {
    pool += upper;
    guaranteed.push(upper[secureRandomIndex(upper.length)]);
  }
  if (opts.lowercase) {
    pool += lower;
    guaranteed.push(lower[secureRandomIndex(lower.length)]);
  }
  if (opts.numbers) {
    pool += nums;
    guaranteed.push(nums[secureRandomIndex(nums.length)]);
  }
  if (opts.symbols) {
    pool += syms;
    guaranteed.push(syms[secureRandomIndex(syms.length)]);
  }

  if (!pool) {
    pool = lower + nums;
  }

  const length = Math.max(8, Math.min(48, opts.length));
  const chars: string[] = [...guaranteed];

  while (chars.length < length) {
    chars.push(pool[secureRandomIndex(pool.length)]);
  }

  for (let i = chars.length - 1; i > 0; i--) {
    const j = secureRandomIndex(i + 1);
    const tmp = chars[i];
    chars[i] = chars[j];
    chars[j] = tmp;
  }

  return chars.join('');
}

export function generateRandomUsername(baseWord = ''): string {
  const adjectives = ['swift', 'nova', 'atlas', 'orbit', 'pixel', 'lunar', 'zenith', 'echo', 'prime', 'crest'];
  const nouns = ['falcon', 'coder', 'spark', 'ridge', 'pulse', 'craft', 'vault', 'voyager', 'horizon', 'shadow'];
  const cleanBase = baseWord.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  const num = 10 + secureRandomIndex(899);
  if (cleanBase.length >= 2) {
    const suffix = nouns[secureRandomIndex(nouns.length)];
    return `${cleanBase}_${suffix}${num}`;
  }
  return `${adjectives[secureRandomIndex(adjectives.length)]}_${nouns[secureRandomIndex(nouns.length)]}${num}`;
}

const PASSPHRASE_WORDS = [
  'amber', 'anchor', 'apollo', 'arctic', 'arrow', 'atlas', 'aurora', 'badge', 'beacon', 'birch',
  'blade', 'blaze', 'breeze', 'bridge', 'bronze', 'canyon', 'cedar', 'cipher', 'cloud', 'cobalt',
  'comet', 'coral', 'cosmos', 'craft', 'crest', 'crown', 'crystal', 'dawn', 'delta', 'desert',
  'diamond', 'drift', 'eagle', 'echo', 'ember', 'emerald', 'falcon', 'fjord', 'flame', 'flint',
  'forest', 'forge', 'frost', 'galaxy', 'glacier', 'granite', 'harbor', 'haven', 'hawk', 'horizon',
  'indigo', 'island', 'ivory', 'jade', 'jasper', 'kestrel', 'lagoon', 'lantern', 'laser', 'lumen',
  'lunar', 'maple', 'marble', 'matrix', 'meadow', 'meteor', 'mirage', 'nebula', 'nectar', 'noble',
  'north', 'nova', 'oasis', 'obsidian', 'ocean', 'olive', 'omega', 'onyx', 'orbit', 'orchid',
  'osprey', 'palace', 'panther', 'pebble', 'phoenix', 'pine', 'pixel', 'planet', 'prism', 'pulse',
  'quartz', 'radar', 'raven', 'ridge', 'river', 'ruby', 'sable', 'safari', 'saffron', 'sapphire',
  'shield', 'silver', 'solar', 'spark', 'sphere', 'spire', 'star', 'steel', 'storm', 'summit',
  'swift', 'terra', 'thunder', 'tiger', 'timber', 'titan', 'topaz', 'trail', 'trident', 'tundra',
  'umber', 'valor', 'vault', 'vector', 'velvet', 'vertex', 'vigor', 'violet', 'voyager', 'zenith',
];

export function generatePassphrase(
  wordCount = 4,
  separator = '-',
  capitalize = true,
  includeNumber = true
): string {
  const safeCount = Math.max(3, Math.min(7, wordCount));
  const chosen: string[] = [];
  for (let i = 0; i < safeCount; i++) {
    const word = PASSPHRASE_WORDS[secureRandomIndex(PASSPHRASE_WORDS.length)];
    chosen.push(capitalize ? word.charAt(0).toUpperCase() + word.slice(1) : word);
  }
  if (includeNumber) {
    const numPos = secureRandomIndex(chosen.length);
    chosen[numPos] = `${chosen[numPos]}${10 + secureRandomIndex(89)}`;
  }
  return chosen.join(separator);
}

function secureRandomIndex(max: number): number {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return arr[0] % max;
}

export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`khaznati_pin_${pin}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export interface AuditReport {
  reusedPasswordGroups: { passwordMasked: string; accounts: VaultAccount[] }[];
  weakPasswordAccounts: VaultAccount[];
  noTwoFactorAccounts: VaultAccount[];
  oldPasswordAccounts: { account: VaultAccount; daysSinceChange: number }[];
  birthdateMismatches: {
    account: VaultAccount;
    siteName?: string;
    siteBirthdate?: string;
    reason: string;
    parentBirthdate?: string;
  }[];
  missingDatesAccounts: VaultAccount[];
}

export function buildVaultAuditReport(
  accounts: VaultAccount[],
  realBirthdate: string
): AuditReport {
  const accountMap = new Map<string, VaultAccount>();
  accounts.forEach((a) => accountMap.set(a.id, a));

  const passwordBuckets = new Map<string, VaultAccount[]>();
  for (const acc of accounts) {
    if (acc.password && acc.loginMethod !== 'google_oauth' && acc.loginMethod !== 'apple_id') {
      const list = passwordBuckets.get(acc.password) || [];
      list.push(acc);
      passwordBuckets.set(acc.password, list);
    }
  }

  const reusedPasswordGroups = Array.from(passwordBuckets.entries())
    .filter(([, list]) => list.length > 1)
    .map(([pwd, list]) => ({
      passwordMasked: `${pwd.slice(0, 2)}${'•'.repeat(Math.max(4, pwd.length - 2))}`,
      accounts: list,
    }));

  const weakPasswordAccounts = accounts.filter((acc) => {
    if (!acc.password) return false;
    if (acc.loginMethod === 'google_oauth' || acc.loginMethod === 'apple_id') return false;
    return evaluatePasswordStrength(acc.password).tier === 'weak';
  });

  const noTwoFactorAccounts = accounts.filter(
    (acc) => acc.status === 'active' && !acc.twoFactorEnabled
  );

  const nowMs = Date.now();
  const oldPasswordAccounts: { account: VaultAccount; daysSinceChange: number }[] = [];
  for (const acc of accounts) {
    if (acc.lastPasswordChangedAt && /^\d{4}-\d{2}-\d{2}$/.test(acc.lastPasswordChangedAt)) {
      const changedMs = new Date(`${acc.lastPasswordChangedAt}T00:00:00`).getTime();
      const days = Math.floor((nowMs - changedMs) / (1000 * 60 * 60 * 24));
      if (days >= 180) {
        oldPasswordAccounts.push({ account: acc, daysSinceChange: days });
      }
    }
  }

  const birthdateMismatches: AuditReport['birthdateMismatches'] = [];
  for (const acc of accounts) {
    const parent = acc.parentEmailId ? accountMap.get(acc.parentEmailId) : undefined;
    if (acc.registeredBirthdate) {
      if (parent?.registeredBirthdate && acc.registeredBirthdate !== parent.registeredBirthdate) {
        birthdateMismatches.push({
          account: acc,
          reason: `يختلف عن تاريخ ميلاد الحساب المرتبط (${formatReadableDate(parent.registeredBirthdate)})`,
          parentBirthdate: parent.registeredBirthdate,
        });
      } else if (realBirthdate && acc.registeredBirthdate !== realBirthdate) {
        birthdateMismatches.push({
          account: acc,
          reason: `مخالف لتاريخ ميلادك الحقيقي (${formatReadableDate(realBirthdate)})`,
          parentBirthdate: parent?.registeredBirthdate,
        });
      }
    }

    for (const site of acc.registeredSites || []) {
      if (!site.registeredBirthdate) continue;
      if (acc.registeredBirthdate && site.registeredBirthdate !== acc.registeredBirthdate) {
        birthdateMismatches.push({
          account: acc,
          siteName: site.name,
          siteBirthdate: site.registeredBirthdate,
          reason: `موقع "${site.name}" مسجّل بميلاد (${formatReadableDate(site.registeredBirthdate)}) مختلف عن الحساب الأب`,
          parentBirthdate: acc.registeredBirthdate,
        });
      } else if (realBirthdate && site.registeredBirthdate !== realBirthdate) {
        birthdateMismatches.push({
          account: acc,
          siteName: site.name,
          siteBirthdate: site.registeredBirthdate,
          reason: `موقع "${site.name}" مسجّل بميلاد مخالف لتاريخ ميلادك الحقيقي (${formatReadableDate(realBirthdate)})`,
        });
      }
    }
  }

  const missingDatesAccounts = accounts.filter(
    (acc) => !acc.registeredBirthdate || !acc.accountCreatedAt
  );

  return {
    reusedPasswordGroups,
    weakPasswordAccounts,
    noTwoFactorAccounts,
    oldPasswordAccounts,
    birthdateMismatches,
    missingDatesAccounts,
  };
}

export function getAccountFieldCompleteness(acc: VaultAccount): {
  filled: number;
  total: number;
} {
  const checks = [
    Boolean(acc.emailAddress || acc.username),
    Boolean(acc.password),
    Boolean(acc.registeredBirthdate),
    Boolean(acc.accountCreatedAt),
    Boolean(acc.twoFactorEnabled),
    Boolean(acc.recoveryEmail || acc.recoveryPhone),
    Boolean(acc.registeredFullName || acc.displayName),
    Boolean(acc.primaryDevice || acc.trustedDevices?.length),
  ];
  return {
    filled: checks.filter(Boolean).length,
    total: checks.length,
  };
}

export function buildAccountTextSummary(
  acc: VaultAccount,
  linkedApps: VaultAccount[],
  includeSecrets = false
): string {
  const lines: string[] = [
    `=== ملخص الحساب: ${acc.title} ===`,
    `النوع: ${acc.recordType === 'email' ? 'بريد إلكتروني رئيسي' : 'حساب تطبيق / موقع'}`,
    `التصنيف: ${CATEGORY_LABELS[acc.category]}`,
    `الحالة: ${STATUS_LABELS[acc.status]}`,
  ];
  if (acc.emailAddress) lines.push(`البريد الإلكتروني: ${acc.emailAddress}`);
  if (acc.username) lines.push(`اسم المستخدم: ${acc.username}`);
  if (acc.displayName) lines.push(`الاسم الظاهر: ${acc.displayName}`);
  if (acc.registeredFullName) lines.push(`الاسم الكامل المسجّل: ${acc.registeredFullName}`);
  if (includeSecrets && acc.password) lines.push(`كلمة المرور: ${acc.password}`);
  if (includeSecrets && acc.pinCode) lines.push(`رمز PIN: ${acc.pinCode}`);
  if (includeSecrets && acc.totpSecret) lines.push(`مفتاح 2FA (TOTP): ${acc.totpSecret}`);
  if (acc.phoneNumber) lines.push(`رقم الجوال: ${acc.phoneNumber}`);
  if (acc.registeredBirthdate) lines.push(`تاريخ الميلاد المسجّل: ${formatReadableDate(acc.registeredBirthdate)}`);
  if (acc.accountCreatedAt) {
    lines.push(
      `تاريخ إنشاء الحساب: ${formatReadableDate(acc.accountCreatedAt)}${acc.createdDateApproximate ? ' (تقريبي)' : ''}`
    );
  }
  if (acc.creationContext) lines.push(`سياق الإنشاء: ${acc.creationContext}`);
  if (acc.accountRegion) lines.push(`الدولة / المتجر: ${acc.accountRegion}`);
  if (acc.accountExternalId) lines.push(`معرّف الحساب: ${acc.accountExternalId}`);
  if (acc.recoveryEmail) lines.push(`بريد الاسترداد: ${acc.recoveryEmail}`);
  if (acc.recoveryPhone) lines.push(`جوال الاسترداد: ${acc.recoveryPhone}`);
  if (acc.recoveryContactPerson) lines.push(`جهة اتصال الطوارئ: ${acc.recoveryContactPerson}`);
  if (acc.primaryDevice) lines.push(`الجهاز الأساسي: ${acc.primaryDevice}`);
  if (acc.linkedPaymentHint) lines.push(`وسيلة الدفع المربوطة: ${acc.linkedPaymentHint}`);
  if (acc.customFields?.length) {
    lines.push('');
    lines.push('--- حقول مخصصة ---');
    acc.customFields.forEach((cf) => {
      lines.push(`- ${cf.label}: ${cf.isSecret && !includeSecrets ? '••••••' : cf.value}`);
    });
  }
  if (acc.notes) lines.push(`الملاحظات: ${acc.notes}`);

  if (linkedApps.length > 0 || (acc.registeredSites?.length || 0) > 0) {
    lines.push('');
    lines.push('--- المواقع والتطبيقات المنشأة بهذا الحساب ---');
    linkedApps.forEach((child) => {
      const pwdPart = includeSecrets && child.password ? ` | كلمة المرور: ${child.password}` : '';
      lines.push(
        `- ${child.title} | مستخدم: ${child.username || '—'}${pwdPart} | ميلاد: ${formatReadableDate(child.registeredBirthdate)} | إنشاء: ${formatReadableDate(child.accountCreatedAt)}`
      );
    });
    (acc.registeredSites || []).forEach((s) => {
      const pwdPart = includeSecrets && s.password ? ` | كلمة المرور: ${s.password}` : '';
      lines.push(
        `- ${s.name} (${SITE_SIGNUP_METHOD_LABELS[s.signupMethod]}) | مستخدم: ${s.username || '—'}${pwdPart} | ميلاد: ${formatReadableDate(s.registeredBirthdate)} | إنشاء: ${formatReadableDate(s.createdAtDate)}`
      );
    });
  }

  return lines.join('\n');
}

export function exportAccountsToCsv(accounts: VaultAccount[]): string {
  const escape = (val: string) => `"${(val || '').replace(/"/g, '""')}"`;
  const headers = [
    'النوع',
    'الحساب / التطبيق',
    'الحساب الأب',
    'البريد الإلكتروني',
    'اسم المستخدم',
    'الاسم الظاهر',
    'تاريخ الميلاد المسجل',
    'تاريخ الإنشاء',
    'رقم الجوال',
    'التحقق بخطوتين',
    'الدولة / المتجر',
    'ملاحظات',
  ];

  const accountById = new Map(accounts.map((a) => [a.id, a]));
  const rows: string[][] = [headers];

  for (const acc of accounts) {
    const parent = acc.parentEmailId ? accountById.get(acc.parentEmailId) : undefined;
    rows.push([
      acc.recordType === 'email' ? 'بريد رئيسي' : 'تطبيق / موقع',
      acc.title,
      parent ? parent.title : '',
      acc.emailAddress,
      acc.username,
      acc.displayName,
      acc.registeredBirthdate,
      acc.accountCreatedAt,
      acc.phoneNumber,
      acc.twoFactorEnabled ? TWO_FACTOR_LABELS[acc.twoFactorMethod] : 'غير مفعل',
      acc.accountRegion,
      acc.notes,
    ]);

    for (const site of acc.registeredSites || []) {
      rows.push([
        'موقع منشأ بالحساب',
        site.name,
        acc.title,
        acc.emailAddress,
        site.username,
        site.displayName,
        site.registeredBirthdate,
        site.createdAtDate,
        site.phoneNumber,
        site.twoFactorEnabled ? 'مفعل' : 'غير محدد',
        '',
        site.notes,
      ]);
    }
  }

  return '\uFEFF' + rows.map((r) => r.map(escape).join(',')).join('\r\n');
}

// AES-GCM Encrypted Backup Helpers
export async function encryptVaultBackup(
  payloadObj: unknown,
  passphrase: string
): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  const aesKey = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 120_000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    encoder.encode(JSON.stringify(payloadObj))
  );

  const toBase64 = (bytes: Uint8Array) => {
    let bin = '';
    bytes.forEach((b) => {
      bin += String.fromCharCode(b);
    });
    return btoa(bin);
  };

  return JSON.stringify(
    {
      format: 'khaznati-encrypted-backup-v1',
      salt: toBase64(salt),
      iv: toBase64(iv),
      ciphertext: toBase64(new Uint8Array(cipherBuffer)),
      exportedAt: new Date().toISOString(),
    },
    null,
    2
  );
}

export async function decryptVaultBackup(
  rawText: string,
  passphrase: string
): Promise<Record<string, unknown>> {
  const envelope = JSON.parse(rawText) as {
    format?: string;
    salt?: string;
    iv?: string;
    ciphertext?: string;
  };
  if (
    envelope?.format !== 'khaznati-encrypted-backup-v1' ||
    !envelope.salt ||
    !envelope.iv ||
    !envelope.ciphertext
  ) {
    throw new Error('صيغة الملف المشفر غير صالحة.');
  }

  const fromBase64 = (b64: string) => {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  };

  const salt = fromBase64(envelope.salt);
  const iv = fromBase64(envelope.iv);
  const cipher = fromBase64(envelope.ciphertext);
  const encoder = new TextEncoder();

  const baseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  const aesKey = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 120_000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  const plainBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, aesKey, cipher);
  const decoded = new TextDecoder().decode(plainBuffer);
  return JSON.parse(decoded) as Record<string, unknown>;
}

export function createSampleAccountsForUser(): {
  emails: { tempId: string; draft: VaultAccountDraft }[];
  apps: { parentTempId: string; draft: VaultAccountDraft }[];
} {
  const email1Temp = 'sample_email_1';
  const email2Temp = 'sample_email_2';

  return {
    emails: [
      {
        tempId: email1Temp,
        draft: createEmptyAccountDraft({
          recordType: 'email',
          title: 'البريد الشخصي الأساسي',
          platformKey: 'gmail',
          category: 'email',
          emailAddress: 'salem.personal@gmail.com',
          username: 'salem.personal',
          displayName: 'سالم العتيبي',
          registeredFullName: 'سالم عبدالله محمد العتيبي',
          registeredGender: 'male',
          accountRegion: 'السعودية (SA)',
          billingAddressHint: 'الرياض - حي الملقا 13524',
          billingEmail: 'salem.personal@gmail.com',
          accountExternalId: 'GA-9940281',
          linkedPaymentHint: 'مدى الراجحي *4821',
          password: 'K9#mP2$vL8xQ!nR4',
          loginMethod: 'email_password',
          websiteUrl: 'https://mail.google.com',
          phoneNumber: '+966 55 123 4567',
          recoveryEmail: 'salem.backup@outlook.com',
          recoveryPhone: '+966 50 987 6543',
          recoveryContactPerson: 'أخوي فيصل (+966 50 111 2233)',
          registeredBirthdate: '1997-04-12',
          accountCreatedAt: '2017-09-03',
          createdDateApproximate: false,
          creationContext: 'أنشأته من جهاز آيفون 7 في الرياض عند فتح الهاتف أول مرة',
          lastAccessedAt: '2026-11-20',
          lastPasswordChangedAt: '2026-06-15',
          twoFactorEnabled: true,
          twoFactorMethod: 'authenticator',
          totpSecret: 'JBSWY3DPEHPK3PXP',
          passkeyEnabled: true,
          biometricDevice: 'iPhone 15 Pro (Face ID)',
          backupCodes: '8492-1049\n3391-7842\n5120-9941\n6701-2248',
          securityQuestions: [
            { question: 'اسم أول مدرسة التحقت بها؟', answer: 'مدرسة الفيصلية' },
            { question: 'المدينة التي ولدت فيها؟', answer: 'الرياض' },
          ],
          subscriptionStatus: 'monthly',
          subscriptionCost: '9.99 ر.س / شهر',
          subscriptionAmount: 9.99,
          subscriptionCurrency: 'SAR',
          autoRenew: true,
          renewalDate: '2026-12-03',
          primaryDevice: 'iPhone 15 Pro',
          trustedDevices: ['iPhone 15 Pro', 'MacBook Air M3', 'iPad Air'],
          registeredSites: [
            {
              id: generateSafeId('site'),
              name: 'ChatGPT / OpenAI',
              platformKey: 'chatgpt',
              url: 'https://chatgpt.com',
              signupMethod: 'oauth_button',
              username: 'salem.personal@gmail.com',
              displayName: 'Salem A.',
              password: '',
              phoneNumber: '+966 55 123 4567',
              pinCode: '',
              registeredBirthdate: '1997-04-12',
              createdAtDate: '2023-03-14',
              isApproximateDate: false,
              twoFactorEnabled: true,
              twoFactorNote: 'Authenticator',
              linkedCardHint: 'فيزا *4821',
              subscriptionCost: '20 USD / شهر',
              renewalDate: '2026-12-14',
              deviceUsed: 'MacBook Air / iPhone',
              status: 'active',
              notes: 'دخول مباشر بزر Continue with Google — خطة Plus.',
            },
            {
              id: generateSafeId('site'),
              name: 'Canva',
              platformKey: 'canva',
              url: 'https://canva.com',
              signupMethod: 'oauth_button',
              username: '@salem_design',
              displayName: 'تصاميم سالم',
              password: '',
              phoneNumber: '',
              pinCode: '',
              registeredBirthdate: '1997-04-12',
              createdAtDate: '2022-09-01',
              isApproximateDate: true,
              twoFactorEnabled: false,
              twoFactorNote: '',
              linkedCardHint: '',
              subscriptionCost: '',
              renewalDate: '',
              deviceUsed: 'MacBook Air M3',
              status: 'active',
              notes: 'تصاميم المتجر والشعارات.',
            },
            {
              id: generateSafeId('site'),
              name: 'نون (Noon)',
              platformKey: 'noon',
              url: 'https://noon.com',
              signupMethod: 'email_custom_pwd',
              username: 'salem.noon',
              displayName: 'سالم العتيبي',
              password: 'Noon!882#SaleM',
              phoneNumber: '+966 55 123 4567',
              pinCode: '',
              registeredBirthdate: '1997-04-12',
              createdAtDate: '2021-05-19',
              isApproximateDate: false,
              twoFactorEnabled: true,
              twoFactorNote: 'SMS OTP',
              linkedCardHint: 'مدى الراجحي *4821',
              subscriptionCost: '',
              renewalDate: '',
              deviceUsed: 'iPhone 15 Pro',
              status: 'active',
              notes: 'العنوان الافتراضي: الرياض - حي الملقا.',
            },
            {
              id: generateSafeId('site'),
              name: 'هنقرستيشن',
              platformKey: 'hungerstation',
              url: 'https://hungerstation.com',
              signupMethod: 'phone_otp',
              username: '+966 55 123 4567',
              displayName: 'سالم',
              password: '',
              phoneNumber: '+966 55 123 4567',
              pinCode: '',
              registeredBirthdate: '1997-04-12',
              createdAtDate: '2020-10-08',
              isApproximateDate: true,
              twoFactorEnabled: false,
              twoFactorNote: '',
              linkedCardHint: 'Apple Pay',
              subscriptionCost: '',
              renewalDate: '',
              deviceUsed: 'iPhone 15 Pro',
              status: 'active',
              notes: 'مرتبط بالفواتير على هذا الإيميل.',
            },
          ],
          passwordHistory: [
            { password: 'SalemOld@2022#11', changedAt: '2024-05-01', note: 'تحديث دوري' },
            { password: 'S!l9m_2017_Init', changedAt: '2021-11-12', note: 'كلمة المرور القديمة عند الإنشاء' },
          ],
          timelineEvents: [
            { id: generateSafeId('evt'), date: '2017-09-03', title: 'إنشاء البريد الشخصي لأول مرة' },
            { id: generateSafeId('evt'), date: '2023-02-18', title: 'تفعيل التحقق بخطوتين عبر Authenticator' },
            { id: generateSafeId('evt'), date: '2026-06-15', title: 'تحديث كلمة المرور وإضافة رقم استرداد جديد' },
          ],
          customFields: [
            { id: generateSafeId('cf'), label: 'مساحة التخزين', value: 'Google One 200 GB', isSecret: false },
            { id: generateSafeId('cf'), label: 'رمز الدعم الخاص', value: 'SUP-94820', isSecret: true },
          ],
          emergencyInstructions: 'في حال فقدان الجوال، استخدم رقم الاسترداد 6543 أو البريد الاحتياطي Outlook.',
          status: 'active',
          isFavorite: true,
          notes: 'الإيميل الرسمي الرئيسي المرتبط بحسابات التواصل والبنوك والمواقع اليومية.',
        }),
      },
      {
        tempId: email2Temp,
        draft: createEmptyAccountDraft({
          recordType: 'email',
          title: 'بريد الألعاب والاشتراكات',
          platformKey: 'outlook',
          category: 'email',
          emailAddress: 'salem.play@outlook.com',
          username: 'salem.play',
          displayName: 'Salem Gaming',
          registeredFullName: 'Salem Alotaibi',
          accountRegion: 'الولايات المتحدة (US)',
          billingAddressHint: 'Oregon Tax-Free ZIP: 97201',
          password: 'G7@tZ5!wN3qB9*mK',
          loginMethod: 'email_password',
          websiteUrl: 'https://outlook.live.com',
          phoneNumber: '+966 55 123 4567',
          recoveryEmail: 'salem.personal@gmail.com',
          registeredBirthdate: '1995-01-01',
          accountCreatedAt: '2020-02-18',
          creationContext: 'تم إنشاؤه من الكمبيوتر الشخصي لحسابات الستور الأمريكي',
          lastPasswordChangedAt: '2025-11-10',
          twoFactorEnabled: true,
          twoFactorMethod: 'sms',
          securityQuestions: [{ question: 'أفضل لعبة مفضلة؟', answer: 'Bloodborne' }],
          primaryDevice: 'PlayStation 5',
          trustedDevices: ['PlayStation 5', 'Gaming PC Windows 11'],
          registeredSites: [
            {
              id: generateSafeId('site'),
              name: 'Steam',
              platformKey: 'steam',
              url: 'https://store.steampowered.com',
              signupMethod: 'email_custom_pwd',
              username: 'salem_ksa95',
              displayName: 'SalemKSA',
              password: 'Stm#992!PlayKsa',
              phoneNumber: '',
              pinCode: '',
              registeredBirthdate: '1995-01-01',
              createdAtDate: '2020-04-02',
              isApproximateDate: false,
              twoFactorEnabled: true,
              twoFactorNote: 'Steam Guard App',
              linkedCardHint: 'PayPal',
              subscriptionCost: '',
              renewalDate: '',
              deviceUsed: 'Gaming PC',
              status: 'active',
              notes: 'المتجر الأمريكي — مفعّل Steam Guard.',
            },
            {
              id: generateSafeId('site'),
              name: 'Discord',
              platformKey: 'discord',
              url: 'https://discord.com',
              signupMethod: 'email_custom_pwd',
              username: 'salem.gg',
              displayName: 'SalemGG',
              password: 'Dc$441!VoiceChat',
              phoneNumber: '+966 55 123 4567',
              pinCode: '',
              registeredBirthdate: '1995-01-01',
              createdAtDate: '2020-06-11',
              isApproximateDate: false,
              twoFactorEnabled: true,
              twoFactorNote: 'Authenticator',
              linkedCardHint: '',
              subscriptionCost: '',
              renewalDate: '',
              deviceUsed: 'Gaming PC / iPhone',
              status: 'active',
              notes: 'سيرفر الأصدقاء.',
            },
          ],
          status: 'active',
          isFavorite: false,
          notes: 'مخصص للمنصات الترفيهية والألعاب — انتبه أن تاريخ الميلاد المسجل به 1995/01/01.',
        }),
      },
    ],
    apps: [
      {
        parentTempId: email1Temp,
        draft: createEmptyAccountDraft({
          recordType: 'app',
          title: 'Instagram',
          platformKey: 'instagram',
          category: 'social',
          emailAddress: 'salem.personal@gmail.com',
          username: '@salem_lens',
          displayName: 'سالم | تصوير',
          registeredFullName: 'سالم العتيبي',
          accountRegion: 'السعودية (SA)',
          password: 'Ig$84mN2#pQ7vX!w',
          loginMethod: 'email_password',
          websiteUrl: 'https://instagram.com',
          phoneNumber: '+966 55 123 4567',
          registeredBirthdate: '1997-04-12',
          accountCreatedAt: '2018-05-20',
          creationContext: 'أنشئ من تطبيق الآيفون بنفس رقم الجوال',
          lastPasswordChangedAt: '2026-08-01',
          twoFactorEnabled: true,
          twoFactorMethod: 'authenticator',
          backupCodes: '1920-4810\n5519-0023',
          primaryDevice: 'iPhone 15 Pro',
          trustedDevices: ['iPhone 15 Pro'],
          registeredSites: [
            {
              id: generateSafeId('site'),
              name: 'Threads',
              platformKey: 'threads',
              url: 'https://threads.net',
              signupMethod: 'oauth_button',
              username: '@salem_lens',
              displayName: 'سالم | تصوير',
              password: '',
              phoneNumber: '',
              pinCode: '',
              registeredBirthdate: '1997-04-12',
              createdAtDate: '2023-07-06',
              isApproximateDate: false,
              twoFactorEnabled: true,
              twoFactorNote: 'موروث من Instagram',
              linkedCardHint: '',
              subscriptionCost: '',
              renewalDate: '',
              deviceUsed: 'iPhone 15 Pro',
              status: 'active',
              notes: 'تم التسجيل تلقائياً بحساب إنستقرام.',
            },
          ],
          status: 'active',
          isFavorite: true,
          notes: 'حساب التصوير الشخصي.',
        }),
      },
      {
        parentTempId: email1Temp,
        draft: createEmptyAccountDraft({
          recordType: 'app',
          title: 'Facebook',
          platformKey: 'facebook',
          category: 'social',
          emailAddress: 'salem.personal@gmail.com',
          username: 'salem.alotaibi.97',
          displayName: 'Salem Alotaibi',
          password: 'Fb#31kL9@zR6mP!v',
          loginMethod: 'email_password',
          websiteUrl: 'https://facebook.com',
          phoneNumber: '+966 55 123 4567',
          registeredBirthdate: '1996-08-15',
          accountCreatedAt: '2016-03-11',
          lastPasswordChangedAt: '2024-09-12',
          twoFactorEnabled: false,
          twoFactorMethod: 'none',
          primaryDevice: 'iPhone 15 Pro',
          status: 'needs_update',
          isFavorite: false,
          notes: 'مربوط بصفحة المتجر القديمة — تم تسجيل تاريخ ميلاد قديم 1996 عند الإنشاء.',
        }),
      },
      {
        parentTempId: email1Temp,
        draft: createEmptyAccountDraft({
          recordType: 'app',
          title: 'Amazon',
          platformKey: 'amazon',
          category: 'shopping',
          emailAddress: 'salem.personal@gmail.com',
          username: 'salem.personal@gmail.com',
          displayName: 'سالم العتيبي',
          accountRegion: 'Amazon.sa (السعودية)',
          linkedPaymentHint: 'فيزا *4821',
          password: 'Amz!92pK4#vL8xQ$',
          loginMethod: 'email_password',
          websiteUrl: 'https://amazon.sa',
          phoneNumber: '+966 55 123 4567',
          registeredBirthdate: '1997-04-12',
          accountCreatedAt: '2021-11-25',
          lastPasswordChangedAt: '2026-01-14',
          twoFactorEnabled: true,
          twoFactorMethod: 'sms',
          subscriptionStatus: 'yearly',
          subscriptionCost: '140 ر.س / سنة',
          subscriptionAmount: 140,
          subscriptionCurrency: 'SAR',
          autoRenew: true,
          renewalDate: '2026-11-25',
          primaryDevice: 'iPhone 15 Pro',
          status: 'active',
          notes: 'اشتراك أمازون برايم السنوي.',
        }),
      },
      {
        parentTempId: email2Temp,
        draft: createEmptyAccountDraft({
          recordType: 'app',
          title: 'PlayStation Network',
          platformKey: 'playstation',
          category: 'gaming',
          emailAddress: 'salem.play@outlook.com',
          username: 'Salem_KSA95',
          displayName: 'Salem_KSA95',
          accountRegion: 'الستور السعودي (KSA)',
          accountExternalId: 'PSN-ID: Salem_KSA95',
          linkedPaymentHint: 'بطاقة أبل باي / ستور',
          password: 'Psn@74wQ2#mZ8xL!',
          loginMethod: 'email_password',
          websiteUrl: 'https://playstation.com',
          registeredBirthdate: '1995-01-01',
          accountCreatedAt: '2020-12-01',
          lastPasswordChangedAt: '2026-04-20',
          twoFactorEnabled: true,
          twoFactorMethod: 'authenticator',
          pinCode: '4829',
          securityQuestions: [{ question: 'مكان ميلاد الوالد؟', answer: 'الدرعية' }],
          subscriptionStatus: 'yearly',
          subscriptionCost: '320 ر.س / سنة',
          subscriptionAmount: 320,
          subscriptionCurrency: 'SAR',
          autoRenew: false,
          renewalDate: '2026-12-01',
          primaryDevice: 'PlayStation 5',
          status: 'active',
          isFavorite: true,
          notes: 'الرمز السري للدخول السريع 4829 — تاريخ الميلاد مطابق لبريد الألعاب 1995.',
        }),
      },
      {
        parentTempId: email2Temp,
        draft: createEmptyAccountDraft({
          recordType: 'app',
          title: 'Netflix',
          platformKey: 'netflix',
          category: 'entertainment',
          emailAddress: 'salem.play@outlook.com',
          username: 'salem.play@outlook.com',
          displayName: 'ملف سالم',
          password: 'Nf!66tY3@pM9xR$w',
          loginMethod: 'email_password',
          websiteUrl: 'https://netflix.com',
          registeredBirthdate: '1995-01-01',
          accountCreatedAt: '2022-07-09',
          lastPasswordChangedAt: '2026-03-01',
          twoFactorEnabled: false,
          twoFactorMethod: 'none',
          pinCode: '1190',
          subscriptionStatus: 'monthly',
          subscriptionCost: '63 ر.س / شهر',
          subscriptionAmount: 63,
          subscriptionCurrency: 'SAR',
          autoRenew: true,
          renewalDate: '2026-12-09',
          primaryDevice: 'Smart TV / iPhone',
          status: 'active',
          notes: 'رمز قفل الملف الشخصي: 1190.',
        }),
      },
    ],
  };
}

export function analyzePasswordRisks(acc: VaultAccount, realBirthdate: string): string[] {
  const pwd = acc.password || '';
  if (!pwd) return [];
  const lower = pwd.toLowerCase();
  const risks: string[] = [];

  // Check birth year / date fragments
  const birthSources = [acc.registeredBirthdate, realBirthdate].filter(Boolean);
  for (const b of birthSources) {
    const year = b.slice(0, 4);
    if (year.length === 4 && lower.includes(year)) {
      risks.push(`تحتوي على سنة الميلاد (${year})`);
      break;
    }
  }

  // Check email local-part or username
  const emailLocal = (acc.emailAddress || '').split('@')[0]?.toLowerCase() || '';
  if (emailLocal.length >= 4 && lower.includes(emailLocal)) {
    risks.push('تتضمن جزءاً من البريد الإلكتروني');
  }
  const uname = (acc.username || '').toLowerCase();
  if (uname.length >= 4 && uname !== emailLocal && lower.includes(uname)) {
    risks.push('تتضمن اسم المستخدم الخاص بالحساب');
  }

  // Check phone last 4 digits
  const phoneDigits = (acc.phoneNumber || '').replace(/\D/g, '');
  if (phoneDigits.length >= 4 && lower.includes(phoneDigits.slice(-4))) {
    risks.push('تحتوي على آخر 4 أرقام من جوالك');
  }

  // Common weak sequences
  const weakPatterns = ['1234', '4321', '0000', '1111', 'qwerty', 'asdf', 'password', 'admin', 'pass123'];
  if (weakPatterns.some((pat) => lower.includes(pat))) {
    risks.push('تحتوي على تسلسل شائع سهل التخمين');
  }

  return risks;
}

export function getAccountNeedsAttention(
  acc: VaultAccount,
  auditReport: ReturnType<typeof buildVaultAuditReport>
): boolean {
  const inWeak = auditReport.weakPasswordAccounts.some((a) => a.id === acc.id);
  const inOld = auditReport.oldPasswordAccounts.some((item) => item.account.id === acc.id);
  const inNo2FA = auditReport.noTwoFactorAccounts.some((a) => a.id === acc.id);
  const inReused = auditReport.reusedPasswordGroups.some((g) =>
    g.accounts.some((a) => a.id === acc.id)
  );
  return inWeak || inOld || inNo2FA || inReused || acc.status === 'needs_update';
}

function parseCsvMatrix(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\r' && next === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      i++;
    } else if (ch === '\n' || ch === '\r') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

export function parseBrowserPasswordsCsv(csvText: string): Partial<VaultAccountDraft>[] {
  const cleaned = csvText.replace(/^\uFEFF/, '').trim();
  if (!cleaned) return [];
  const matrix = parseCsvMatrix(cleaned);
  if (matrix.length < 2) return [];

  const headers = matrix[0].map((h) => h.trim().toLowerCase());
  const idxOf = (candidates: string[]) =>
    headers.findIndex((h) => candidates.some((c) => h === c || h.includes(c)));

  const nameIdx = idxOf(['name', 'title', 'website', 'الاسم', 'الحساب']);
  const urlIdx = idxOf(['url', 'login_uri', 'origin', 'الرابط']);
  const userIdx = idxOf(['username', 'login_username', 'user', 'اسم المستخدم']);
  const emailIdx = idxOf(['email', 'البريد']);
  const passIdx = idxOf(['password', 'login_password', 'كلمة المرور']);
  const noteIdx = idxOf(['note', 'notes', 'ملاحظات']);
  const totpIdx = idxOf(['totp', 'login_totp']);

  if (passIdx === -1 && userIdx === -1 && nameIdx === -1) return [];

  const drafts: Partial<VaultAccountDraft>[] = [];
  for (let i = 1; i < matrix.length; i++) {
    const row = matrix[i];
    if (!row || row.every((c) => !c.trim())) continue;

    const rawUrl = urlIdx >= 0 ? row[urlIdx]?.trim() || '' : '';
    const rawName = nameIdx >= 0 ? row[nameIdx]?.trim() || '' : '';
    const rawUser = userIdx >= 0 ? row[userIdx]?.trim() || '' : '';
    const rawEmail = emailIdx >= 0 ? row[emailIdx]?.trim() || '' : '';
    const rawPass = passIdx >= 0 ? row[passIdx]?.trim() || '' : '';
    const rawNote = noteIdx >= 0 ? row[noteIdx]?.trim() || '' : '';
    const rawTotp = totpIdx >= 0 ? row[totpIdx]?.trim() || '' : '';

    const inferredEmail = rawEmail || (rawUser.includes('@') ? rawUser : '');
    let title = rawName;
    if (!title && rawUrl) {
      try {
        title = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`).hostname.replace(/^www\./, '');
      } catch {
        title = rawUrl;
      }
    }
    if (!title) title = inferredEmail || rawUser || `حساب مستورد ${i}`;

    const matchedPreset = PLATFORM_PRESETS.find((p) => {
      const lowTitle = title.toLowerCase();
      const lowUrl = rawUrl.toLowerCase();
      return lowTitle.includes(p.key) || lowUrl.includes(p.key);
    });

    const isEmailAccount = matchedPreset?.recordType === 'email';

    drafts.push(
      createEmptyAccountDraft({
        recordType: isEmailAccount ? 'email' : 'app',
        title,
        platformKey: matchedPreset?.key || 'custom',
        category: matchedPreset?.category || 'other',
        emailAddress: inferredEmail,
        username: rawUser,
        password: rawPass,
        websiteUrl: rawUrl,
        totpSecret: rawTotp,
        twoFactorEnabled: Boolean(rawTotp),
        twoFactorMethod: rawTotp ? 'authenticator' : 'none',
        notes: rawNote,
      })
    );
  }

  return drafts;
}

