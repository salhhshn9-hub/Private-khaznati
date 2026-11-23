import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  Eye,
  EyeOff,
  Fingerprint,
  Globe,
  History,
  KeyRound,
  Link2,
  Plus,
  RefreshCw,
  Shield,
  Smartphone,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
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
} from '../types/vault';
import {
  CATEGORY_LABELS,
  CURRENCY_LABELS,
  GENDER_LABELS,
  LOGIN_METHOD_LABELS,
  PLATFORM_PRESETS,
  SITE_SIGNUP_METHOD_LABELS,
  SITE_STATUS_LABELS,
  STATUS_LABELS,
  SUBSCRIPTION_LABELS,
  TWO_FACTOR_LABELS,
  calculateAccountDuration,
  calculateAgeFromBirthdate,
  createEmptyAccountDraft,
  createEmptySiteItem,
  evaluatePasswordStrength,
  formatReadableDate,
  generateSafeId,
  generateSecurePassword,
  getPresetByKey,
} from '../utils/vaultHelpers';
import { generateTotpCode } from '../utils/totp';
import { PlatformIcon } from './PlatformIcon';

interface AccountModalProps {
  isOpen: boolean;
  editingAccount: VaultAccount | null;
  initialDraftOverrides?: Partial<VaultAccountDraft>;
  initialTab?: ModalTab;
  allAccounts: VaultAccount[];
  realBirthdate: string;
  onClose: () => void;
  onSave: (draft: VaultAccountDraft, existingId?: string) => Promise<void>;
}

export type ModalTab = 'identity' | 'sites' | 'dates' | 'security' | 'extra';

