import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Calendar,
  Check,
  Clock,
  Copy,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  FileSpreadsheet,
  FileText,
  Globe,
  History,
  KeyRound,
  Link2,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { RegisteredSiteItem, SiteSignupMethod, VaultAccount } from '../types/vault';
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
  analyzePasswordRisks,
  buildAccountTextSummary,
  calculateAccountDuration,
  calculateAgeFromBirthdate,
  createEmptySiteItem,
  evaluatePasswordStrength,
  formatReadableDate,
  generateSecurePassword,
  getAccountFieldCompleteness,
  getPresetByKey,
} from '../utils/vaultHelpers';
import { generateTotpCode, TotpResult } from '../utils/totp';
import { PlatformIcon } from './PlatformIcon';

interface AccountDetailDrawerProps {
  account: VaultAccount | null;
  allAccounts: VaultAccount[];
  realBirthdate: string;
  onClose: () => void;
  onSelectAccount: (acc: VaultAccount) => void;
  onEdit: (acc: VaultAccount, initialTab?: 'identity' | 'sites' | 'dates' | 'security' | 'extra') => void;
  onDelete: (acc: VaultAccount) => Promise<void>;
  onToggleFavorite: (acc: VaultAccount) => Promise<void>;
  onAddLinkedApp: (parentAccount: VaultAccount) => void;
  onAddQuickSite: (parentAccount: VaultAccount, site: RegisteredSiteItem) => Promise<void>;
  onUpdateQuickSite: (parentAccount: VaultAccount, updatedSite: RegisteredSiteItem) => Promise<void>;
  onRemoveQuickSite: (parentAccount: VaultAccount, siteId: string) => Promise<void>;
  onPromoteSiteToAccount: (parentAccount: VaultAccount, site: RegisteredSiteItem) => Promise<void>;
  onRotatePassword: (account: VaultAccount, newPassword: string, note: string) => Promise<void>;
  onMarkAccessedToday: (account: VaultAccount) => Promise<void>;
  onDuplicateAccount: (account: VaultAccount) => void;
  onExportExcel?: (account: VaultAccount, linkedApps: VaultAccount[]) => void;
  onCopySecret?: (value: string, label: string) => void;
}

