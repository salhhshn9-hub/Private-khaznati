import React, { useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  Globe,
  Plus,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { RegisteredSiteItem, SiteSignupMethod, VaultAccount } from '../types/vault';
import {
  PLATFORM_PRESETS,
  SITE_SIGNUP_METHOD_LABELS,
  SITE_STATUS_LABELS,
  calculateAccountDuration,
  createEmptySiteItem,
  formatReadableDate,
  getPresetByKey,
} from '../utils/vaultHelpers';
import { PlatformIcon } from './PlatformIcon';

interface SitesDirectoryViewProps {
  accounts: VaultAccount[];
  realBirthdate: string;
  onSelectAccount: (acc: VaultAccount) => void;
  onAddQuickSite: (parentAccount: VaultAccount, site: RegisteredSiteItem) => Promise<void>;
  onCopySecret?: (value: string, label: string) => void;
}

interface UnifiedSiteEntry {
  id: string;
  kind: 'site' | 'standalone_app';
  name: string;
  platformKey: string;
  url: string;
  username: string;
  displayName: string;
  password: string;
  phoneNumber: string;
  registeredBirthdate: string;
  createdAtDate: string;
  isApproximateDate: boolean;
  twoFactorEnabled: boolean;
  signupLabel: string;
  signupKey: SiteSignupMethod | 'standalone';
  statusLabel: string;
  parentAccount: VaultAccount;
  openTargetAccount: VaultAccount;
  birthMismatch: boolean;
  notes: string;
}

export const SitesDirectoryView: React.FC<SitesDirectoryViewProps> = ({
  accounts,
  realBirthdate,
  onSelectAccount,
  onAddQuickSite,
  onCopySecret,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [parentFilter, setParentFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [mismatchOnly, setMismatchOnly] = useState(false);

  const [revealedPwds, setRevealedPwds] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Quick Add Bar
  const [showAddForm, setShowAddForm] = useState(false);
  const [targetParentId, setTargetParentId] = useState<string>(() => {
    const firstEmail = accounts.find((a) => a.recordType === 'email');
    return firstEmail?.id || accounts[0]?.id || '';
  });
  const [presetKey, setPresetKey] = useState('custom');
  const [siteName, setSiteName] = useState('');
  const [siteUrl, setSiteUrl] = useState('');
  const [signupMethod, setSignupMethod] = useState<SiteSignupMethod>('oauth_button');
  const [siteUsername, setSiteUsername] = useState('');
  const [siteDisplayName, setSiteDisplayName] = useState('');
  const [siteBirthdate, setSiteBirthdate] = useState('');
  const [siteCreatedAt, setSiteCreatedAt] = useState('');
  const [siteApprox, setSiteApprox] = useState(false);
  const [sitePhone, setSitePhone] = useState('');
  const [siteNotes, setSiteNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const accountById = useMemo(() => {
    const map = new Map<string, VaultAccount>();
    accounts.forEach((a) => map.set(a.id, a));
    return map;
  }, [accounts]);

  const emailLookup = useMemo(() => {
    const map = new Map<string, VaultAccount>();
    accounts
      .filter((a) => a.recordType === 'email' && a.emailAddress.trim())
      .forEach((a) => map.set(a.emailAddress.trim().toLowerCase(), a));
    return map;
  }, [accounts]);

  const allEntries = useMemo<UnifiedSiteEntry[]>(() => {
    const list: UnifiedSiteEntry[] = [];

    for (const acc of accounts) {
      // 1. Standalone app VaultAccount
      if (acc.recordType === 'app') {
        const parent =
          (acc.parentEmailId ? accountById.get(acc.parentEmailId) : undefined) ||
          (acc.emailAddress ? emailLookup.get(acc.emailAddress.trim().toLowerCase()) : undefined) ||
          acc;
        const compareDate = parent.id !== acc.id ? parent.registeredBirthdate : realBirthdate;
        const birthMismatch = Boolean(
          acc.registeredBirthdate && compareDate && acc.registeredBirthdate !== compareDate
        );

        list.push({
          id: `app_${acc.id}`,
          kind: 'standalone_app',
          name: acc.title,
          platformKey: acc.platformKey,
          url: acc.websiteUrl,
          username: acc.username,
          displayName: acc.displayName,
          password: acc.password,
          phoneNumber: acc.phoneNumber,
          registeredBirthdate: acc.registeredBirthdate,
          createdAtDate: acc.accountCreatedAt,
          isApproximateDate: acc.createdDateApproximate,
          twoFactorEnabled: acc.twoFactorEnabled,
          signupLabel: 'حساب تطبيق مستقل',
          signupKey: 'standalone',
          statusLabel: acc.status === 'active' ? 'نشط' : 'يحتاج متابعة',
          parentAccount: parent,
          openTargetAccount: acc,
          birthMismatch,
          notes: acc.notes,
        });
      }

      // 2. Registered sites inside any account
      for (const site of acc.registeredSites || []) {
        const compareDate = acc.registeredBirthdate || realBirthdate;
        const birthMismatch = Boolean(
          site.registeredBirthdate && compareDate && site.registeredBirthdate !== compareDate
        );

        list.push({
          id: `site_${acc.id}_${site.id}`,
          kind: 'site',
          name: site.name,
          platformKey: site.platformKey || 'custom',
          url: site.url,
          username: site.username,
          displayName: site.displayName,
          password: site.password,
          phoneNumber: site.phoneNumber,
          registeredBirthdate: site.registeredBirthdate,
          createdAtDate: site.createdAtDate,
          isApproximateDate: site.isApproximateDate,
          twoFactorEnabled: site.twoFactorEnabled,
          signupLabel: SITE_SIGNUP_METHOD_LABELS[site.signupMethod],
          signupKey: site.signupMethod,
          statusLabel: SITE_STATUS_LABELS[site.status],
          parentAccount: acc,
          openTargetAccount: acc,
          birthMismatch,
          notes: site.notes,
        });
      }
    }

    return list.sort((a, b) => (b.createdAtDate || '').localeCompare(a.createdAtDate || ''));
  }, [accounts, accountById, emailLookup, realBirthdate]);

  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allEntries.filter((item) => {
      if (parentFilter !== 'all' && item.parentAccount.id !== parentFilter) return false;
      if (methodFilter !== 'all' && item.signupKey !== methodFilter) return false;
      if (mismatchOnly && !item.birthMismatch) return false;
      if (q) {
        const hay = [
          item.name,
          item.url,
          item.username,
          item.displayName,
          item.phoneNumber,
          item.parentAccount.title,
          item.parentAccount.emailAddress,
          item.notes,
          item.registeredBirthdate,
          item.createdAtDate,
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allEntries, parentFilter, methodFilter, mismatchOnly, searchQuery]);

  const handleCopy = (value: string, key: string, isSecret = false, label = '') => {
    if (!value) return;
    if (isSecret && onCopySecret) {
      onCopySecret(value, label || 'كلمة المرور');
    } else {
      void navigator.clipboard.writeText(value);
    }
    setCopiedId(key);
    setTimeout(() => setCopiedId((c) => (c === key ? null : c)), 1500);
  };

  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parent = accountById.get(targetParentId) || accounts[0];
    if (!parent || !siteName.trim()) return;
    setSaving(true);
    try {
      const item = createEmptySiteItem({
        name: siteName.trim(),
        platformKey: presetKey,
        url: siteUrl.trim(),
        signupMethod,
        username: siteUsername.trim() || parent.emailAddress || parent.username,
        displayName: siteDisplayName.trim(),
        registeredBirthdate: siteBirthdate || parent.registeredBirthdate || realBirthdate || '',
        createdAtDate: siteCreatedAt || new Date().toISOString().slice(0, 10),
        isApproximateDate: siteApprox,
        phoneNumber: sitePhone.trim(),
        notes: siteNotes.trim(),
      });
      await onAddQuickSite(parent, item);
      setPresetKey('custom');
      setSiteName('');
      setSiteUrl('');
      setSiteUsername('');
      setSiteDisplayName('');
      setSiteBirthdate('');
      setSiteCreatedAt('');
      setSiteApprox(false);
      setSitePhone('');
      setSiteNotes('');
      setShowAddForm(false);
    } finally {
      setSaving(false);
    }
  };

  const orderedParents = useMemo(() => {
    const emails = accounts.filter((a) => a.recordType === 'email');
    const apps = accounts.filter((a) => a.recordType !== 'email');
    return [...emails, ...apps];
  }, [accounts]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold">دليل المواقع والتطبيقات الشامل</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            جدول موحّد يوضح كل موقع أو تطبيق أنشأته، وبأي حساب، واسم المستخدم، وتاريخ الميلاد، ومتى سويته
          </p>
        </div>

        {accounts.length > 0 && (
          <button
            type="button"
            onClick={() => setShowAddForm((v) => !v)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة موقع أو تطبيق سريعاً</span>
          </button>
        )}
      </div>

      {/* Quick Add Site Form */}
      {showAddForm && orderedParents.length > 0 && (
        <form
          onSubmit={(e) => void handleQuickAddSubmit(e)}
          className="bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900 rounded-xl p-5 space-y-4"
        >
          <h3 className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
            تسجيل موقع أو تطبيق جديد تحت أحد حساباتك
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="block text-xs text-slate-600 dark:text-slate-400">الحساب / الإيميل الأب *</label>
              <select
                value={targetParentId || orderedParents[0]?.id}
                onChange={(e) => setTargetParentId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                {orderedParents.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.title} ({acc.emailAddress || acc.username})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-xs text-slate-600 dark:text-slate-400">اختر منصة جاهزة</label>
              <select
                value={presetKey}
                onChange={(e) => {
                  const p = getPresetByKey(e.target.value);
                  setPresetKey(p.key);
                  if (p.key !== 'custom') {
                    setSiteName(p.label);
                    setSiteUrl(p.defaultUrl);
                  }
                }}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
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
                placeholder="مثال: شاهد، أبشر، تيك توك..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs text-slate-600 dark:text-slate-400">اسم المستخدم في التطبيق</label>
              <input
                type="text"
                dir="ltr"
                value={siteUsername}
                onChange={(e) => setSiteUsername(e.target.value)}
                placeholder="@username"
                className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs text-slate-600 dark:text-slate-400">الاسم الظاهر بالتطبيق</label>
              <input
                type="text"
                value={siteDisplayName}
                onChange={(e) => setSiteDisplayName(e.target.value)}
                placeholder="الاسم المعروض"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs text-slate-600 dark:text-slate-400">طريقة التسجيل</label>
              <select
                value={signupMethod}
                onChange={(e) => setSignupMethod(e.target.value as SiteSignupMethod)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                {(Object.keys(SITE_SIGNUP_METHOD_LABELS) as SiteSignupMethod[]).map((m) => (
                  <option key={m} value={m}>
                    {SITE_SIGNUP_METHOD_LABELS[m]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-xs text-slate-600 dark:text-slate-400">تاريخ الميلاد في التطبيق</label>
              <input
                type="date"
                dir="ltr"
                value={siteBirthdate}
                onChange={(e) => setSiteBirthdate(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs text-slate-600 dark:text-slate-400">متى سويته؟ (تاريخ الإنشاء)</label>
              <input
                type="date"
                dir="ltr"
                value={siteCreatedAt}
                onChange={(e) => setSiteCreatedAt(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs text-slate-600 dark:text-slate-400">رقم الجوال المسجّل (إن وجد)</label>
              <input
                type="text"
                dir="ltr"
                value={sitePhone}
                onChange={(e) => setSitePhone(e.target.value)}
                placeholder="+966 5..."
                className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <label className="block text-xs text-slate-600 dark:text-slate-400">ملاحظة</label>
              <input
                type="text"
                value={siteNotes}
                onChange={(e) => setSiteNotes(e.target.value)}
                placeholder="تفاصيل إضافية (مثال: جهاز الإنشاء، باقة الاشتراك...)"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={siteApprox}
                  onChange={(e) => setSiteApprox(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600"
                />
                <span>تاريخ الإنشاء تقريبي</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3.5 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-60 cursor-pointer"
            >
              {saving ? 'جاري الحفظ...' : 'حفظ الموقع'}
            </button>
          </div>
        </form>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث باسم التطبيق، اسم المستخدم، الإيميل الأب، التاريخ..."
            className="w-full pr-10 pl-4 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={parentFilter}
            onChange={(e) => setParentFilter(e.target.value)}
            aria-label="تصفية حسب الحساب الأب"
            className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
          >
            <option value="all">كل الحسابات الأب ({orderedParents.length})</option>
            {orderedParents.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.title}
              </option>
            ))}
          </select>

          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            aria-label="تصفية حسب طريقة التسجيل"
            className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
          >
            <option value="all">كل طرق التسجيل</option>
            <option value="standalone">حساب تطبيق مستقل</option>
            {(Object.keys(SITE_SIGNUP_METHOD_LABELS) as SiteSignupMethod[]).map((m) => (
              <option key={m} value={m}>
                {SITE_SIGNUP_METHOD_LABELS[m]}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setMismatchOnly((v) => !v)}
            className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              mismatchOnly
                ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300'
            }`}
          >
            تواريخ ميلاد مختلفة فقط
          </button>
        </div>
      </div>

      {/* Directory Table */}
      {filteredEntries.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center space-y-2">
          <Globe className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-sm font-semibold">لا توجد مواقع أو تطبيقات مطابقة</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            أضف تطبيقاتك ومواقعك داخل أي بريد إلكتروني لتظهر هنا مع اسم المستخدم وتاريخ الإنشاء والميلاد.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="py-3 px-4 font-semibold">الموقع / التطبيق</th>
                  <th className="py-3 px-4 font-semibold">الحساب / الإيميل الأب</th>
                  <th className="py-3 px-4 font-semibold">اسم المستخدم بالتطبيق</th>
                  <th className="py-3 px-4 font-semibold">الميلاد المسجّل</th>
                  <th className="py-3 px-4 font-semibold">متى سويته؟</th>
                  <th className="py-3 px-4 font-semibold">كلمة المرور / الأمان</th>
                  <th className="py-3 px-4 font-semibold">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredEntries.map((item) => {
                  const dur = calculateAccountDuration(item.createdAtDate);
                  const pwdOpen = Boolean(revealedPwds[item.id]);

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <PlatformIcon platformKey={item.platformKey} recordType="app" size="sm" />
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[160px]">
                              {item.name}
                            </p>
                            <p className="text-slate-400 truncate max-w-[180px]">
                              {item.signupLabel}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <button
                            type="button"
                            onClick={() => onSelectAccount(item.parentAccount)}
                            className="text-right hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer min-w-0"
                          >
                            <p className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[150px]">
                              {item.parentAccount.title}
                            </p>
                            {item.parentAccount.emailAddress && (
                              <p className="font-mono text-slate-500 truncate max-w-[160px]" dir="ltr">
                                {item.parentAccount.emailAddress}
                              </p>
                            )}
                          </button>
                          {item.parentAccount.emailAddress && (
                            <button
                              type="button"
                              onClick={() =>
                                handleCopy(item.parentAccount.emailAddress, `em_${item.id}`)
                              }
                              className="p-1 text-slate-400 hover:text-indigo-600 cursor-pointer shrink-0"
                              aria-label="نسخ بريد الحساب الأب"
                            >
                              {copiedId === `em_${item.id}` ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {item.username ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-slate-800 dark:text-slate-200 truncate max-w-[140px]" dir="ltr">
                              {item.username}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(item.username, `un_${item.id}`)}
                              className="p-1 text-slate-400 hover:text-indigo-600 cursor-pointer shrink-0"
                              aria-label="نسخ اسم المستخدم"
                            >
                              {copiedId === `un_${item.id}` ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                        {item.displayName && (
                          <p className="text-slate-400 truncate max-w-[140px]">{item.displayName}</p>
                        )}
                      </td>

                      <td className="py-3.5 px-4 tabular-nums">
                        <span
                          dir="ltr"
                          className={`font-mono font-medium ${
                            item.birthMismatch
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {formatReadableDate(item.registeredBirthdate)}
                        </span>
                        {item.birthMismatch && (
                          <p className="text-amber-600 dark:text-amber-400">مختلف</p>
                        )}
                      </td>

                      <td className="py-3.5 px-4 tabular-nums">
                        <span className="font-mono font-medium text-slate-800 dark:text-slate-200" dir="ltr">
                          {formatReadableDate(item.createdAtDate)}
                          {item.isApproximateDate && item.createdAtDate ? ' ~' : ''}
                        </span>
                        {dur && <p className="text-slate-400">{dur.label}</p>}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          {item.password ? (
                            <>
                              <span className="font-mono text-slate-700 dark:text-slate-300" dir="ltr">
                                {pwdOpen ? item.password : '••••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setRevealedPwds((p) => ({ ...p, [item.id]: !pwdOpen }))
                                }
                                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                                aria-label="إظهار"
                              >
                                {pwdOpen ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleCopy(item.password, `pw_${item.id}`, true, `كلمة مرور ${item.name}`)
                                }
                                className="p-1 text-slate-400 hover:text-indigo-600 cursor-pointer"
                                aria-label="نسخ كلمة المرور"
                              >
                                {copiedId === `pw_${item.id}` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </>
                          ) : (
                            <span className="text-slate-400">دخول بالحساب الأب</span>
                          )}
                          {item.twoFactorEnabled && (
                            <ShieldCheck
                              className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0"
                              aria-label="2FA مفعل"
                            />
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => onSelectAccount(item.openTargetAccount)}
                          className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium whitespace-nowrap cursor-pointer"
                        >
                          فتح الملف
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