const QUICK_SITE_KEYS = [
  'instagram',
  'tiktok',
  'x',
  'snapchat',
  'facebook',
  'youtube',
  'netflix',
  'shahid',
  'chatgpt',
  'canva',
  'amazon',
  'noon',
  'hungerstation',
  'discord',
  'steam',
  'playstation',
  'github',
  'paypal',
];

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  editingAccount,
  initialDraftOverrides,
  initialTab,
  allAccounts,
  realBirthdate,
  onClose,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<ModalTab>('identity');
  const [draft, setDraft] = useState<VaultAccountDraft>(() => createEmptyAccountDraft());
  const [showPassword, setShowPassword] = useState(false);
  const [archiveOldPassword, setArchiveOldPassword] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Quick add site state
  const [quickSiteName, setQuickSiteName] = useState('');
  const [quickSiteUrl, setQuickSiteUrl] = useState('');
  const [quickSiteMethod, setQuickSiteMethod] = useState<SiteSignupMethod>('oauth_button');
  const [quickSiteUsername, setQuickSiteUsername] = useState('');
  const [quickSiteCreatedDate, setQuickSiteCreatedDate] = useState('');
  const [quickSiteBirthdate, setQuickSiteBirthdate] = useState('');
  const [expandedSiteId, setExpandedSiteId] = useState<string | null>(null);

  // Trusted devices / timeline / password history helpers
  const [newDeviceText, setNewDeviceText] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventTitle, setNewEventTitle] = useState('');
  const [manualOldPwd, setManualOldPwd] = useState('');
  const [manualOldPwdDate, setManualOldPwdDate] = useState('');
  const [manualOldPwdNote, setManualOldPwdNote] = useState('');
  const [revealedHistoryIdx, setRevealedHistoryIdx] = useState<Record<number, boolean>>({});
  const [totpPreview, setTotpPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab(initialTab || 'identity');
    setErrorMsg('');
    setShowPassword(false);
    setArchiveOldPassword(true);
    setQuickSiteName('');
    setQuickSiteUrl('');
    setQuickSiteMethod('oauth_button');
    setQuickSiteUsername('');
    setQuickSiteCreatedDate('');
    setQuickSiteBirthdate('');
    setExpandedSiteId(null);
    setNewDeviceText('');
    setNewEventDate('');
    setNewEventTitle('');
    setManualOldPwd('');
    setManualOldPwdDate('');
    setManualOldPwdNote('');
    setRevealedHistoryIdx({});

    if (editingAccount) {
      setDraft({
        recordType: editingAccount.recordType,
        title: editingAccount.title,
        platformKey: editingAccount.platformKey,
        category: editingAccount.category,
        emailAddress: editingAccount.emailAddress,
        parentEmailId: editingAccount.parentEmailId,
        username: editingAccount.username,
        displayName: editingAccount.displayName,
        registeredFullName: editingAccount.registeredFullName || '',
        registeredGender: editingAccount.registeredGender || 'unspecified',
        accountRegion: editingAccount.accountRegion || '',
        billingAddressHint: editingAccount.billingAddressHint || '',
        billingEmail: editingAccount.billingEmail || '',
        accountExternalId: editingAccount.accountExternalId || '',
        linkedPaymentHint: editingAccount.linkedPaymentHint || '',
        password: editingAccount.password,
        loginMethod: editingAccount.loginMethod,
        websiteUrl: editingAccount.websiteUrl,
        phoneNumber: editingAccount.phoneNumber,
        recoveryEmail: editingAccount.recoveryEmail,
        recoveryPhone: editingAccount.recoveryPhone,
        recoveryContactPerson: editingAccount.recoveryContactPerson || '',
        registeredBirthdate: editingAccount.registeredBirthdate,
        accountCreatedAt: editingAccount.accountCreatedAt,
        createdDateApproximate: Boolean(editingAccount.createdDateApproximate),
        creationContext: editingAccount.creationContext || '',
        lastAccessedAt: editingAccount.lastAccessedAt || '',
        lastPasswordChangedAt: editingAccount.lastPasswordChangedAt,
        twoFactorEnabled: editingAccount.twoFactorEnabled,
        twoFactorMethod: editingAccount.twoFactorMethod,
        totpSecret: editingAccount.totpSecret || '',
        passkeyEnabled: Boolean(editingAccount.passkeyEnabled),
        biometricDevice: editingAccount.biometricDevice || '',
        backupCodes: editingAccount.backupCodes,
        securityQuestions: editingAccount.securityQuestions || [],
        pinCode: editingAccount.pinCode,
        subscriptionStatus: editingAccount.subscriptionStatus,
        subscriptionCost: editingAccount.subscriptionCost,
        subscriptionAmount: editingAccount.subscriptionAmount ?? 0,
        subscriptionCurrency: editingAccount.subscriptionCurrency || 'SAR',
        autoRenew: Boolean(editingAccount.autoRenew),
        renewalDate: editingAccount.renewalDate,
        primaryDevice: editingAccount.primaryDevice,
        trustedDevices: editingAccount.trustedDevices || [],
        registeredSites: editingAccount.registeredSites || [],
        passwordHistory: editingAccount.passwordHistory || [],
        timelineEvents: editingAccount.timelineEvents || [],
        customFields: editingAccount.customFields || [],
        emergencyInstructions: editingAccount.emergencyInstructions || '',
        status: editingAccount.status,
        isFavorite: editingAccount.isFavorite,
        notes: editingAccount.notes,
      });
    } else {
      const base = createEmptyAccountDraft(initialDraftOverrides);
      if (base.parentEmailId && !base.emailAddress) {
        const parent = allAccounts.find((e) => e.id === base.parentEmailId);
        if (parent) {
          base.emailAddress = parent.emailAddress;
        }
      }
      setDraft(base);
    }
  }, [isOpen, editingAccount, initialDraftOverrides, initialTab, allAccounts]);

  useEffect(() => {
    if (!isOpen || !draft.totpSecret.trim()) {
      setTotpPreview(null);
      return;
    }
    let active = true;
    const refresh = () => {
      void generateTotpCode(draft.totpSecret).then((res) => {
        if (active) setTotpPreview(res ? res.code : null);
      });
    };
    refresh();
    const timer = window.setInterval(refresh, 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [isOpen, draft.totpSecret]);

  const parentAccountOptions = useMemo(() => {
    const candidates = allAccounts.filter((a) => a.id !== editingAccount?.id);
    const emails = candidates.filter((a) => a.recordType === 'email');
    const others = candidates.filter((a) => a.recordType !== 'email');
    return [...emails, ...others];
  }, [allAccounts, editingAccount]);

  const parentRecord = useMemo(
    () => allAccounts.find((e) => e.id === draft.parentEmailId),
    [allAccounts, draft.parentEmailId]
  );

  const linkedChildAccounts = useMemo(() => {
    if (!editingAccount) return [];
    const normalizedEmail = editingAccount.emailAddress.trim().toLowerCase();
    return allAccounts.filter(
      (a) =>
        a.id !== editingAccount.id &&
        (a.parentEmailId === editingAccount.id ||
          (editingAccount.recordType === 'email' &&
            normalizedEmail &&
            a.recordType === 'app' &&
            a.emailAddress.trim().toLowerCase() === normalizedEmail))
    );
  }, [allAccounts, editingAccount]);

  const pwdEval = useMemo(() => evaluatePasswordStrength(draft.password), [draft.password]);
  const registeredAge = useMemo(
    () => calculateAgeFromBirthdate(draft.registeredBirthdate),
    [draft.registeredBirthdate]
  );
  const createdDuration = useMemo(
    () => calculateAccountDuration(draft.accountCreatedAt),
    [draft.accountCreatedAt]
  );

  if (!isOpen) return null;

  const passwordWasChanged =
    Boolean(editingAccount?.password) &&
    editingAccount?.password !== draft.password &&
    draft.password.trim().length > 0;

  const handleSelectPreset = (key: string) => {
    const preset = getPresetByKey(key);
    setDraft((prev) => ({
      ...prev,
      platformKey: preset.key,
      recordType: editingAccount ? prev.recordType : preset.recordType,
      category: preset.category,
      title: prev.title || (preset.key === 'custom' ? '' : preset.label),
      websiteUrl: prev.websiteUrl || preset.defaultUrl,
      parentEmailId: preset.recordType === 'email' && !editingAccount ? '' : prev.parentEmailId,
    }));
  };

  const handleSelectParentAccount = (parentId: string) => {
    const parent = allAccounts.find((e) => e.id === parentId);
    setDraft((prev) => ({
      ...prev,
      parentEmailId: parentId,
      emailAddress: parent && parent.emailAddress ? parent.emailAddress : prev.emailAddress,
    }));
  };

  const handleGeneratePassword = () => {
    const generated = generateSecurePassword({
      length: 16,
      uppercase: true,
      lowercase: true,
      numbers: true,
      symbols: true,
    });
    setDraft((prev) => ({
      ...prev,
      password: generated,
      lastPasswordChangedAt: new Date().toISOString().slice(0, 10),
    }));
    setShowPassword(true);
  };

  const handleQuickAddPresetSite = (presetKey: string) => {
    const preset = getPresetByKey(presetKey);
    const newItem = createEmptySiteItem({
      name: preset.key === 'custom' ? 'موقع جديد' : preset.label,
      platformKey: preset.key,
      url: preset.defaultUrl,
      signupMethod: draft.recordType === 'email' ? 'email_same_pwd' : 'oauth_button',
      username: draft.emailAddress || draft.username || '',
      phoneNumber: draft.phoneNumber || '',
      registeredBirthdate: draft.registeredBirthdate || realBirthdate || '',
      createdAtDate: new Date().toISOString().slice(0, 10),
    });
    setDraft((prev) => ({
      ...prev,
      registeredSites: [newItem, ...prev.registeredSites],
    }));
    setExpandedSiteId(newItem.id);
  };

  const handleQuickAddCustomSite = () => {
    const name = quickSiteName.trim();
    if (!name) return;
    const newItem = createEmptySiteItem({
      name,
      platformKey: 'custom',
      url: quickSiteUrl.trim(),
      signupMethod: quickSiteMethod,
      username: quickSiteUsername.trim() || draft.emailAddress || draft.username || '',
      phoneNumber: draft.phoneNumber || '',
      registeredBirthdate: quickSiteBirthdate || draft.registeredBirthdate || realBirthdate || '',
      createdAtDate: quickSiteCreatedDate || new Date().toISOString().slice(0, 10),
    });
    setDraft((prev) => ({
      ...prev,
      registeredSites: [newItem, ...prev.registeredSites],
    }));
    setQuickSiteName('');
    setQuickSiteUrl('');
    setQuickSiteUsername('');
    setQuickSiteCreatedDate('');
    setQuickSiteBirthdate('');
    setExpandedSiteId(newItem.id);
  };

  const updateSiteItem = (siteId: string, updates: Partial<RegisteredSiteItem>) => {
    setDraft((prev) => ({
      ...prev,
      registeredSites: prev.registeredSites.map((s) =>
        s.id === siteId ? { ...s, ...updates } : s
      ),
    }));
  };

  const removeSiteItem = (siteId: string) => {
    setDraft((prev) => ({
      ...prev,
      registeredSites: prev.registeredSites.filter((s) => s.id !== siteId),
    }));
  };

  const handleAddSecurityQuestion = () => {
    if (draft.securityQuestions.length >= VAULT_LIMITS.securityQuestionsMax) return;
    setDraft((prev) => ({
      ...prev,
      securityQuestions: [...prev.securityQuestions, { question: '', answer: '' }],
    }));
  };

  const handleRemoveSecurityQuestion = (index: number) => {
    setDraft((prev) => ({
      ...prev,
      securityQuestions: prev.securityQuestions.filter((_, i) => i !== index),
    }));
  };

  const handleAddDevice = () => {
    const val = newDeviceText.trim();
    if (!val) return;
    if (draft.trustedDevices.includes(val)) {
      setNewDeviceText('');
      return;
    }
    setDraft((prev) => ({
      ...prev,
      trustedDevices: [...prev.trustedDevices, val].slice(0, VAULT_LIMITS.trustedDevicesMax),
    }));
    setNewDeviceText('');
  };

  const handleAddTimelineEvent = () => {
    if (!newEventTitle.trim() && !newEventDate) return;
    setDraft((prev) => ({
      ...prev,
      timelineEvents: [
        {
          id: generateSafeId('evt'),
          date: newEventDate || new Date().toISOString().slice(0, 10),
          title: newEventTitle.trim() || 'تحديث على الحساب',
        },
        ...prev.timelineEvents,
      ].slice(0, VAULT_LIMITS.timelineEventsMax),
    }));
    setNewEventDate('');
    setNewEventTitle('');
  };

  const handleAddManualOldPassword = () => {
    if (!manualOldPwd.trim()) return;
    setDraft((prev) => ({
      ...prev,
      passwordHistory: [
        {
          password: manualOldPwd,
          changedAt: manualOldPwdDate || new Date().toISOString().slice(0, 10),
          note: manualOldPwdNote.trim() || 'كلمة مرور سابقة',
        },
        ...prev.passwordHistory,
      ].slice(0, VAULT_LIMITS.passwordHistoryMax),
    }));
    setManualOldPwd('');
    setManualOldPwdDate('');
    setManualOldPwdNote('');
  };

  const handleAddCustomField = () => {
    if (draft.customFields.length >= VAULT_LIMITS.customFieldsMax) return;
    setDraft((prev) => ({
      ...prev,
      customFields: [
        ...prev.customFields,
        { id: generateSafeId('cf'), label: '', value: '', isSecret: false },
      ],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.title.trim()) {
      setErrorMsg('يرجى إدخال اسم الحساب أو المنصة.');
      setActiveTab('identity');
      return;
    }
    if (draft.recordType === 'email' && !draft.emailAddress.trim()) {
      setErrorMsg('يرجى إدخال عنوان البريد الإلكتروني.');
      setActiveTab('identity');
      return;
    }

    let finalDraft = draft;
    if (passwordWasChanged && archiveOldPassword && editingAccount?.password) {
      const alreadyArchived = draft.passwordHistory.some(
        (h) => h.password === editingAccount.password
      );
      if (!alreadyArchived) {
        finalDraft = {
          ...draft,
          lastPasswordChangedAt: new Date().toISOString().slice(0, 10),
          passwordHistory: [
            {
              password: editingAccount.password,
              changedAt: new Date().toISOString().slice(0, 10),
              note: 'تم الاستبدال تلقائياً',
            },
            ...draft.passwordHistory,
          ].slice(0, VAULT_LIMITS.passwordHistoryMax),
        };
      }
    }

    setSaving(true);
    setErrorMsg('');
    try {
      await onSave(finalDraft, editingAccount?.id);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'تعذر حفظ الحساب.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-modal-title"
    >
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <PlatformIcon platformKey={draft.platformKey} recordType={draft.recordType} size="sm" />
            <div className="min-w-0">
              <h2 id="account-modal-title" className="text-base font-bold truncate">
                {editingAccount ? `تعديل: ${editingAccount.title}` : 'إضافة سجل جديد للخزنة'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {draft.recordType === 'email'
                  ? 'هوية بريد إلكتروني رئيسية — يمكنك توثيق جميع المواقع والتطبيقات المنشأة بها'
                  : 'حساب تطبيق أو موقع مع كامل التفاصيل والتواريخ والمواقع الفرعية المرتبطة'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-1 overflow-x-auto">
          {(
            [
              { id: 'identity', label: 'الهوية والدخول' },
              {
                id: 'sites',
                label: `المواقع والتطبيقات المنشأة (${draft.registeredSites.length + linkedChildAccounts.length})`,
              },
              { id: 'dates', label: 'الميلاد والإنشاء والأحداث' },
              { id: 'security', label: 'الأمان وسجل الكلمات' },
              { id: 'extra', label: 'الاشتراك والأجهزة وحقول خاصة' },
            ] as { id: ModalTab; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Form Body */}
        <form onSubmit={(e) => void handleSubmit(e)}>
          <div className="p-6 space-y-5 max-h-[68vh] overflow-y-auto">
            {errorMsg && (
              <div className="p-3 rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/50 text-xs text-rose-700 dark:text-rose-300">
                {errorMsg}
              </div>
            )}

            {/* TAB 1: IDENTITY */}
            {activeTab === 'identity' && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <span className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      نوع السجل
                    </span>
                    <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                      {(
                        [
                          { value: 'email', label: 'بريد إلكتروني رئيسي' },
                          { value: 'app', label: 'تطبيق / موقع' },
                        ] as { value: RecordType; label: string }[]
                      ).map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() =>
                            setDraft((prev) => ({
                              ...prev,
                              recordType: opt.value,
                              category:
                                opt.value === 'email'
                                  ? 'email'
                                  : prev.category === 'email'
                                    ? 'social'
                                    : prev.category,
                              parentEmailId: opt.value === 'email' ? '' : prev.parentEmailId,
                            }))
                          }
                          className={`py-2 px-3 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            draft.recordType === opt.value
                              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="platform-preset" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      اختيار منصة جاهزة
                    </label>
                    <select
                      id="platform-preset"
                      value={draft.platformKey}
                      onChange={(e) => handleSelectPreset(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {PLATFORM_PRESETS.map((preset) => (
                        <option key={preset.key} value={preset.key}>
                          {preset.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Title, Category, Status */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="acc-title" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      اسم الحساب / المنصة *
                    </label>
                    <input
                      id="acc-title"
                      type="text"
                      required
                      maxLength={VAULT_LIMITS.titleMax}
                      value={draft.title}
                      onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
                      placeholder={
                        draft.recordType === 'email'
                          ? 'مثال: البريد الشخصي الأساسي'
                          : 'مثال: Instagram، البنك الأهلي'
                      }
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="acc-category" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      التصنيف
                    </label>
                    <select
                      id="acc-category"
                      value={draft.category}
                      onChange={(e) =>
                        setDraft((p) => ({ ...p, category: e.target.value as AccountCategory }))
                      }
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {(Object.keys(CATEGORY_LABELS) as AccountCategory[]).map((cat) => (
                        <option key={cat} value={cat}>
                          {CATEGORY_LABELS[cat]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="acc-status-top" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      حالة الحساب
                    </label>
                    <select
                      id="acc-status-top"
                      value={draft.status}
                      onChange={(e) =>
                        setDraft((p) => ({ ...p, status: e.target.value as AccountStatus }))
                      }
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {(Object.keys(STATUS_LABELS) as AccountStatus[]).map((st) => (
                        <option key={st} value={st}>
                          {STATUS_LABELS[st]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Parent Account Link (if app) */}
                {draft.recordType === 'app' && (
                  <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                      <Link2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>ربط الحساب بهوية بريد أو حساب أب مسجّل في الخزنة</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label htmlFor="parent-email-select" className="block text-xs text-slate-600 dark:text-slate-400">
                          الحساب الأب المرتبط (من خزنتك)
                        </label>
                        <select
                          id="parent-email-select"
                          value={draft.parentEmailId}
                          onChange={(e) => handleSelectParentAccount(e.target.value)}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">— غير مربوط بحساب أب —</option>
                          {parentAccountOptions.map((em) => (
                            <option key={em.id} value={em.id}>
                              {em.recordType === 'email' ? '[بريد] ' : '[حساب] '}
                              {em.title} {em.emailAddress ? `(${em.emailAddress})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="acc-login-method" className="block text-xs text-slate-600 dark:text-slate-400">
                          طريقة تسجيل الدخول
                        </label>
                        <select
                          id="acc-login-method"
                          value={draft.loginMethod}
                          onChange={(e) =>
                            setDraft((p) => ({ ...p, loginMethod: e.target.value as LoginMethod }))
                          }
                          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          {(Object.keys(LOGIN_METHOD_LABELS) as LoginMethod[]).map((lm) => (
                            <option key={lm} value={lm}>
                              {LOGIN_METHOD_LABELS[lm]}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Email & Username */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="acc-email" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      {draft.recordType === 'email' ? 'عنوان البريد الإلكتروني *' : 'البريد الإلكتروني للحساب'}
                    </label>
                    <input
                      id="acc-email"
                      type="email"
                      dir="ltr"
                      maxLength={VAULT_LIMITS.emailMax}
                      value={draft.emailAddress}
                      onChange={(e) => setDraft((p) => ({ ...p, emailAddress: e.target.value }))}
                      placeholder="name@example.com"
                      className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="acc-username" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      اسم المستخدم في هذا الحساب / التطبيق (Username)
                    </label>
                    <input
                      id="acc-username"
                      type="text"
                      dir="ltr"
                      maxLength={VAULT_LIMITS.usernameMax}
                      value={draft.username}
                      onChange={(e) => setDraft((p) => ({ ...p, username: e.target.value }))}
                      placeholder="@username"
                      className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Password + Strength + Generator + Auto Archive */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label htmlFor="acc-password" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      كلمة المرور
                    </label>
                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>توليد كلمة مرور قوية</span>
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      id="acc-password"
                      type={showPassword ? 'text' : 'password'}
                      dir="ltr"
                      maxLength={VAULT_LIMITS.passwordMax}
                      value={draft.password}
                      onChange={(e) => setDraft((p) => ({ ...p, password: e.target.value }))}
                      placeholder="••••••••••••"
                      className="w-full pl-11 pr-3 py-2.5 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                      aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {draft.password && (
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            pwdEval.tier === 'weak'
                              ? 'bg-rose-500'
                              : pwdEval.tier === 'fair'
                                ? 'bg-amber-500'
                                : pwdEval.tier === 'strong'
                                  ? 'bg-emerald-500'
                                  : 'bg-indigo-600'
                          }`}
                          style={{ width: `${pwdEval.score}%` }}
                        />
                      </div>
                      <span className="text-slate-600 dark:text-slate-400 tabular-nums whitespace-nowrap">
                        القوة: {pwdEval.label} · {pwdEval.entropyBits} بت · الكسر: {pwdEval.crackEstimate}
                      </span>
                    </div>
                  )}

                  {passwordWasChanged && (
                    <label className="inline-flex items-center gap-2 text-xs text-indigo-700 dark:text-indigo-300 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={archiveOldPassword}
                        onChange={(e) => setArchiveOldPassword(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>حفظ كلمة المرور السابقة تلقائياً في سجل كلمات المرور (مفيد عند استرداد الحساب)</span>
                    </label>
                  )}
                </div>

                {/* Deep Identity Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="space-y-1.5">
                    <label htmlFor="acc-full-name" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      الاسم الكامل المسجّل في الحساب
                    </label>
                    <input
                      id="acc-full-name"
                      type="text"
                      maxLength={VAULT_LIMITS.fullNameMax}
                      value={draft.registeredFullName}
                      onChange={(e) => setDraft((p) => ({ ...p, registeredFullName: e.target.value }))}
                      placeholder="الاسم الأول والأخير المسجّل"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="acc-display-name" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      الاسم الظاهر (Display Name)
                    </label>
                    <input
                      id="acc-display-name"
                      type="text"
                      maxLength={VAULT_LIMITS.displayNameMax}
                      value={draft.displayName}
                      onChange={(e) => setDraft((p) => ({ ...p, displayName: e.target.value }))}
                      placeholder="الاسم المعروض للآخرين"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="acc-gender" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      الجنس المسجّل في الحساب
                    </label>
                    <select
                      id="acc-gender"
                      value={draft.registeredGender}
                      onChange={(e) =>
                        setDraft((p) => ({
                          ...p,
                          registeredGender: e.target.value as RegisteredGender,
                        }))
                      }
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {(Object.keys(GENDER_LABELS) as RegisteredGender[]).map((g) => (
                        <option key={g} value={g}>
                          {GENDER_LABELS[g]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="acc-region" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      الدولة / منطقة المتجر
                    </label>
                    <input
                      id="acc-region"
                      type="text"
                      maxLength={VAULT_LIMITS.regionMax}
                      value={draft.accountRegion}
                      onChange={(e) => setDraft((p) => ({ ...p, accountRegion: e.target.value }))}
                      placeholder="مثال: السعودية (SA) / أمريكا (US)"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="acc-phone" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      رقم الجوال المسجّل
                    </label>
                    <input
                      id="acc-phone"
                      type="tel"
                      dir="ltr"
                      maxLength={VAULT_LIMITS.phoneMax}
                      value={draft.phoneNumber}
                      onChange={(e) => setDraft((p) => ({ ...p, phoneNumber: e.target.value }))}
                      placeholder="+966 5X XXX XXXX"
                      className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="acc-external-id" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      معرّف الحساب / ID العميل
                    </label>
                    <input
                      id="acc-external-id"
                      type="text"
                      dir="ltr"
                      maxLength={VAULT_LIMITS.externalIdMax}
                      value={draft.accountExternalId}
                      onChange={(e) => setDraft((p) => ({ ...p, accountExternalId: e.target.value }))}
                      placeholder="User ID / SteamID / رقم العميل"
                      className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="acc-billing-email" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      بريد الفواتير والرسائل (إن اختلف)
                    </label>
                    <input
                      id="acc-billing-email"
                      type="email"
                      dir="ltr"
                      maxLength={VAULT_LIMITS.emailMax}
                      value={draft.billingEmail}
                      onChange={(e) => setDraft((p) => ({ ...p, billingEmail: e.target.value }))}
                      placeholder="billing@example.com"
                      className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="acc-billing-addr" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      عنوان الفوترة / الرمز البريدي
                    </label>
                    <input
                      id="acc-billing-addr"
                      type="text"
                      maxLength={VAULT_LIMITS.billingAddressMax}
                      value={draft.billingAddressHint}
                      onChange={(e) => setDraft((p) => ({ ...p, billingAddressHint: e.target.value }))}
                      placeholder="مثال: الرياض 13524 / US ZIP 97201"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="acc-url" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      رابط الموقع / الدخول
                    </label>
                    <input
                      id="acc-url"
                      type="text"
                      dir="ltr"
                      maxLength={VAULT_LIMITS.websiteUrlMax}
                      value={draft.websiteUrl}
                      onChange={(e) => setDraft((p) => ({ ...p, websiteUrl: e.target.value }))}
                      placeholder="https://..."
                      className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: REGISTERED SITES & APPS CREATED WITH THIS ACCOUNT */}
            {activeTab === 'sites' && (
              <div className="space-y-5">
                <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <Globe className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>المواقع والتطبيقات التي أنشأتها أو سجّلت بها عبر هذا الحساب</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    سجّل هنا كل موقع أو تطبيق أنشأته بهذا الحساب مع تفاصيله الكاملة: متى سويته، اسم المستخدم فيه، تاريخ الميلاد المسجّل به، رقم الجوال، رمز PIN، والتحقق الثنائي.
                  </p>
                </div>

                {/* Quick 1-click platform chips */}
                <div className="space-y-2">
                  <span className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    إضافة سريعة لمنصة شائعة (تنفتح لك لتعبئة تواريخها واسم المستخدم):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_SITE_KEYS.map((key) => {
                      const preset = getPresetByKey(key);
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => handleQuickAddPresetSite(key)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>{preset.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Quick Add Bar */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                  <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                    أو أضف موقعاً / تطبيقاً بالاسم والتواريخ مباشرة:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                    <input
                      type="text"
                      value={quickSiteName}
                      onChange={(e) => setQuickSiteName(e.target.value)}
                      placeholder="اسم الموقع أو التطبيق *"
                      className="sm:col-span-4 px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <input
                      type="text"
                      dir="ltr"
                      value={quickSiteUsername}
                      onChange={(e) => setQuickSiteUsername(e.target.value)}
                      placeholder="اسم المستخدم بالموقع (إن وجد)"
                      className="sm:col-span-4 px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <select
                      value={quickSiteMethod}
                      onChange={(e) => setQuickSiteMethod(e.target.value as SiteSignupMethod)}
                      className="sm:col-span-4 px-2.5 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {(Object.keys(SITE_SIGNUP_METHOD_LABELS) as SiteSignupMethod[]).map((m) => (
                        <option key={m} value={m}>
                          {SITE_SIGNUP_METHOD_LABELS[m]}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      dir="ltr"
                      value={quickSiteUrl}
                      onChange={(e) => setQuickSiteUrl(e.target.value)}
                      placeholder="الرابط https://..."
                      className="sm:col-span-4 px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <div className="sm:col-span-3 space-y-0.5">
                      <span className="block text-[11px] text-slate-400">متى سويته؟</span>
                      <input
                        type="date"
                        dir="ltr"
                        value={quickSiteCreatedDate}
                        onChange={(e) => setQuickSiteCreatedDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                      />
                    </div>
                    <div className="sm:col-span-3 space-y-0.5">
                      <span className="block text-[11px] text-slate-400">تاريخ الميلاد فيه</span>
                      <input
                        type="date"
                        dir="ltr"
                        value={quickSiteBirthdate}
                        onChange={(e) => setQuickSiteBirthdate(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleQuickAddCustomSite}
                      className="sm:col-span-2 px-3 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex items-center justify-center gap-1 self-end cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>إضافة</span>
                    </button>
                  </div>
                </div>

                {/* Registered Sites List */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      المواقع والتطبيقات المسجّلة ({draft.registeredSites.length})
                    </span>
                  </div>

                  {draft.registeredSites.length === 0 ? (
                    <div className="p-6 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
                      لم تضف أي مواقع أو تطبيقات بعد. اختر من القائمة السريعة أعلاه أو اكتب اسم الموقع لإضافته فوراً.
                    </div>
                  ) : (
                    <div className="border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-200 dark:divide-slate-800">
                      {draft.registeredSites.map((site) => {
                        const isExpanded = expandedSiteId === site.id;
                        const siteDur = calculateAccountDuration(site.createdAtDate);
                        return (
                          <div key={site.id} className="p-4 space-y-3">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <PlatformIcon
                                  platformKey={site.platformKey}
                                  recordType="app"
                                  size="sm"
                                />
                                <div className="min-w-0 space-y-0.5">
                                  <p className="text-sm font-semibold truncate">
                                    {site.name || 'موقع بدون اسم'}
                                  </p>
                                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                                    <span>{SITE_SIGNUP_METHOD_LABELS[site.signupMethod]}</span>
                                    {site.username && (
                                      <>
                                        <span aria-hidden="true">·</span>
                                        <span className="font-mono" dir="ltr">{site.username}</span>
                                      </>
                                    )}
                                    {site.createdAtDate && (
                                      <>
                                        <span aria-hidden="true">·</span>
                                        <span>
                                          الإنشاء: {formatReadableDate(site.createdAtDate)}
                                          {siteDur ? ` (${siteDur.label})` : ''}
                                        </span>
                                      </>
                                    )}
                                    {site.registeredBirthdate && (
                                      <>
                                        <span aria-hidden="true">·</span>
                                        <span>الميلاد: {formatReadableDate(site.registeredBirthdate)}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedSiteId(isExpanded ? null : site.id)
                                  }
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                                >
                                  <span>{isExpanded ? 'إخفاء التفاصيل' : 'كل التفاصيل'}</span>
                                  {isExpanded ? (
                                    <ChevronUp className="w-3.5 h-3.5" />
                                  ) : (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeSiteItem(site.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
                                  aria-label="حذف الموقع"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                <div className="space-y-1">
                                  <label className="block text-xs text-slate-500">اسم الموقع / التطبيق</label>
                                  <input
                                    type="text"
                                    value={site.name}
                                    onChange={(e) =>
                                      updateSiteItem(site.id, { name: e.target.value })
                                    }
                                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="block text-xs text-slate-500">المنصة / الأيقونة</label>
                                  <select
                                    value={site.platformKey}
                                    onChange={(e) => {
                                      const p = getPresetByKey(e.target.value);
                                      updateSiteItem(site.id, {
                                        platformKey: p.key,
                                        url: site.url || p.defaultUrl,
                                      });
                                    }}
                                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                                  >
                                    {PLATFORM_PRESETS.map((p) => (
                                      <option key={p.key} value={p.key}>
                                        {p.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div className="space-y-1">
                                  <label className="block text-xs text-slate-500">طريقة التسجيل في الموقع</label>
                                  <select
                                    value={site.signupMethod}
                                    onChange={(e) =>
                                      updateSiteItem(site.id, {
                                        signupMethod: e.target.value as SiteSignupMethod,
                                      })
                                    }
                                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                                  >
                                    {(
                                      Object.keys(SITE_SIGNUP_METHOD_LABELS) as SiteSignupMethod[]
                                    ).map((m) => (
                                      <option key={m} value={m}>
                                        {SITE_SIGNUP_METHOD_LABELS[m]}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div className="space-y-1">
                                  <label className="block text-xs text-slate-500">اسم المستخدم في هذا التطبيق</label>
                                  <input
                                    type="text"
                                    dir="ltr"
                                    value={site.username}
                                    onChange={(e) =>
                                      updateSiteItem(site.id, { username: e.target.value })
                                    }
                                    placeholder="@username"
                                    className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="block text-xs text-slate-500">الاسم الظاهر في هذا التطبيق</label>
                                  <input
                                    type="text"
                                    value={site.displayName}
                                    onChange={(e) =>
                                      updateSiteItem(site.id, { displayName: e.target.value })
                                    }
                                    placeholder="الاسم المعروض داخل الموقع"
                                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="block text-xs text-slate-500">كلمة مرور خاصة بالموقع (إن وجدت)</label>
                                  <input
                                    type="text"
                                    dir="ltr"
                                    value={site.password}
                                    onChange={(e) =>
                                      updateSiteItem(site.id, { password: e.target.value })
                                    }
                                    placeholder="اتركه فارغاً إن كان دخول مباشر"
                                    className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="block text-xs text-slate-500">متى سويت الحساب في هذا التطبيق؟</label>
                                  <input
                                    type="date"
                                    dir="ltr"
                                    value={site.createdAtDate}
                                    onChange={(e) =>
                                      updateSiteItem(site.id, {
                                        createdAtDate: e.target.value,
                                      })
                                    }
                                    className="w-full px-3 py-1.5 text-xs font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                                  />
                                  <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={site.isApproximateDate}
                                      onChange={(e) =>
                                        updateSiteItem(site.id, {
                                          isApproximateDate: e.target.checked,
                                        })
                                      }
                                      className="rounded border-slate-300 text-indigo-600"
                                    />
                                    <span>تاريخ تقريبي</span>
                                  </label>
                                </div>

                                <div className="space-y-1">
                                  <label className="block text-xs text-slate-500">تاريخ الميلاد المسجّل به</label>
                                  <input
                                    type="date"
                                    dir="ltr"
                                    value={site.registeredBirthdate}
                                    onChange={(e) =>
                                      updateSiteItem(site.id, {
                                        registeredBirthdate: e.target.value,
                                      })
                                    }
                                    className="w-full px-3 py-1.5 text-xs font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="block text-xs text-slate-500">رقم الجوال بالتطبيق</label>
                                  <input
                                    type="tel"
                                    dir="ltr"
                                    value={site.phoneNumber}
                                    onChange={(e) =>
                                      updateSiteItem(site.id, { phoneNumber: e.target.value })
                                    }
                                    placeholder="+966 5X..."
                                    className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="block text-xs text-slate-500">رمز PIN / قفل الملف</label>
                                  <input
                                    type="text"
                                    dir="ltr"
                                    value={site.pinCode}
                                    onChange={(e) =>
                                      updateSiteItem(site.id, { pinCode: e.target.value })
                                    }
                                    placeholder="مثال: 1234"
                                    className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="block text-xs text-slate-500">الجهاز المستخدم</label>
                                  <input
                                    type="text"
                                    value={site.deviceUsed}
                                    onChange={(e) =>
                                      updateSiteItem(site.id, { deviceUsed: e.target.value })
                                    }
                                    placeholder="مثال: iPhone / PC"
                                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="block text-xs text-slate-500">الرابط (URL)</label>
                                  <input
                                    type="text"
                                    dir="ltr"
                                    value={site.url}
                                    onChange={(e) =>
                                      updateSiteItem(site.id, { url: e.target.value })
                                    }
                                    placeholder="https://..."
                                    className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="block text-xs text-slate-500">بطاقة الدفع / الاشتراك</label>
                                  <input
                                    type="text"
                                    value={site.subscriptionCost}
                                    onChange={(e) =>
                                      updateSiteItem(site.id, { subscriptionCost: e.target.value })
                                    }
                                    placeholder="مثال: 20 USD / شهر"
                                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="block text-xs text-slate-500">البطاقة المربوطة</label>
                                  <input
                                    type="text"
                                    value={site.linkedCardHint}
                                    onChange={(e) =>
                                      updateSiteItem(site.id, { linkedCardHint: e.target.value })
                                    }
                                    placeholder="مثال: مدى *4821"
                                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="block text-xs text-slate-500">حالة الحساب بالموقع</label>
                                  <select
                                    value={site.status}
                                    onChange={(e) =>
                                      updateSiteItem(site.id, {
                                        status: e.target.value as RegisteredSiteStatus,
                                      })
                                    }
                                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                                  >
                                    {(
                                      Object.keys(SITE_STATUS_LABELS) as RegisteredSiteStatus[]
                                    ).map((st) => (
                                      <option key={st} value={st}>
                                        {SITE_STATUS_LABELS[st]}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div className="sm:col-span-2 lg:col-span-3 flex flex-wrap items-center gap-4 pt-1">
                                  <label className="inline-flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={site.twoFactorEnabled}
                                      onChange={(e) =>
                                        updateSiteItem(site.id, {
                                          twoFactorEnabled: e.target.checked,
                                        })
                                      }
                                      className="rounded border-slate-300 text-indigo-600"
                                    />
                                    <span>التحقق بخطوتين (2FA) مفعّل في هذا التطبيق</span>
                                  </label>
                                  {site.twoFactorEnabled && (
                                    <input
                                      type="text"
                                      value={site.twoFactorNote}
                                      onChange={(e) =>
                                        updateSiteItem(site.id, {
                                          twoFactorNote: e.target.value,
                                        })
                                      }
                                      placeholder="وسيلة التحقق (SMS / Authenticator)"
                                      className="flex-1 min-w-[180px] px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                                    />
                                  )}
                                </div>

                                <div className="sm:col-span-2 lg:col-span-3 space-y-1">
                                  <label className="block text-xs text-slate-500">ملاحظة خاصة بهذا الموقع</label>
                                  <input
                                    type="text"
                                    value={site.notes}
                                    onChange={(e) =>
                                      updateSiteItem(site.id, { notes: e.target.value })
                                    }
                                    placeholder="مثال: اشتراك بريميوم، رقم الطلبات، سبب التسجيل..."
                                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {linkedChildAccounts.length > 0 && (
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30 space-y-2">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      حسابات كاملة مستقلة مربوطة بهذا السجل ({linkedChildAccounts.length}):
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs text-slate-600 dark:text-slate-400">
                      {linkedChildAccounts
                        .map((ch) => (
                          <span key={ch.id} className="font-medium text-slate-800 dark:text-slate-200">
                            {ch.title}
                          </span>
                        ))
                        .reduce<React.ReactNode[]>(
                          (acc, el, i) => (i === 0 ? [el] : [...acc, <span key={`sep_${i}`}>·</span>, el]),
                          []
                        )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: DATES, CREATION CONTEXT & TIMELINE */}
            {activeTab === 'dates' && (
              <div className="space-y-5">
                <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>توثيق التواريخ الدقيقة وسياق إنشاء الحساب</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    كثير من المنصات تطلب تاريخ الميلاد المسجّل، ومتى وأين تم إنشاء الحساب عند طلب استرداده.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label htmlFor="acc-birthdate" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      تاريخ الميلاد المسجّل داخل هذا الحساب / التطبيق
                    </label>
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      {realBirthdate && (
                        <button
                          type="button"
                          onClick={() =>
                            setDraft((p) => ({ ...p, registeredBirthdate: realBirthdate }))
                          }
                          className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                        >
                          نسخ تاريخ ميلادي الحقيقي ({realBirthdate})
                        </button>
                      )}
                      {parentRecord?.registeredBirthdate && (
                        <button
                          type="button"
                          onClick={() =>
                            setDraft((p) => ({
                              ...p,
                              registeredBirthdate: parentRecord.registeredBirthdate,
                            }))
                          }
                          className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                        >
                          نسخ من الحساب الأب ({parentRecord.registeredBirthdate})
                        </button>
                      )}
                    </div>
                  </div>
                  <input
                    id="acc-birthdate"
                    type="date"
                    dir="ltr"
                    value={draft.registeredBirthdate}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, registeredBirthdate: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {registeredAge !== null && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                      العمر المسجّل في الحساب حالياً:{' '}
                      <strong className="text-slate-900 dark:text-slate-100">{registeredAge} سنة</strong>
                      {realBirthdate && draft.registeredBirthdate !== realBirthdate && (
                        <span className="text-amber-600 dark:text-amber-400 mr-2">
                          · ملاحظة: يختلف عن تاريخ ميلادك الحقيقي ({realBirthdate})
                        </span>
                      )}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="acc-created-date" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      متى سويت الحساب؟ (تاريخ الإنشاء)
                    </label>
                    <input
                      id="acc-created-date"
                      type="date"
                      dir="ltr"
                      value={draft.accountCreatedAt}
                      onChange={(e) =>
                        setDraft((p) => ({ ...p, accountCreatedAt: e.target.value }))
                      }
                      className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <label className="inline-flex items-center gap-2 text-xs text-slate-500 cursor-pointer pt-0.5">
                      <input
                        type="checkbox"
                        checked={draft.createdDateApproximate}
                        onChange={(e) =>
                          setDraft((p) => ({ ...p, createdDateApproximate: e.target.checked }))
                        }
                        className="rounded border-slate-300 text-indigo-600"
                      />
                      <span>تاريخ تقريبي (غير مؤكد باليوم)</span>
                    </label>
                    {createdDuration && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                        عمر الحساب:{' '}
                        <strong className="text-slate-900 dark:text-slate-100">{createdDuration.label}</strong>
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="acc-pwd-changed" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      تاريخ آخر تحديث لكلمة المرور
                    </label>
                    <input
                      id="acc-pwd-changed"
                      type="date"
                      dir="ltr"
                      value={draft.lastPasswordChangedAt}
                      onChange={(e) =>
                        setDraft((p) => ({ ...p, lastPasswordChangedAt: e.target.value }))
                      }
                      className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="acc-last-accessed" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      آخر مرة فتحت فيها الحساب
                    </label>
                    <input
                      id="acc-last-accessed"
                      type="date"
                      dir="ltr"
                      value={draft.lastAccessedAt}
                      onChange={(e) =>
                        setDraft((p) => ({ ...p, lastAccessedAt: e.target.value }))
                      }
                      className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Creation Context */}
                <div className="space-y-1.5">
                  <label htmlFor="acc-creation-context" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    سياق ومكان الإنشاء (من أي جهاز أو مدينة أو كيف أنشأت الحساب؟)
                  </label>
                  <input
                    id="acc-creation-context"
                    type="text"
                    maxLength={VAULT_LIMITS.creationContextMax}
                    value={draft.creationContext}
                    onChange={(e) => setDraft((p) => ({ ...p, creationContext: e.target.value }))}
                    placeholder="مثال: أنشأته من آيفون 11 في الرياض عام 2020 أو عبر دعوة صديق"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Timeline Events */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>سجل الأحداث والتغييرات المهمة على الحساب</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                    <input
                      type="date"
                      dir="ltr"
                      value={newEventDate}
                      onChange={(e) => setNewEventDate(e.target.value)}
                      className="sm:col-span-4 px-3 py-2 text-xs font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                    <input
                      type="text"
                      value={newEventTitle}
                      onChange={(e) => setNewEventTitle(e.target.value)}
                      placeholder="مثال: تم توثيق الحساب بالهوية / تغيير رقم الجوال"
                      className="sm:col-span-7 px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                    <button
                      type="button"
                      onClick={handleAddTimelineEvent}
                      className="sm:col-span-1 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center cursor-pointer"
                      aria-label="إضافة حدث"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {draft.timelineEvents.length > 0 && (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl">
                      {draft.timelineEvents.map((ev) => (
                        <div key={ev.id} className="px-4 py-2.5 flex items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="font-mono tabular-nums text-slate-500 shrink-0" dir="ltr">
                              {ev.date || 'بدون تاريخ'}
                            </span>
                            <span className="text-slate-800 dark:text-slate-200 truncate">{ev.title}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setDraft((p) => ({
                                ...p,
                                timelineEvents: p.timelineEvents.filter((item) => item.id !== ev.id),
                              }))
                            }
                            className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                            aria-label="حذف الحدث"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: SECURITY, PASSKEY, TOTP & PASSWORD HISTORY */}
            {activeTab === 'security' && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <span className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      التحقق بخطوتين (2FA)
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setDraft((p) => ({
                          ...p,
                          twoFactorEnabled: !p.twoFactorEnabled,
                          twoFactorMethod: !p.twoFactorEnabled ? 'authenticator' : 'none',
                        }))
                      }
                      className={`w-full px-3 py-2 text-sm font-medium rounded-lg border flex items-center justify-between transition-colors cursor-pointer ${
                        draft.twoFactorEnabled
                          ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        <span>{draft.twoFactorEnabled ? 'مفعل ومحمي' : 'غير مفعل'}</span>
                      </span>
                      <span className="text-xs">{draft.twoFactorEnabled ? 'إيقاف' : 'تفعيل'}</span>
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="acc-2fa-method" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      وسيلة التحقق
                    </label>
                    <select
                      id="acc-2fa-method"
                      disabled={!draft.twoFactorEnabled}
                      value={draft.twoFactorMethod}
                      onChange={(e) =>
                        setDraft((p) => ({
                          ...p,
                          twoFactorMethod: e.target.value as TwoFactorMethod,
                        }))
                      }
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {(Object.keys(TWO_FACTOR_LABELS) as TwoFactorMethod[]).map((m) => (
                        <option key={m} value={m}>
                          {TWO_FACTOR_LABELS[m]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Passkey / Biometric */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30">
                  <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.passkeyEnabled}
                      onChange={(e) => setDraft((p) => ({ ...p, passkeyEnabled: e.target.checked }))}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <Fingerprint className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>مفعل عليه مفتاح المرور (Passkey / بصمة)</span>
                  </label>
                  <input
                    type="text"
                    disabled={!draft.passkeyEnabled}
                    maxLength={VAULT_LIMITS.primaryDeviceMax}
                    value={draft.biometricDevice}
                    onChange={(e) => setDraft((p) => ({ ...p, biometricDevice: e.target.value }))}
                    placeholder="الجهاز المحفوظ عليه الـ Passkey (مثال: iPhone 15 Pro)"
                    className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-50"
                  />
                </div>

                {/* Live TOTP Secret Key */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label htmlFor="acc-totp-secret" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      مفتاح المصادقة الثنائية السري (TOTP Secret / Setup Key)
                    </label>
                    {totpPreview && (
                      <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums" dir="ltr">
                        الرمز الحالي: {totpPreview.slice(0, 3)} {totpPreview.slice(3)}
                      </span>
                    )}
                  </div>
                  <input
                    id="acc-totp-secret"
                    type="text"
                    dir="ltr"
                    maxLength={VAULT_LIMITS.totpSecretMax}
                    value={draft.totpSecret}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        totpSecret: e.target.value,
                        twoFactorEnabled: e.target.value.trim() ? true : p.twoFactorEnabled,
                        twoFactorMethod:
                          e.target.value.trim() && p.twoFactorMethod === 'none'
                            ? 'authenticator'
                            : p.twoFactorMethod,
                      }))
                    }
                    placeholder="مثال: JBSWY3DPEHPK3PXP أو رابط otpauth://"
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    عند إدخال مفتاح التفعيل السري، سيولد التطبيق لك رمز التحقق (6 أرقام) تلقائياً داخل صفحة التفاصيل.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="acc-rec-email" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      بريد الاسترداد البديل
                    </label>
                    <input
                      id="acc-rec-email"
                      type="email"
                      dir="ltr"
                      maxLength={VAULT_LIMITS.emailMax}
                      value={draft.recoveryEmail}
                      onChange={(e) => setDraft((p) => ({ ...p, recoveryEmail: e.target.value }))}
                      placeholder="recovery@example.com"
                      className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="acc-rec-phone" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      جوال الاسترداد البديل
                    </label>
                    <input
                      id="acc-rec-phone"
                      type="tel"
                      dir="ltr"
                      maxLength={VAULT_LIMITS.phoneMax}
                      value={draft.recoveryPhone}
                      onChange={(e) => setDraft((p) => ({ ...p, recoveryPhone: e.target.value }))}
                      placeholder="+966 5X..."
                      className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="acc-rec-contact" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      جهة اتصال استرداد موثوقة
                    </label>
                    <input
                      id="acc-rec-contact"
                      type="text"
                      maxLength={VAULT_LIMITS.fullNameMax}
                      value={draft.recoveryContactPerson}
                      onChange={(e) => setDraft((p) => ({ ...p, recoveryContactPerson: e.target.value }))}
                      placeholder="مثال: اسم قريب / رقم تواصل"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="acc-pin" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      رمز PIN / رمز الملف الشخصي
                    </label>
                    <input
                      id="acc-pin"
                      type="text"
                      dir="ltr"
                      maxLength={VAULT_LIMITS.pinCodeMax}
                      value={draft.pinCode}
                      onChange={(e) => setDraft((p) => ({ ...p, pinCode: e.target.value }))}
                      placeholder="مثال: 4829"
                      className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="acc-backup-codes" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    رموز الاسترداد الاحتياطية (Backup Codes)
                  </label>
                  <textarea
                    id="acc-backup-codes"
                    rows={3}
                    dir="ltr"
                    maxLength={VAULT_LIMITS.backupCodesMax}
                    value={draft.backupCodes}
                    onChange={(e) => setDraft((p) => ({ ...p, backupCodes: e.target.value }))}
                    placeholder="8492-1049&#10;3391-7842"
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="acc-emergency" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    خطة وتعليمات استرداد الحساب في الطوارئ
                  </label>
                  <input
                    id="acc-emergency"
                    type="text"
                    maxLength={VAULT_LIMITS.notesMax}
                    value={draft.emergencyInstructions}
                    onChange={(e) => setDraft((p) => ({ ...p, emergencyInstructions: e.target.value }))}
                    placeholder="مثال: في حال فقدان الجهاز، تواصل مع الدعم باستخدام رقم العقد أو البريد البديل..."
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Security Questions */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>أسئلة الأمان وإجاباتها (حد أقصى 5)</span>
                    </span>
                    {draft.securityQuestions.length < VAULT_LIMITS.securityQuestionsMax && (
                      <button
                        type="button"
                        onClick={handleAddSecurityQuestion}
                        className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>إضافة سؤال أمان</span>
                      </button>
                    )}
                  </div>

                  {draft.securityQuestions.length === 0 ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      لا توجد أسئلة أمان مضافة لهذا الحساب.
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {draft.securityQuestions.map((item, idx) => (
                        <div key={idx} className="grid grid-cols-1 sm:grid-cols-11 gap-2 items-center">
                          <input
                            type="text"
                            maxLength={VAULT_LIMITS.securityQuestionTextMax}
                            value={item.question}
                            onChange={(e) => {
                              const next = [...draft.securityQuestions];
                              next[idx] = { ...next[idx], question: e.target.value };
                              setDraft((p) => ({ ...p, securityQuestions: next }));
                            }}
                            placeholder="سؤال الأمان..."
                            className="sm:col-span-5 px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                          />
                          <input
                            type="text"
                            maxLength={VAULT_LIMITS.securityQuestionTextMax}
                            value={item.answer}
                            onChange={(e) => {
                              const next = [...draft.securityQuestions];
                              next[idx] = { ...next[idx], answer: e.target.value };
                              setDraft((p) => ({ ...p, securityQuestions: next }));
                            }}
                            placeholder="الإجابة السرية..."
                            className="sm:col-span-5 px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveSecurityQuestion(idx)}
                            className="sm:col-span-1 p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 flex justify-center cursor-pointer"
                            aria-label="حذف السؤال"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Password History */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <History className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>سجل كلمات المرور القديمة ({draft.passwordHistory.length})</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <input
                      type="text"
                      dir="ltr"
                      value={manualOldPwd}
                      onChange={(e) => setManualOldPwd(e.target.value)}
                      placeholder="كلمة مرور سابقة..."
                      className="sm:col-span-5 px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                    <input
                      type="date"
                      dir="ltr"
                      value={manualOldPwdDate}
                      onChange={(e) => setManualOldPwdDate(e.target.value)}
                      className="sm:col-span-3 px-3 py-1.5 text-xs font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                    <input
                      type="text"
                      value={manualOldPwdNote}
                      onChange={(e) => setManualOldPwdNote(e.target.value)}
                      placeholder="سبب أو ملاحظة"
                      className="sm:col-span-3 px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                    <button
                      type="button"
                      onClick={handleAddManualOldPassword}
                      className="sm:col-span-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center cursor-pointer"
                      aria-label="إضافة كلمة قديمة"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {draft.passwordHistory.length > 0 && (
                    <div className="border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800">
                      {draft.passwordHistory.map((item, idx) => {
                        const open = Boolean(revealedHistoryIdx[idx]);
                        return (
                          <div key={idx} className="px-3.5 py-2 flex items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="font-mono text-slate-800 dark:text-slate-200" dir="ltr">
                                {open ? item.password : '••••••••••'}
                              </span>
                              <span className="font-mono tabular-nums text-slate-500" dir="ltr">
                                {item.changedAt}
                              </span>
                              {item.note && (
                                <span className="text-slate-500 truncate">{item.note}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  setRevealedHistoryIdx((p) => ({ ...p, [idx]: !open }))
                                }
                                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                                aria-label="إظهار أو إخفاء"
                              >
                                {open ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setDraft((p) => ({
                                    ...p,
                                    passwordHistory: p.passwordHistory.filter((_, i) => i !== idx),
                                  }))
                                }
                                className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                                aria-label="حذف"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 5: DEVICES, SUBSCRIPTIONS, CUSTOM FIELDS & NOTES */}
            {activeTab === 'extra' && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="acc-device" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      الجهاز الأساسي المسجّل عليه
                    </label>
                    <input
                      id="acc-device"
                      type="text"
                      maxLength={VAULT_LIMITS.primaryDeviceMax}
                      value={draft.primaryDevice}
                      onChange={(e) => setDraft((p) => ({ ...p, primaryDevice: e.target.value }))}
                      placeholder="مثال: iPhone 15 Pro / MacBook"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="acc-payment-hint" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      وسيلة الدفع المربوطة (آخر 4 أرقام / اسم البطاقة)
                    </label>
                    <input
                      id="acc-payment-hint"
                      type="text"
                      maxLength={VAULT_LIMITS.paymentHintMax}
                      value={draft.linkedPaymentHint}
                      onChange={(e) => setDraft((p) => ({ ...p, linkedPaymentHint: e.target.value }))}
                      placeholder="مثال: مدى الراجحي *4821 / Apple Pay"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Trusted Devices list */}
                <div className="space-y-2">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>قائمة الأجهزة الموثوقة والجلسات المفتوحة</span>
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newDeviceText}
                      onChange={(e) => setNewDeviceText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddDevice();
                        }
                      }}
                      placeholder="أضف جهازاً (مثال: iPad Air / لابتوب العمل)"
                      className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                    <button
                      type="button"
                      onClick={handleAddDevice}
                      className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 cursor-pointer"
                    >
                      إضافة جهاز
                    </button>
                  </div>
                  {draft.trustedDevices.length > 0 && (
                    <div className="border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800">
                      {draft.trustedDevices.map((dev, i) => (
                        <div key={i} className="px-3.5 py-2 flex items-center justify-between text-xs">
                          <span>{dev}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setDraft((p) => ({
                                ...p,
                                trustedDevices: p.trustedDevices.filter((_, idx) => idx !== i),
                              }))
                            }
                            className="text-slate-400 hover:text-rose-600 cursor-pointer"
                            aria-label="إزالة الجهاز"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Subscription Analytics */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="space-y-1.5">
                      <label htmlFor="acc-sub-status" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                        نوع الاشتراك
                      </label>
                      <select
                        id="acc-sub-status"
                        value={draft.subscriptionStatus}
                        onChange={(e) =>
                          setDraft((p) => ({
                            ...p,
                            subscriptionStatus: e.target.value as SubscriptionStatus,
                          }))
                        }
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                      >
                        {(Object.keys(SUBSCRIPTION_LABELS) as SubscriptionStatus[]).map((sub) => (
                          <option key={sub} value={sub}>
                            {SUBSCRIPTION_LABELS[sub]}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="acc-sub-amount" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                        المبلغ الرقمي (للحسبة)
                      </label>
                      <input
                        id="acc-sub-amount"
                        type="number"
                        step="0.01"
                        min={0}
                        dir="ltr"
                        value={draft.subscriptionAmount || ''}
                        onChange={(e) =>
                          setDraft((p) => ({
                            ...p,
                            subscriptionAmount: Number(e.target.value) || 0,
                          }))
                        }
                        placeholder="63"
                        className="w-full px-3 py-2 text-xs font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="acc-sub-currency" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                        العملة
                      </label>
                      <select
                        id="acc-sub-currency"
                        value={draft.subscriptionCurrency}
                        onChange={(e) =>
                          setDraft((p) => ({
                            ...p,
                            subscriptionCurrency: e.target.value as SubscriptionCurrency,
                          }))
                        }
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                      >
                        {(Object.keys(CURRENCY_LABELS) as SubscriptionCurrency[]).map((cur) => (
                          <option key={cur} value={cur}>
                            {CURRENCY_LABELS[cur]}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="acc-renewal" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                        تاريخ التجديد القادم
                      </label>
                      <input
                        id="acc-renewal"
                        type="date"
                        dir="ltr"
                        value={draft.renewalDate}
                        onChange={(e) => setDraft((p) => ({ ...p, renewalDate: e.target.value }))}
                        className="w-full px-3 py-2 text-xs font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                    <input
                      type="text"
                      maxLength={VAULT_LIMITS.subscriptionCostMax}
                      value={draft.subscriptionCost}
                      onChange={(e) => setDraft((p) => ({ ...p, subscriptionCost: e.target.value }))}
                      placeholder="وصف التكلفة (مثال: 63 ر.س / شهر - الباقة العائلية)"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                    <label className="inline-flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={draft.autoRenew}
                        onChange={(e) => setDraft((p) => ({ ...p, autoRenew: e.target.checked }))}
                        className="rounded border-slate-300 text-indigo-600"
                      />
                      <span>يُجدّد الاشتراك تلقائياً (خصم تلقائي من البطاقة)</span>
                    </label>
                  </div>
                </div>

                {/* Custom Fields */}
                <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      <span>حقول مخصصة إضافية (IBAN، رقم عقد، مفتاح رخصة...)</span>
                    </span>
                    {draft.customFields.length < VAULT_LIMITS.customFieldsMax && (
                      <button
                        type="button"
                        onClick={handleAddCustomField}
                        className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>إضافة حقل خاص</span>
                      </button>
                    )}
                  </div>

                  {draft.customFields.map((cf, idx) => (
                    <div key={cf.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                      <input
                        type="text"
                        maxLength={VAULT_LIMITS.customFieldLabelMax}
                        value={cf.label}
                        onChange={(e) => {
                          const next = [...draft.customFields];
                          next[idx] = { ...next[idx], label: e.target.value };
                          setDraft((p) => ({ ...p, customFields: next }));
                        }}
                        placeholder="اسم الحقل..."
                        className="sm:col-span-4 px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                      <input
                        type="text"
                        maxLength={VAULT_LIMITS.customFieldValueMax}
                        value={cf.value}
                        onChange={(e) => {
                          const next = [...draft.customFields];
                          next[idx] = { ...next[idx], value: e.target.value };
                          setDraft((p) => ({ ...p, customFields: next }));
                        }}
                        placeholder="القيمة..."
                        className="sm:col-span-5 px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                      <label className="sm:col-span-2 inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={cf.isSecret}
                          onChange={(e) => {
                            const next = [...draft.customFields];
                            next[idx] = { ...next[idx], isSecret: e.target.checked };
                            setDraft((p) => ({ ...p, customFields: next }));
                          }}
                          className="rounded border-slate-300 text-indigo-600"
                        />
                        <span>سري</span>
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setDraft((p) => ({
                            ...p,
                            customFields: p.customFields.filter((item) => item.id !== cf.id),
                          }))
                        }
                        className="sm:col-span-1 p-2 text-slate-400 hover:text-rose-600 flex justify-center cursor-pointer"
                        aria-label="حذف الحقل"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="acc-notes" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    ملاحظات وتفاصيل إضافية
                  </label>
                  <textarea
                    id="acc-notes"
                    rows={4}
                    maxLength={VAULT_LIMITS.notesMax}
                    value={draft.notes}
                    onChange={(e) => setDraft((p) => ({ ...p, notes: e.target.value }))}
                    placeholder="اكتب أي تفاصيل تريد تذكرها عن هذا الحساب..."
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between gap-4">
            <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.isFavorite}
                onChange={(e) => setDraft((p) => ({ ...p, isFavorite: e.target.checked }))}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>تثبيت في المفضلة</span>
            </label>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {saving ? 'جاري الحفظ...' : editingAccount ? 'حفظ التعديلات' : 'إضافة إلى الخزنة'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