export const AccountDetailDrawer: React.FC<AccountDetailDrawerProps> = ({
  account,
  allAccounts,
  realBirthdate,
  onClose,
  onSelectAccount,
  onEdit,
  onDelete,
  onToggleFavorite,
  onAddLinkedApp,
  onAddQuickSite,
  onUpdateQuickSite,
  onRemoveQuickSite,
  onPromoteSiteToAccount,
  onRotatePassword,
  onMarkAccessedToday,
  onDuplicateAccount,
  onExportExcel,
  onCopySecret,
}) => {
  const [revealPassword, setRevealPassword] = useState(false);
  const [revealPin, setRevealPin] = useState(false);
  const [revealBackup, setRevealBackup] = useState(false);
  const [revealedAnswers, setRevealedAnswers] = useState<Record<number, boolean>>({});
  const [revealedChildPwds, setRevealedChildPwds] = useState<Record<string, boolean>>({});
  const [revealedSitePwds, setRevealedSitePwds] = useState<Record<string, boolean>>({});
  const [revealedSitePins, setRevealedSitePins] = useState<Record<string, boolean>>({});
  const [revealedHistoryPwds, setRevealedHistoryPwds] = useState<Record<number, boolean>>({});
  const [revealedCustomFields, setRevealedCustomFields] = useState<Record<string, boolean>>({});
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Live TOTP state
  const [totpState, setTotpState] = useState<TotpResult | null>(null);

  // Inline Quick Add Site inside drawer
  const [showQuickSiteForm, setShowQuickSiteForm] = useState(false);
  const [sitePresetKey, setSitePresetKey] = useState('custom');
  const [siteName, setSiteName] = useState('');
  const [siteUrl, setSiteUrl] = useState('');
  const [siteMethod, setSiteMethod] = useState<SiteSignupMethod>('oauth_button');
  const [siteUsername, setSiteUsername] = useState('');
  const [siteDisplayName, setSiteDisplayName] = useState('');
  const [sitePassword, setSitePassword] = useState('');
  const [sitePhone, setSitePhone] = useState('');
  const [sitePin, setSitePin] = useState('');
  const [siteBirthdate, setSiteBirthdate] = useState('');
  const [siteCreatedDate, setSiteCreatedDate] = useState('');
  const [siteApproxDate, setSiteApproxDate] = useState(false);
  const [siteTwoFactor, setSiteTwoFactor] = useState(false);
  const [siteTwoFactorNote, setSiteTwoFactorNote] = useState('');
  const [siteCardHint, setSiteCardHint] = useState('');
  const [siteDeviceUsed, setSiteDeviceUsed] = useState('');
  const [siteSubCost, setSiteSubCost] = useState('');
  const [siteRenewalDate, setSiteRenewalDate] = useState('');
  const [siteNotes, setSiteNotes] = useState('');
  const [savingSite, setSavingSite] = useState(false);
  const [siteSearch, setSiteSearch] = useState('');

  // Inline Edit Site inside drawer
  const [editingSiteId, setEditingSiteId] = useState<string | null>(null);
  const [editSiteDraft, setEditSiteDraft] = useState<RegisteredSiteItem | null>(null);
  const [savingEditSite, setSavingEditSite] = useState(false);

  // Fast Password Rotation
  const [showRotateForm, setShowRotateForm] = useState(false);
  const [rotatePwd, setRotatePwd] = useState('');
  const [rotateNote, setRotateNote] = useState('');
  const [rotatingPwd, setRotatingPwd] = useState(false);

  useEffect(() => {
    setShowQuickSiteForm(false);
    setShowRotateForm(false);
    setRotatePwd('');
    setRotateNote('');
    setEditingSiteId(null);
    setEditSiteDraft(null);
    setSiteSearch('');
    setConfirmDelete(false);
    setRevealPassword(false);
    setRevealPin(false);
    setRevealBackup(false);
  }, [account?.id]);

  useEffect(() => {
    if (!account?.totpSecret) {
      setTotpState(null);
      return;
    }
    let active = true;
    const tick = () => {
      void generateTotpCode(account.totpSecret).then((res) => {
        if (active) setTotpState(res);
      });
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [account?.id, account?.totpSecret]);

  const linkedApps = useMemo(() => {
    if (!account) return [];
    const normalizedEmail = account.emailAddress.trim().toLowerCase();
    return allAccounts.filter(
      (a) =>
        a.id !== account.id &&
        (a.parentEmailId === account.id ||
          (account.recordType === 'email' &&
            normalizedEmail &&
            a.recordType === 'app' &&
            a.emailAddress.trim().toLowerCase() === normalizedEmail))
    );
  }, [account, allAccounts]);

  const parentAccount = useMemo(() => {
    if (!account) return null;
    if (account.parentEmailId) {
      return allAccounts.find((a) => a.id === account.parentEmailId) || null;
    }
    const normalized = account.emailAddress.trim().toLowerCase();
    if (!normalized || account.recordType === 'email') return null;
    return (
      allAccounts.find(
        (a) => a.recordType === 'email' && a.emailAddress.trim().toLowerCase() === normalized
      ) || null
    );
  }, [account, allAccounts]);

  const filteredRegisteredSites = useMemo(() => {
    const list = account?.registeredSites || [];
    const q = siteSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter((s) =>
      `${s.name} ${s.url} ${s.username} ${s.displayName} ${s.phoneNumber} ${s.deviceUsed} ${s.notes}`
        .toLowerCase()
        .includes(q)
    );
  }, [account?.registeredSites, siteSearch]);

  if (!account) return null;

  const copyText = (value: string, key: string, isSecret = false, secretLabel = 'البيان') => {
    if (!value) return;
    if (isSecret && onCopySecret) {
      onCopySecret(value, secretLabel);
    } else {
      void navigator.clipboard.writeText(value);
    }
    setCopiedField(key);
    setTimeout(() => {
      setCopiedField((curr) => (curr === key ? null : curr));
    }, 1600);
  };

  const handleCopySummary = () => {
    const text = buildAccountTextSummary(account, linkedApps, false);
    copyText(text, 'account_summary');
  };

  const registeredAge = calculateAgeFromBirthdate(account.registeredBirthdate);
  const createdDuration = calculateAccountDuration(account.accountCreatedAt);
  const pwdEval = evaluatePasswordStrength(account.password);
  const passwordRisks = analyzePasswordRisks(account, realBirthdate);
  const completeness = getAccountFieldCompleteness(account);
  const totalLinkedEcosystem = linkedApps.length + (account.registeredSites?.length || 0);

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(account);
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  const resetQuickSiteForm = () => {
    setSitePresetKey('custom');
    setSiteName('');
    setSiteUrl('');
    setSiteMethod('oauth_button');
    setSiteUsername('');
    setSiteDisplayName('');
    setSitePassword('');
    setSitePhone('');
    setSitePin('');
    setSiteBirthdate('');
    setSiteCreatedDate('');
    setSiteApproxDate(false);
    setSiteTwoFactor(false);
    setSiteTwoFactorNote('');
    setSiteCardHint('');
    setSiteDeviceUsed('');
    setSiteSubCost('');
    setSiteRenewalDate('');
    setSiteNotes('');
  };

  const handleSaveQuickSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteName.trim()) return;
    setSavingSite(true);
    try {
      const newSite = createEmptySiteItem({
        name: siteName.trim(),
        platformKey: sitePresetKey,
        url: siteUrl.trim(),
        signupMethod: siteMethod,
        username: siteUsername.trim() || account.emailAddress || account.username,
        displayName: siteDisplayName.trim(),
        password: sitePassword,
        phoneNumber: sitePhone.trim(),
        pinCode: sitePin.trim(),
        registeredBirthdate: siteBirthdate || account.registeredBirthdate || realBirthdate || '',
        createdAtDate: siteCreatedDate || new Date().toISOString().slice(0, 10),
        isApproximateDate: siteApproxDate,
        twoFactorEnabled: siteTwoFactor,
        twoFactorNote: siteTwoFactorNote.trim(),
        linkedCardHint: siteCardHint.trim(),
        deviceUsed: siteDeviceUsed.trim(),
        subscriptionCost: siteSubCost.trim(),
        renewalDate: siteRenewalDate,
        notes: siteNotes.trim(),
      });
      await onAddQuickSite(account, newSite);
      resetQuickSiteForm();
      setShowQuickSiteForm(false);
    } finally {
      setSavingSite(false);
    }
  };

  const startEditSite = (site: RegisteredSiteItem) => {
    setEditingSiteId(site.id);
    setEditSiteDraft({ ...site });
  };

  const handleSaveEditSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSiteDraft || !editSiteDraft.name.trim()) return;
    setSavingEditSite(true);
    try {
      await onUpdateQuickSite(account, editSiteDraft);
      setEditingSiteId(null);
      setEditSiteDraft(null);
    } finally {
      setSavingEditSite(false);
    }
  };

  const renderCopyRow = (
    label: string,
    value: string,
    fieldKey: string,
    options?: { mono?: boolean; ltr?: boolean; secret?: boolean; revealed?: boolean; onToggleReveal?: () => void }
  ) => {
    if (!value) return null;
    const displayValue = options?.secret && !options?.revealed ? '••••••••••••' : value;

    return (
      <div className="py-2.5 flex items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 last:border-none">
        <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">{label}</span>
        <div className="flex items-center gap-2 min-w-0">
          <span
            dir={options?.ltr ? 'ltr' : undefined}
            className={`text-sm truncate ${options?.mono ? 'font-mono' : ''} text-slate-900 dark:text-slate-100`}
          >
            {displayValue}
          </span>
          {options?.secret && options.onToggleReveal && (
            <button
              type="button"
              onClick={options.onToggleReveal}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              aria-label={options.revealed ? 'إخفاء' : 'إظهار'}
            >
              {options.revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          )}
          <button
            type="button"
            onClick={() => copyText(value, fieldKey, Boolean(options?.secret), label)}
            className="p-1.5 rounded-md text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            aria-label={`نسخ ${label}`}
          >
            {copiedField === fieldKey ? (
              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-950/40 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 h-full flex flex-col shadow-2xl">
        {/* Top Bar */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <PlatformIcon platformKey={account.platformKey} recordType={account.recordType} size="md" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold truncate">{account.title}</h2>
                <button
                  type="button"
                  onClick={() => void onToggleFavorite(account)}
                  className="text-slate-400 hover:text-amber-500 transition-colors cursor-pointer"
                  aria-label="تفضيل الحساب"
                >
                  <Star
                    className={`w-4 h-4 ${
                      account.isFavorite ? 'fill-amber-400 text-amber-400' : ''
                    }`}
                  />
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <span>{account.recordType === 'email' ? 'بريد إلكتروني رئيسي' : 'حساب تطبيق / موقع'}</span>
                <span aria-hidden="true">·</span>
                <span>{CATEGORY_LABELS[account.category]}</span>
                {account.accountRegion && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{account.accountRegion}</span>
                  </>
                )}
                <span aria-hidden="true">·</span>
                <span>{STATUS_LABELS[account.status]}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onExportExcel && (
              <button
                type="button"
                onClick={() => onExportExcel(account, linkedApps)}
                title="تصدير هذا الحساب وكل المواقع المرتبطة به إلى ملف Excel"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>تصدير Excel</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleCopySummary}
              title="نسخ بطاقة تعريف الحساب بالكامل بدون أسرار"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {copiedField === 'account_summary' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>تم النسخ</span>
                </>
              ) : (
                <>
                  <FileText className="w-3.5 h-3.5" />
                  <span>نسخ الملخص</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => onEdit(account)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>تعديل</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              aria-label="إغلاق التفاصيل"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-7">
          {/* Quick Status & Completeness Summary */}
          <div className="grid grid-cols-3 gap-3 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 bg-slate-50/70 dark:bg-slate-800/30 text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400 block">اكتمال التفاصيل</span>
              <span className="font-mono font-bold tabular-nums text-sm">
                {completeness.filled} / {completeness.total} حقول
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block">المواقع والتطبيقات به</span>
              <span className="font-mono font-bold tabular-nums text-sm text-indigo-600 dark:text-indigo-400">
                {totalLinkedEcosystem} مرتبطة
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block">قوة كلمة المرور</span>
              <span className="font-bold text-sm">{account.password ? pwdEval.label : 'غير مسجلة'}</span>
            </div>
          </div>

          {/* Live 2FA Authenticator Code */}
          {totpState && (
            <section className="border border-emerald-200 dark:border-emerald-900 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                  <ShieldCheck className="w-4 h-4" />
                  <span>رمز المصادقة الثنائية الحي (2FA Authenticator)</span>
                </div>
                <span className="text-xs font-mono tabular-nums text-emerald-700 dark:text-emerald-300">
                  يتجدد خلال {totpState.remainingSeconds} ث
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-2xl font-mono font-bold tracking-widest tabular-nums text-slate-900 dark:text-white" dir="ltr">
                  {totpState.code.slice(0, 3)} {totpState.code.slice(3)}
                </span>
                <button
                  type="button"
                  onClick={() => copyText(totpState.code, 'totp_live', true, 'رمز 2FA')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                >
                  {copiedField === 'totp_live' ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>تم النسخ</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>نسخ الرمز</span>
                    </>
                  )}
                </button>
              </div>
              <div className="h-1 w-full bg-emerald-200/70 dark:bg-emerald-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-600 dark:bg-emerald-400 transition-all duration-1000"
                  style={{ width: `${(totpState.remainingSeconds / totpState.period) * 100}%` }}
                />
              </div>
            </section>
          )}

          {/* 1. Vital Dates Dossier */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>التواريخ الحيوية وسياق الإنشاء</span>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/70 dark:bg-slate-800/30 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <span className="block text-xs text-slate-500 dark:text-slate-400">
                    تاريخ الميلاد المسجّل
                  </span>
                  <p className="text-sm font-mono font-semibold tabular-nums" dir="ltr">
                    {formatReadableDate(account.registeredBirthdate)}
                  </p>
                  {registeredAge !== null && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                      العمر المسجل: {registeredAge} سنة
                    </p>
                  )}
                  {realBirthdate &&
                    account.registeredBirthdate &&
                    account.registeredBirthdate !== realBirthdate && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        مختلف عن ميلادك الحقيقي
                      </p>
                    )}
                </div>

                <div className="space-y-1">
                  <span className="block text-xs text-slate-500 dark:text-slate-400">
                    متى أنشأت الحساب؟
                  </span>
                  <p className="text-sm font-mono font-semibold tabular-nums" dir="ltr">
                    {formatReadableDate(account.accountCreatedAt)}
                    {account.createdDateApproximate && account.accountCreatedAt ? ' ~' : ''}
                  </p>
                  {createdDuration && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                      {createdDuration.label}
                      {account.createdDateApproximate ? ' (تاريخ تقريبي)' : ''}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <span className="block text-xs text-slate-500 dark:text-slate-400">
                    آخر تحديث لكلمة المرور
                  </span>
                  <p className="text-sm font-mono font-semibold tabular-nums" dir="ltr">
                    {formatReadableDate(account.lastPasswordChangedAt)}
                  </p>
                  {account.password && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                      {pwdEval.entropyBits} بت · كسر: {pwdEval.crackEstimate}
                    </p>
                  )}
                  {account.lastAccessedAt && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                      آخر دخول: <span className="font-mono" dir="ltr">{formatReadableDate(account.lastAccessedAt)}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-700/80">
                <div className="text-xs">
                  {account.creationContext && (
                    <>
                      <span className="text-slate-500 dark:text-slate-400">سياق الإنشاء: </span>
                      <span className="text-slate-800 dark:text-slate-200 font-medium">{account.creationContext}</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => void onMarkAccessedToday(account)}
                    className="px-2.5 py-1 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    تسجيل دخول اليوم
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRotatePwd(generateSecurePassword({ length: 18, uppercase: true, lowercase: true, numbers: true, symbols: true }));
                      setShowRotateForm((v) => !v);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>تدوير كلمة المرور</span>
                  </button>
                </div>
              </div>

              {showRotateForm && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!rotatePwd.trim()) return;
                    setRotatingPwd(true);
                    void onRotatePassword(account, rotatePwd, rotateNote).finally(() => {
                      setRotatingPwd(false);
                      setShowRotateForm(false);
                      setRotatePwd('');
                      setRotateNote('');
                    });
                  }}
                  className="p-3.5 rounded-lg border border-indigo-200 dark:border-indigo-900 bg-white dark:bg-slate-900 space-y-2.5"
                >
                  <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                    سيتم حفظ كلمة المرور الحالية في الأرشيف تلقائياً وتحديث التاريخ لليوم
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      dir="ltr"
                      required
                      value={rotatePwd}
                      onChange={(e) => setRotatePwd(e.target.value)}
                      placeholder="كلمة المرور الجديدة"
                      className="flex-1 px-2.5 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setRotatePwd(
                          generateSecurePassword({
                            length: 18,
                            uppercase: true,
                            lowercase: true,
                            numbers: true,
                            symbols: true,
                          })
                        )
                      }
                      className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      توليد تلقائي
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={rotateNote}
                      onChange={(e) => setRotateNote(e.target.value)}
                      placeholder="سبب التغيير (اختياري، مثل: تحديث دوري)"
                      className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                    />
                    <button
                      type="submit"
                      disabled={rotatingPwd}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-60 cursor-pointer"
                    >
                      {rotatingPwd ? 'جاري التحديث...' : 'اعتماد وحفظ'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </section>

          {/* 2. Full Credentials & Identity Matrix */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              بيانات الدخول والهوية التفصيلية
            </h3>
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl px-4 divide-y divide-slate-100 dark:divide-slate-800">
              {renderCopyRow('البريد الإلكتروني', account.emailAddress, 'email', { mono: true, ltr: true })}
              {renderCopyRow('اسم المستخدم', account.username, 'username', { mono: true, ltr: true })}
              {renderCopyRow('كلمة المرور', account.password, 'password', {
                mono: true,
                ltr: true,
                secret: true,
                revealed: revealPassword,
                onToggleReveal: () => setRevealPassword((v) => !v),
              })}
              {passwordRisks.length > 0 && (
                <div className="py-2 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                  <span>تنبيه أمان: كلمة المرور {passwordRisks.join(' · ')}</span>
                </div>
              )}
              {renderCopyRow('الاسم الكامل المسجّل', account.registeredFullName, 'fullName')}
              {renderCopyRow('الاسم الظاهر', account.displayName, 'displayName')}
              {account.registeredGender && account.registeredGender !== 'unspecified' && (
                <div className="py-2.5 flex items-center justify-between gap-4">
                  <span className="text-xs text-slate-500 dark:text-slate-400">الجنس المسجّل</span>
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                    {GENDER_LABELS[account.registeredGender]}
                  </span>
                </div>
              )}
              {renderCopyRow('الدولة / المتجر', account.accountRegion, 'region')}
              {renderCopyRow('معرّف الحساب (ID)', account.accountExternalId, 'extId', { mono: true, ltr: true })}
              {renderCopyRow('رقم الجوال', account.phoneNumber, 'phone', { mono: true, ltr: true })}
              {renderCopyRow('رمز PIN السريع', account.pinCode, 'pinCode', {
                mono: true,
                ltr: true,
                secret: true,
                revealed: revealPin,
                onToggleReveal: () => setRevealPin((v) => !v),
              })}
              {renderCopyRow('وسيلة الدفع المربوطة', account.linkedPaymentHint, 'paymentHint')}
              {renderCopyRow('بريد الفواتير والإيصالات', account.billingEmail, 'billingEmail', { mono: true, ltr: true })}
              {renderCopyRow('عنوان الفواتير / الرمز البريدي', account.billingAddressHint, 'billingAddr')}
              <div className="py-2.5 flex items-center justify-between gap-4">
                <span className="text-xs text-slate-500 dark:text-slate-400">طريقة الدخول</span>
                <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                  {LOGIN_METHOD_LABELS[account.loginMethod]}
                </span>
              </div>
              {account.websiteUrl && (
                <div className="py-2.5 flex items-center justify-between gap-4">
                  <span className="text-xs text-slate-500 dark:text-slate-400">الرابط</span>
                  <div className="flex items-center gap-2 min-w-0">
                    <a
                      href={
                        /^https?:\/\//i.test(account.websiteUrl)
                          ? account.websiteUrl
                          : `https://${account.websiteUrl}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        if (account.password && onCopySecret) {
                          onCopySecret(account.password, `كلمة مرور ${account.title}`);
                        }
                      }}
                      title="فتح الموقع ونسخ كلمة المرور تلقائياً"
                      className="inline-flex items-center gap-1.5 text-xs font-mono text-indigo-600 dark:text-indigo-400 hover:underline truncate"
                      dir="ltr"
                    >
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{account.websiteUrl}</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => copyText(account.websiteUrl, 'siteUrl')}
                      className="p-1 text-slate-400 hover:text-indigo-600 cursor-pointer"
                      aria-label="نسخ الرابط"
                    >
                      {copiedField === 'siteUrl' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {(account.customFields || []).map((cf) =>
                renderCopyRow(cf.label || 'حقل مخصص', cf.value, `cf_${cf.id}`, {
                  mono: true,
                  secret: cf.isSecret,
                  revealed: Boolean(revealedCustomFields[cf.id]),
                  onToggleReveal: cf.isSecret
                    ? () =>
                        setRevealedCustomFields((p) => ({
                          ...p,
                          [cf.id]: !p[cf.id],
                        }))
                    : undefined,
                })
              )}
            </div>
          </section>

          {/* 3. Parent Account Link (if linked to a parent) */}
          {parentAccount && (
            <section className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                الحساب الأب المرتبط به
              </h3>
              <button
                type="button"
                onClick={() => onSelectAccount(parentAccount)}
                className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 flex items-center justify-between gap-4 text-right transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <PlatformIcon platformKey={parentAccount.platformKey} recordType={parentAccount.recordType} size="sm" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{parentAccount.title}</p>
                    <p className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate" dir="ltr">
                      {parentAccount.emailAddress || parentAccount.username}
                    </p>
                  </div>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums shrink-0">
                  ميلاد الأب: {formatReadableDate(parentAccount.registeredBirthdate)}
                </div>
              </button>
            </section>
          )}

          {/* 4. UNIFIED ECOSYSTEM: Sites & Apps Created With This Account */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <Globe className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>المواقع والتطبيقات اللي سويتها بهذا الحساب ({totalLinkedEcosystem})</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowQuickSiteForm((v) => !v)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة موقع / تطبيق</span>
                </button>
                <button
                  type="button"
                  onClick={() => onAddLinkedApp(account)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>حساب تطبيق كامل</span>
                </button>
              </div>
            </div>

            {/* Expanded Inline Quick-Add Site Form */}
            {showQuickSiteForm && (
              <form
                onSubmit={(e) => void handleSaveQuickSite(e)}
                className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-3"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-xs text-slate-600 dark:text-slate-400">اختر منصة (اختياري)</label>
                    <select
                      value={sitePresetKey}
                      onChange={(e) => {
                        const p = getPresetByKey(e.target.value);
                        setSitePresetKey(p.key);
                        if (p.key !== 'custom') {
                          setSiteName(p.label);
                          setSiteUrl(p.defaultUrl);
                        }
                      }}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    >
                      {PLATFORM_PRESETS.map((p) => (
                        <option key={p.key} value={p.key}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs text-slate-600 dark:text-slate-400">اسم الموقع / التطبيق *</label>
                    <input
                      type="text"
                      required
                      value={siteName}
                      onChange={(e) => setSiteName(e.target.value)}
                      placeholder="مثال: Canva، ChatGPT، نون"
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs text-slate-600 dark:text-slate-400">طريقة التسجيل</label>
                    <select
                      value={siteMethod}
                      onChange={(e) => setSiteMethod(e.target.value as SiteSignupMethod)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    >
                      {(Object.keys(SITE_SIGNUP_METHOD_LABELS) as SiteSignupMethod[]).map((m) => (
                        <option key={m} value={m}>
                          {SITE_SIGNUP_METHOD_LABELS[m]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs text-slate-600 dark:text-slate-400">الرابط</label>
                    <input
                      type="text"
                      dir="ltr"
                      value={siteUrl}
                      onChange={(e) => setSiteUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs text-slate-600 dark:text-slate-400">اسم المستخدم في التطبيق (إن وجد)</label>
                    <input
                      type="text"
                      dir="ltr"
                      value={siteUsername}
                      onChange={(e) => setSiteUsername(e.target.value)}
                      placeholder={account.emailAddress || '@username'}
                      className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs text-slate-600 dark:text-slate-400">الاسم الظاهر بالتطبيق</label>
                    <input
                      type="text"
                      value={siteDisplayName}
                      onChange={(e) => setSiteDisplayName(e.target.value)}
                      placeholder="الاسم المعروض داخل التطبيق"
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs text-slate-600 dark:text-slate-400">كلمة مرور مخصصة (إن وُجدت)</label>
                    <input
                      type="text"
                      dir="ltr"
                      value={sitePassword}
                      onChange={(e) => setSitePassword(e.target.value)}
                      placeholder="اتركه فارغاً إن كان دخول مباشر"
                      className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs text-slate-600 dark:text-slate-400">رقم الجوال المسجّل بالتطبيق</label>
                    <input
                      type="text"
                      dir="ltr"
                      value={sitePhone}
                      onChange={(e) => setSitePhone(e.target.value)}
                      placeholder="+966 5..."
                      className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs text-slate-600 dark:text-slate-400">تاريخ الميلاد المسجّل به</label>
                    <input
                      type="date"
                      dir="ltr"
                      value={siteBirthdate}
                      onChange={(e) => setSiteBirthdate(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs text-slate-600 dark:text-slate-400">متى سويته؟ (تاريخ الإنشاء)</label>
                    <input
                      type="date"
                      dir="ltr"
                      value={siteCreatedDate}
                      onChange={(e) => setSiteCreatedDate(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs text-slate-600 dark:text-slate-400">رمز PIN / قفل التطبيق</label>
                    <input
                      type="text"
                      dir="ltr"
                      value={sitePin}
                      onChange={(e) => setSitePin(e.target.value)}
                      placeholder="مثال: 4820"
                      className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs text-slate-600 dark:text-slate-400">البطاقة / الدفع المربوط</label>
                    <input
                      type="text"
                      value={siteCardHint}
                      onChange={(e) => setSiteCardHint(e.target.value)}
                      placeholder="مثال: مدى *4821 أو Apple Pay"
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs text-slate-600 dark:text-slate-400">تكلفة الاشتراك (إن وجدت)</label>
                    <input
                      type="text"
                      value={siteSubCost}
                      onChange={(e) => setSiteSubCost(e.target.value)}
                      placeholder="مثال: 20 USD / شهر"
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs text-slate-600 dark:text-slate-400">تاريخ التجديد</label>
                    <input
                      type="date"
                      dir="ltr"
                      value={siteRenewalDate}
                      onChange={(e) => setSiteRenewalDate(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs text-slate-600 dark:text-slate-400">الجهاز المستخدم</label>
                    <input
                      type="text"
                      value={siteDeviceUsed}
                      onChange={(e) => setSiteDeviceUsed(e.target.value)}
                      placeholder="مثال: iPhone 15 Pro"
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div className="flex flex-col justify-end gap-2">
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={siteApproxDate}
                        onChange={(e) => setSiteApproxDate(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600"
                      />
                      <span>تاريخ الإنشاء تقريبي</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={siteTwoFactor}
                        onChange={(e) => setSiteTwoFactor(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600"
                      />
                      <span>التحقق بخطوتين (2FA) مفعّل</span>
                    </label>
                  </div>
                  {siteTwoFactor && (
                    <div className="sm:col-span-2 space-y-1">
                      <input
                        type="text"
                        value={siteTwoFactorNote}
                        onChange={(e) => setSiteTwoFactorNote(e.target.value)}
                        placeholder="طريقة 2FA (مثال: تطبيق Authenticator أو SMS)"
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    </div>
                  )}
                  <div className="sm:col-span-2 space-y-1">
                    <input
                      type="text"
                      value={siteNotes}
                      onChange={(e) => setSiteNotes(e.target.value)}
                      placeholder="ملاحظة مختصرة (مثلاً: باقة مجانية، عنوان التوصيل...)"
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      resetQuickSiteForm();
                      setShowQuickSiteForm(false);
                    }}
                    className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={savingSite}
                    className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-60 cursor-pointer"
                  >
                    {savingSite ? 'جاري الحفظ...' : 'حفظ الموقع في هذا الحساب'}
                  </button>
                </div>
              </form>
            )}

            {(account.registeredSites?.length || 0) > 2 && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={siteSearch}
                  onChange={(e) => setSiteSearch(e.target.value)}
                  placeholder="ابحث داخل المواقع والتطبيقات المرتبطة بهذا الحساب..."
                  className="w-full pr-9 pl-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60"
                />
              </div>
            )}

            {totalLinkedEcosystem === 0 ? (
              <div className="p-5 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  لم تسجّل أي مواقع أو تطبيقات منشأة بهذا الحساب بعد.
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-200 dark:divide-slate-800">
                {/* Full Child VaultAccounts */}
                {linkedApps.map((child) => {
                  const pwdOpen = Boolean(revealedChildPwds[child.id]);
                  const birthMismatch =
                    account.registeredBirthdate &&
                    child.registeredBirthdate &&
                    account.registeredBirthdate !== child.registeredBirthdate;
                  const childDur = calculateAccountDuration(child.accountCreatedAt);

                  return (
                    <div key={child.id} className="p-4 space-y-2 bg-slate-50/40 dark:bg-slate-800/20">
                      <div className="flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => onSelectAccount(child)}
                          className="flex items-center gap-3 min-w-0 text-right hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                        >
                          <PlatformIcon platformKey={child.platformKey} recordType={child.recordType} size="sm" />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">{child.title}</p>
                            <p className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate" dir="ltr">
                              {child.username || child.emailAddress} · سجل كامل
                            </p>
                          </div>
                        </button>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {child.password && (
                            <>
                              <span className="text-xs font-mono text-slate-700 dark:text-slate-300" dir="ltr">
                                {pwdOpen ? child.password : '••••••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setRevealedChildPwds((prev) => ({
                                    ...prev,
                                    [child.id]: !pwdOpen,
                                  }))
                                }
                                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                                aria-label="إظهار أو إخفاء كلمة المرور"
                              >
                                {pwdOpen ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => copyText(child.password, `child_${child.id}`, true, `كلمة مرور ${child.title}`)}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 cursor-pointer"
                                aria-label="نسخ كلمة المرور"
                              >
                                {copiedField === `child_${child.id}` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                        <span>
                          الميلاد: <strong className="font-mono text-slate-700 dark:text-slate-300">{formatReadableDate(child.registeredBirthdate)}</strong>
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          الإنشاء: <strong className="font-mono text-slate-700 dark:text-slate-300">{formatReadableDate(child.accountCreatedAt)}</strong>
                          {childDur ? ` (${childDur.label})` : ''}
                        </span>
                        {birthMismatch && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-amber-600 dark:text-amber-400">
                              تاريخ الميلاد مختلف عن الحساب الأب
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Registered Sites Created With This Account */}
                {filteredRegisteredSites.map((site) => {
                  const sPwdOpen = Boolean(revealedSitePwds[site.id]);
                  const sPinOpen = Boolean(revealedSitePins[site.id]);
                  const siteDur = calculateAccountDuration(site.createdAtDate);
                  const birthMismatch =
                    account.registeredBirthdate &&
                    site.registeredBirthdate &&
                    account.registeredBirthdate !== site.registeredBirthdate;
                  const isEditingThis = editingSiteId === site.id && editSiteDraft;

                  return (
                    <div key={site.id} className="p-4 space-y-2.5">
                      {isEditingThis && editSiteDraft ? (
                        <form onSubmit={(e) => void handleSaveEditSite(e)} className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                              تعديل تفاصيل: {site.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingSiteId(null);
                                setEditSiteDraft(null);
                              }}
                              className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                            >
                              إلغاء
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div className="space-y-1">
                              <label className="block text-xs text-slate-500">اسم الموقع / التطبيق</label>
                              <input
                                type="text"
                                required
                                value={editSiteDraft.name}
                                onChange={(e) => setEditSiteDraft({ ...editSiteDraft, name: e.target.value })}
                                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="block text-xs text-slate-500">طريقة التسجيل</label>
                              <select
                                value={editSiteDraft.signupMethod}
                                onChange={(e) =>
                                  setEditSiteDraft({
                                    ...editSiteDraft,
                                    signupMethod: e.target.value as SiteSignupMethod,
                                  })
                                }
                                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                              >
                                {(Object.keys(SITE_SIGNUP_METHOD_LABELS) as SiteSignupMethod[]).map((m) => (
                                  <option key={m} value={m}>
                                    {SITE_SIGNUP_METHOD_LABELS[m]}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="block text-xs text-slate-500">اسم المستخدم في التطبيق</label>
                              <input
                                type="text"
                                dir="ltr"
                                value={editSiteDraft.username}
                                onChange={(e) => setEditSiteDraft({ ...editSiteDraft, username: e.target.value })}
                                className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="block text-xs text-slate-500">الاسم الظاهر</label>
                              <input
                                type="text"
                                value={editSiteDraft.displayName}
                                onChange={(e) => setEditSiteDraft({ ...editSiteDraft, displayName: e.target.value })}
                                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="block text-xs text-slate-500">تاريخ الميلاد بالموقع</label>
                              <input
                                type="date"
                                dir="ltr"
                                value={editSiteDraft.registeredBirthdate}
                                onChange={(e) =>
                                  setEditSiteDraft({ ...editSiteDraft, registeredBirthdate: e.target.value })
                                }
                                className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="block text-xs text-slate-500">تاريخ الإنشاء</label>
                              <input
                                type="date"
                                dir="ltr"
                                value={editSiteDraft.createdAtDate}
                                onChange={(e) =>
                                  setEditSiteDraft({ ...editSiteDraft, createdAtDate: e.target.value })
                                }
                                className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="block text-xs text-slate-500">رقم الجوال</label>
                              <input
                                type="text"
                                dir="ltr"
                                value={editSiteDraft.phoneNumber}
                                onChange={(e) => setEditSiteDraft({ ...editSiteDraft, phoneNumber: e.target.value })}
                                className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="block text-xs text-slate-500">كلمة المرور المخصصة</label>
                              <input
                                type="text"
                                dir="ltr"
                                value={editSiteDraft.password}
                                onChange={(e) => setEditSiteDraft({ ...editSiteDraft, password: e.target.value })}
                                className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="block text-xs text-slate-500">رمز PIN</label>
                              <input
                                type="text"
                                dir="ltr"
                                value={editSiteDraft.pinCode}
                                onChange={(e) => setEditSiteDraft({ ...editSiteDraft, pinCode: e.target.value })}
                                className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="block text-xs text-slate-500">الجهاز المستخدم</label>
                              <input
                                type="text"
                                value={editSiteDraft.deviceUsed}
                                onChange={(e) => setEditSiteDraft({ ...editSiteDraft, deviceUsed: e.target.value })}
                                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="block text-xs text-slate-500">البطاقة المربوطة</label>
                              <input
                                type="text"
                                value={editSiteDraft.linkedCardHint}
                                onChange={(e) => setEditSiteDraft({ ...editSiteDraft, linkedCardHint: e.target.value })}
                                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="block text-xs text-slate-500">الاشتراك / التجديد</label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={editSiteDraft.subscriptionCost}
                                  onChange={(e) =>
                                    setEditSiteDraft({ ...editSiteDraft, subscriptionCost: e.target.value })
                                  }
                                  placeholder="التكلفة"
                                  className="w-1/2 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                                />
                                <input
                                  type="date"
                                  dir="ltr"
                                  value={editSiteDraft.renewalDate}
                                  onChange={(e) =>
                                    setEditSiteDraft({ ...editSiteDraft, renewalDate: e.target.value })
                                  }
                                  className="w-1/2 px-2 py-1.5 text-xs font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                                />
                              </div>
                            </div>
                            <div className="sm:col-span-2 flex flex-wrap gap-4 pt-1">
                              <label className="flex items-center gap-2 text-xs cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={editSiteDraft.isApproximateDate}
                                  onChange={(e) =>
                                    setEditSiteDraft({ ...editSiteDraft, isApproximateDate: e.target.checked })
                                  }
                                  className="rounded border-slate-300 text-indigo-600"
                                />
                                <span>تاريخ الإنشاء تقريبي</span>
                              </label>
                              <label className="flex items-center gap-2 text-xs cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={editSiteDraft.twoFactorEnabled}
                                  onChange={(e) =>
                                    setEditSiteDraft({ ...editSiteDraft, twoFactorEnabled: e.target.checked })
                                  }
                                  className="rounded border-slate-300 text-indigo-600"
                                />
                                <span>2FA مفعّل</span>
                              </label>
                            </div>
                            <div className="sm:col-span-2 space-y-1">
                              <input
                                type="text"
                                value={editSiteDraft.notes}
                                onChange={(e) => setEditSiteDraft({ ...editSiteDraft, notes: e.target.value })}
                                placeholder="ملاحظات..."
                                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end gap-2">
                            <button
                              type="submit"
                              disabled={savingEditSite}
                              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-60 cursor-pointer"
                            >
                              {savingEditSite ? 'جاري التحديث...' : 'حفظ التعديلات'}
                            </button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <PlatformIcon platformKey={site.platformKey} recordType="app" size="sm" />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-semibold truncate">{site.name}</p>
                                  <span className="text-xs text-slate-400">· {SITE_STATUS_LABELS[site.status]}</span>
                                  {site.twoFactorEnabled && (
                                    <ShieldCheck
                                      className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0"
                                      aria-label="محمي بالتحقق بخطوتين"
                                    />
                                  )}
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                  {SITE_SIGNUP_METHOD_LABELS[site.signupMethod]}
                                  {site.displayName ? ` · الاسم: ${site.displayName}` : ''}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => startEditSite(site)}
                                title="تعديل تفاصيل هذا الموقع"
                                className="p-1.5 text-slate-400 hover:text-indigo-600 cursor-pointer"
                                aria-label="تعديل الموقع"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => void onPromoteSiteToAccount(account, site)}
                                title="ترقية إلى حساب كامل مستقل في الخزنة"
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 cursor-pointer"
                              >
                                <ArrowUpRight className="w-3 h-3" />
                                <span>ترقية</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => void onRemoveQuickSite(account, site.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                                aria-label="حذف الموقع"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Username & Phone Quick Row */}
                          {(site.username || site.phoneNumber) && (
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                              {site.username && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-slate-500">المستخدم:</span>
                                  <span className="font-mono text-slate-800 dark:text-slate-200" dir="ltr">
                                    {site.username}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => copyText(site.username, `siteuser_${site.id}`)}
                                    className="p-0.5 text-slate-400 hover:text-indigo-600 cursor-pointer"
                                    aria-label="نسخ اسم المستخدم"
                                  >
                                    {copiedField === `siteuser_${site.id}` ? (
                                      <Check className="w-3 h-3 text-emerald-600" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                              )}
                              {site.phoneNumber && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-slate-500">الجوال:</span>
                                  <span className="font-mono text-slate-700 dark:text-slate-300" dir="ltr">
                                    {site.phoneNumber}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}

                          {site.password && (
                            <div className="flex items-center justify-between gap-2 text-xs px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                              <span className="text-slate-500">كلمة المرور بالموقع:</span>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono" dir="ltr">
                                  {sPwdOpen ? site.password : '••••••••'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setRevealedSitePwds((p) => ({ ...p, [site.id]: !sPwdOpen }))
                                  }
                                  className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                                  aria-label="إظهار"
                                >
                                  {sPwdOpen ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    copyText(site.password, `sitepwd_${site.id}`, true, `كلمة مرور ${site.name}`)
                                  }
                                  className="p-1 text-slate-400 hover:text-indigo-600 cursor-pointer"
                                  aria-label="نسخ"
                                >
                                  {copiedField === `sitepwd_${site.id}` ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </div>
                          )}

                          {site.pinCode && (
                            <div className="flex items-center justify-between gap-2 text-xs px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                              <span className="text-slate-500">رمز PIN بالتطبيق:</span>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono" dir="ltr">
                                  {sPinOpen ? site.pinCode : '••••'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setRevealedSitePins((p) => ({ ...p, [site.id]: !sPinOpen }))
                                  }
                                  className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                                  aria-label="إظهار PIN"
                                >
                                  {sPinOpen ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => copyText(site.pinCode, `sitepin_${site.id}`, true, `PIN ${site.name}`)}
                                  className="p-1 text-slate-400 hover:text-indigo-600 cursor-pointer"
                                  aria-label="نسخ PIN"
                                >
                                  {copiedField === `sitepin_${site.id}` ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </div>
                          )}

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                            {site.url && (
                              <>
                                <span className="font-mono text-indigo-600 dark:text-indigo-400 truncate max-w-[180px]" dir="ltr">
                                  {site.url}
                                </span>
                                <span aria-hidden="true">·</span>
                              </>
                            )}
                            <span>
                              الميلاد:{' '}
                              <strong className="font-mono text-slate-700 dark:text-slate-300">
                                {formatReadableDate(site.registeredBirthdate)}
                              </strong>
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>
                              الإنشاء:{' '}
                              <strong className="font-mono text-slate-700 dark:text-slate-300">
                                {formatReadableDate(site.createdAtDate)}
                                {site.isApproximateDate && site.createdAtDate ? ' (تقريبي)' : ''}
                              </strong>
                              {siteDur ? ` · ${siteDur.label}` : ''}
                            </span>
                            {birthMismatch && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="text-amber-600 dark:text-amber-400">
                                  ميلاد مختلف عن الحساب الأب
                                </span>
                              </>
                            )}
                          </div>

                          {(site.deviceUsed || site.linkedCardHint || site.subscriptionCost || site.twoFactorNote) && (
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                              {site.deviceUsed && <span>الجهاز: {site.deviceUsed}</span>}
                              {site.linkedCardHint && <span>· الدفع: {site.linkedCardHint}</span>}
                              {site.subscriptionCost && (
                                <span>
                                  · الاشتراك: {site.subscriptionCost}
                                  {site.renewalDate ? ` (يجدد ${formatReadableDate(site.renewalDate)})` : ''}
                                </span>
                              )}
                              {site.twoFactorNote && <span>· 2FA: {site.twoFactorNote}</span>}
                            </div>
                          )}

                          {site.notes && (
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                              {site.notes}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* 5. Timeline Events */}
          {account.timelineEvents && account.timelineEvents.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>سجل أحداث الحساب</span>
              </div>
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800">
                {account.timelineEvents.map((ev) => (
                  <div key={ev.id} className="px-4 py-2.5 flex items-center justify-between gap-3 text-xs">
                    <span className="text-slate-800 dark:text-slate-200 font-medium">{ev.title}</span>
                    <span className="font-mono tabular-nums text-slate-500 shrink-0" dir="ltr">
                      {formatReadableDate(ev.date)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 6. Security, Passkey, Recovery, Backup Codes & Password History */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              الأمان والمفاتيح والاسترداد وسجل كلمات المرور
            </h3>
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500 dark:text-slate-400">التحقق بخطوتين (2FA)</span>
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                    account.twoFactorEnabled
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {account.twoFactorEnabled ? (
                    <ShieldCheck className="w-4 h-4" />
                  ) : (
                    <ShieldAlert className="w-4 h-4" />
                  )}
                  <span>{TWO_FACTOR_LABELS[account.twoFactorMethod]}</span>
                </span>
              </div>

              {(account.passkeyEnabled || account.biometricDevice) && (
                <div className="flex items-center justify-between gap-3 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>مفتاح المرور / البصمة (Passkey)</span>
                  </span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">
                    {account.passkeyEnabled ? 'مفعّل' : 'جهاز موثق'}
                    {account.biometricDevice ? ` · ${account.biometricDevice}` : ''}
                  </span>
                </div>
              )}

              {renderCopyRow('بريد الاسترداد', account.recoveryEmail, 'recEmail', { mono: true, ltr: true })}
              {renderCopyRow('جوال الاسترداد', account.recoveryPhone, 'recPhone', { mono: true, ltr: true })}
              {renderCopyRow('جهة اتصال الاسترداد', account.recoveryContactPerson, 'recContact')}

              {account.backupCodes && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      رموز الاسترداد الاحتياطية
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setRevealBackup((v) => !v)}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                      >
                        {revealBackup ? 'إخفاء' : 'إظهار'}
                      </button>
                      <button
                        type="button"
                        onClick={() => copyText(account.backupCodes, 'backupCodes', true, 'رموز الاسترداد')}
                        className="text-xs text-slate-500 hover:text-indigo-600 cursor-pointer"
                      >
                        {copiedField === 'backupCodes' ? 'تم النسخ' : 'نسخ'}
                      </button>
                    </div>
                  </div>
                  <pre
                    dir="ltr"
                    className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/70 text-xs font-mono text-slate-700 dark:text-slate-300 whitespace-pre-wrap"
                  >
                    {revealBackup ? account.backupCodes : '••••-••••\n••••-••••'}
                  </pre>
                </div>
              )}

              {account.securityQuestions && account.securityQuestions.length > 0 && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <span className="block text-xs text-slate-500 dark:text-slate-400">
                    أسئلة الأمان ({account.securityQuestions.length})
                  </span>
                  <div className="space-y-2">
                    {account.securityQuestions.map((sq, idx) => {
                      const open = Boolean(revealedAnswers[idx]);
                      return (
                        <div
                          key={idx}
                          className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0 space-y-0.5">
                            <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                              {sq.question}
                            </p>
                            <p className="text-xs font-mono text-slate-600 dark:text-slate-400">
                              {open ? sq.answer : '••••••••'}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                setRevealedAnswers((prev) => ({ ...prev, [idx]: !open }))
                              }
                              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                              aria-label="إظهار الإجابة"
                            >
                              {open ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => copyText(sq.answer, `sq_${idx}`, true, 'إجابة سؤال الأمان')}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 cursor-pointer"
                              aria-label="نسخ الإجابة"
                            >
                              {copiedField === `sq_${idx}` ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {account.passwordHistory && account.passwordHistory.length > 0 && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <History className="w-3.5 h-3.5" />
                    <span>سجل كلمات المرور السابقة ({account.passwordHistory.length})</span>
                  </div>
                  <div className="space-y-1.5">
                    {account.passwordHistory.map((item, idx) => {
                      const open = Boolean(revealedHistoryPwds[idx]);
                      return (
                        <div
                          key={idx}
                          className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0 space-y-0.5">
                            <p className="font-mono text-slate-800 dark:text-slate-200" dir="ltr">
                              {open ? item.password : '••••••••••••'}
                            </p>
                            <p className="text-slate-500 tabular-nums">
                              {formatReadableDate(item.changedAt)}
                              {item.note ? ` · ${item.note}` : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                setRevealedHistoryPwds((p) => ({ ...p, [idx]: !open }))
                              }
                              className="p-1.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                              aria-label="إظهار"
                            >
                              {open ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => copyText(item.password, `hist_${idx}`, true, 'كلمة مرور سابقة')}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 cursor-pointer"
                              aria-label="نسخ"
                            >
                              {copiedField === `hist_${idx}` ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {account.emergencyInstructions && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="block text-xs text-amber-700 dark:text-amber-400 font-medium mb-1">
                    خطة الطوارئ عند فقدان الحساب
                  </span>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {account.emergencyInstructions}
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* 7. Devices, Subscription & Notes */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              الأجهزة والاشتراك والملاحظات
            </h3>
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500 dark:text-slate-400">الاشتراك</span>
                <span className="font-medium tabular-nums">
                  {SUBSCRIPTION_LABELS[account.subscriptionStatus]}
                  {account.subscriptionAmount > 0
                    ? ` · ${account.subscriptionAmount} ${CURRENCY_LABELS[account.subscriptionCurrency]}`
                    : account.subscriptionCost
                      ? ` · ${account.subscriptionCost}`
                      : ''}
                  {(account.subscriptionStatus === 'monthly' || account.subscriptionStatus === 'yearly') &&
                    ` · ${account.autoRenew ? 'تجديد تلقائي' : 'تجديد يدوي'}`}
                </span>
              </div>
              {account.renewalDate && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">تاريخ التجديد</span>
                  <span className="font-mono tabular-nums" dir="ltr">
                    {formatReadableDate(account.renewalDate)}
                  </span>
                </div>
              )}
              {account.primaryDevice && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">الجهاز الأساسي</span>
                  <span className="font-medium">{account.primaryDevice}</span>
                </div>
              )}
              {account.trustedDevices && account.trustedDevices.length > 0 && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
                  <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>الأجهزة الموثوقة</span>
                  </span>
                  <p className="text-slate-800 dark:text-slate-200 leading-relaxed">
                    {account.trustedDevices.join(' · ')}
                  </p>
                </div>
              )}
              {account.notes && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="block text-slate-500 dark:text-slate-400 mb-1">الملاحظات</span>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {account.notes}
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Bottom Danger / Delete Zone */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex items-center justify-between gap-4">
          {!confirmDelete ? (
            <>
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>حذف هذا السجل</span>
              </button>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onDuplicateAccount(account)}
                  className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  تكرار كحساب جديد
                </button>
                <button
                  type="button"
                  onClick={() => onEdit(account, 'sites')}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  إدارة المواقع والتفاصيل
                </button>
              </div>
            </>
          ) : (
            <div className="w-full flex items-center justify-between gap-3">
              <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                {linkedApps.length > 0
                  ? `سيتم فك ارتباط ${linkedApps.length} حساب مرتبط وحذف السجل نهائياً.`
                  : 'تأكيد الحذف النهائي؟'}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
                >
                  تراجع
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => void handleConfirmDelete()}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-60 cursor-pointer"
                >
                  {deleting ? 'جاري الحذف...' : 'نعم، احذف'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
