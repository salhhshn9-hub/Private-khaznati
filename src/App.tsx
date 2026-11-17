import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Calendar,
  Check,
  Copy,
  Database,
  Eye,
  EyeOff,
  KeyRound,
  LayoutGrid,
  Link2,
  Lock,
  LogOut,
  Mail,
  Menu,
  Moon,
  Plus,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Star,
  Sun,
  X,
} from 'lucide-react';
import {
  AccountCategory,
  VaultAccount,
  VaultAccountDraft,
  VaultPreferences,
} from './types/vault';
import {
  CATEGORY_LABELS,
  buildVaultAuditReport,
  calculateAccountDuration,
  createSampleAccountsForUser,
  formatReadableDate,
  generateSafeId,
  sanitizeAccountPayload,
  sanitizePreferencesPayload,
} from './utils/vaultHelpers';
import {
  LocalUserSession,
  clearSavedSession,
  getRegisteredUsersCount,
  getSavedSession,
  loadLocalVaultData,
  loginLocalUser,
  registerLocalUser,
  saveLocalVaultData,
} from './utils/localVaultStorage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthScreen } from './components/AuthScreen';
import { VaultLockScreen } from './components/VaultLockScreen';
import { PlatformIcon } from './components/PlatformIcon';
import { AccountModal } from './components/AccountModal';
import { AccountDetailDrawer } from './components/AccountDetailDrawer';
import { IdentityGraphView } from './components/IdentityGraphView';
import { DatesTimelineView } from './components/DatesTimelineView';
import { SecurityAuditView } from './components/SecurityAuditView';
import { PasswordGeneratorView } from './components/PasswordGeneratorView';
import { SettingsView } from './components/SettingsView';
import { OfflineIndicator } from './components/PWAInstallButton';

type ActiveSection = 'all' | 'graph' | 'dates' | 'audit' | 'generator' | 'settings';
type RecordFilter = 'all' | 'email' | 'app' | 'favorites';

function VaultApp() {
  const [user, setUser] = useState<LocalUserSession | null>(() => getSavedSession());
  const [registeredUsersCount, setRegisteredUsersCount] = useState<number>(() =>
    getRegisteredUsersCount()
  );
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [accounts, setAccounts] = useState<VaultAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  const [preferences, setPreferences] = useState<VaultPreferences>({
    ownerId: '',
    realBirthdate: '',
    vaultPinHash: '',
    autoLockMinutes: 15,
    theme: 'light',
  });
  const [isLocked, setIsLocked] = useState(false);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('khaznati_theme');
    return saved === 'dark' ? 'dark' : 'light';
  });

  const [activeSection, setActiveSection] = useState<ActiveSection>('all');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [recordFilter, setRecordFilter] = useState<RecordFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | AccountCategory>('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<VaultAccount | null>(null);
  const [draftOverrides, setDraftOverrides] = useState<Partial<VaultAccountDraft> | undefined>(
    undefined
  );

  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [revealedCardPwds, setRevealedCardPwds] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [seedingDemo, setSeedingDemo] = useState(false);

  const initialLockCheckedRef = useRef(false);

  // Sync theme to <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('khaznati_theme', theme);
  }, [theme]);

  // Load user's local vault when authenticated
  useEffect(() => {
    if (!user) {
      setAccounts([]);
      setLoadingAccounts(false);
      setIsLocked(false);
      initialLockCheckedRef.current = false;
      return;
    }

    let cancelled = false;
    setLoadingAccounts(true);

    void loadLocalVaultData(user.uid, user.birthdate).then((vault) => {
      if (cancelled) return;
      const sorted = [...vault.accounts].sort((a, b) => {
        const aTime = typeof a.updatedAt === 'number' ? a.updatedAt : 0;
        const bTime = typeof b.updatedAt === 'number' ? b.updatedAt : 0;
        return bTime - aTime;
      });
      setAccounts(sorted);
      setPreferences(vault.preferences);
      if (vault.preferences.theme === 'dark' || vault.preferences.theme === 'light') {
        setTheme(vault.preferences.theme);
      }
      if (!initialLockCheckedRef.current) {
        initialLockCheckedRef.current = true;
        if (vault.preferences.vaultPinHash) {
          setIsLocked(true);
        }
      }
      setLoadingAccounts(false);
    });

    return () => {
      cancelled = true;
    };
  }, [user]);

  // Auto-lock timer
  useEffect(() => {
    if (!user || !preferences.vaultPinHash || isLocked || preferences.autoLockMinutes <= 0) {
      return;
    }

    let timeoutId: number;
    const resetTimer = () => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        setIsLocked(true);
      }, preferences.autoLockMinutes * 60 * 1000);
    };

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((ev) => window.addEventListener(ev, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      window.clearTimeout(timeoutId);
      events.forEach((ev) => window.removeEventListener(ev, resetTimer));
    };
  }, [user, preferences.vaultPinHash, preferences.autoLockMinutes, isLocked]);

  const persistVault = useCallback(
    async (nextAccounts: VaultAccount[], nextPrefs: VaultPreferences) => {
      if (!user) return;
      await saveLocalVaultData(user.uid, {
        accounts: nextAccounts,
        preferences: nextPrefs,
      });
    },
    [user]
  );

  const handleLogin = async (params: {
    username: string;
    password: string;
    birthdate: string;
    rememberDevice: boolean;
  }) => {
    setSigningIn(true);
    setAuthError(null);
    try {
      const session = await loginLocalUser(params);
      initialLockCheckedRef.current = true; // Just authenticated manually
      setUser(session);
      setRegisteredUsersCount(getRegisteredUsersCount());
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'تعذر تسجيل الدخول.');
    } finally {
      setSigningIn(false);
    }
  };

  const handleRegister = async (params: {
    username: string;
    password: string;
    birthdate: string;
    rememberDevice: boolean;
  }) => {
    setSigningIn(true);
    setAuthError(null);
    try {
      const session = await registerLocalUser(params);
      initialLockCheckedRef.current = true;
      setUser(session);
      setRegisteredUsersCount(getRegisteredUsersCount());
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'تعذر إنشاء الحساب.');
    } finally {
      setSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    clearSavedSession();
    setUser(null);
    setSelectedAccountId(null);
    setAuthError(null);
  };

  const emailIdentities = useMemo(
    () => accounts.filter((a) => a.recordType === 'email'),
    [accounts]
  );

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === selectedAccountId) || null,
    [accounts, selectedAccountId]
  );

  const auditReport = useMemo(
    () => buildVaultAuditReport(accounts, preferences.realBirthdate),
    [accounts, preferences.realBirthdate]
  );

  const totalAuditAlerts =
    auditReport.reusedPasswordGroups.length +
    auditReport.weakPasswordAccounts.length +
    auditReport.birthdateMismatches.length;

  const filteredAccounts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return accounts.filter((acc) => {
      if (recordFilter === 'email' && acc.recordType !== 'email') return false;
      if (recordFilter === 'app' && acc.recordType !== 'app') return false;
      if (recordFilter === 'favorites' && !acc.isFavorite) return false;
      if (categoryFilter !== 'all' && acc.category !== categoryFilter) return false;

      if (q) {
        const questionsText = (acc.securityQuestions || [])
          .map((sq) => `${sq.question} ${sq.answer}`)
          .join(' ');
        const haystack = [
          acc.title,
          acc.emailAddress,
          acc.username,
          acc.displayName,
          acc.phoneNumber,
          acc.recoveryEmail,
          acc.registeredBirthdate,
          acc.accountCreatedAt,
          acc.websiteUrl,
          acc.notes,
          questionsText,
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [accounts, recordFilter, categoryFilter, searchQuery]);

  const handleSaveAccount = useCallback(
    async (draft: VaultAccountDraft, existingId?: string) => {
      if (!user) return;
      const accountId = existingId || generateSafeId(draft.recordType === 'email' ? 'em' : 'ap');
      const validParents = new Set(emailIdentities.map((e) => e.id));
      const sanitized = sanitizeAccountPayload(draft, user.uid, accountId, validParents);
      const now = Date.now();

      let nextAccounts: VaultAccount[];
      if (existingId) {
        nextAccounts = accounts.map((acc) =>
          acc.id === existingId
            ? {
                ...sanitized,
                createdAt: acc.createdAt ?? now,
                updatedAt: now,
              }
            : acc
        );
      } else {
        const created: VaultAccount = {
          ...sanitized,
          createdAt: now,
          updatedAt: now,
        };
        nextAccounts = [created, ...accounts];
      }

      setAccounts(nextAccounts);
      await persistVault(nextAccounts, preferences);
    },
    [user, emailIdentities, accounts, preferences, persistVault]
  );

  const handleDeleteAccount = useCallback(
    async (acc: VaultAccount) => {
      if (!user) return;
      const now = Date.now();
      const nextAccounts = accounts
        .filter((a) => a.id !== acc.id)
        .map((a) =>
          acc.recordType === 'email' && a.parentEmailId === acc.id
            ? { ...a, parentEmailId: '', updatedAt: now }
            : a
        );
      setAccounts(nextAccounts);
      setSelectedAccountId(null);
      await persistVault(nextAccounts, preferences);
    },
    [user, accounts, preferences, persistVault]
  );

  const handleToggleFavorite = useCallback(
    async (acc: VaultAccount) => {
      if (!user) return;
      const now = Date.now();
      const nextAccounts = accounts.map((a) =>
        a.id === acc.id ? { ...a, isFavorite: !a.isFavorite, updatedAt: now } : a
      );
      setAccounts(nextAccounts);
      await persistVault(nextAccounts, preferences);
    },
    [user, accounts, preferences, persistVault]
  );

  const handleSavePreferences = useCallback(
    async (updates: Partial<VaultPreferences>) => {
      if (!user) return;
      const now = Date.now();
      const sanitized = sanitizePreferencesPayload({ ...preferences, ...updates }, user.uid);
      const nextPrefs: VaultPreferences = {
        ...sanitized,
        createdAt: preferences.createdAt ?? now,
        updatedAt: now,
      };
      setPreferences(nextPrefs);
      await persistVault(accounts, nextPrefs);
    },
    [user, preferences, accounts, persistVault]
  );

  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    if (user) {
      void handleSavePreferences({ theme: nextTheme });
    }
  };

  const handleSeedSampleData = useCallback(async () => {
    if (!user) return;
    setSeedingDemo(true);
    try {
      const sample = createSampleAccountsForUser();
      const tempToRealId = new Map<string, string>();
      const now = Date.now();
      const createdEmails: VaultAccount[] = [];

      for (const item of sample.emails) {
        const realId = generateSafeId('em');
        tempToRealId.set(item.tempId, realId);
        const sanitized = sanitizeAccountPayload(item.draft, user.uid, realId);
        createdEmails.push({ ...sanitized, createdAt: now, updatedAt: now });
      }

      const validParents = new Set([
        ...emailIdentities.map((e) => e.id),
        ...tempToRealId.values(),
      ]);

      const createdApps: VaultAccount[] = [];
      for (const item of sample.apps) {
        const realId = generateSafeId('ap');
        const parentId = tempToRealId.get(item.parentTempId) || '';
        const sanitized = sanitizeAccountPayload(
          { ...item.draft, parentEmailId: parentId },
          user.uid,
          realId,
          validParents
        );
        createdApps.push({ ...sanitized, createdAt: now, updatedAt: now });
      }

      const nextAccounts = [...createdEmails, ...createdApps, ...accounts];
      setAccounts(nextAccounts);
      await persistVault(nextAccounts, preferences);
    } finally {
      setSeedingDemo(false);
    }
  }, [user, emailIdentities, accounts, preferences, persistVault]);

  const handleImportAccounts = useCallback(
    async (rawAccounts: unknown[]): Promise<number> => {
      if (!user) return 0;
      let count = 0;
      const createdIds = new Set(emailIdentities.map((e) => e.id));
      const parsed = rawAccounts.filter(
        (item): item is Record<string, unknown> => Boolean(item && typeof item === 'object')
      );
      const emailsFirst = [
        ...parsed.filter((p) => p.recordType === 'email'),
        ...parsed.filter((p) => p.recordType !== 'email'),
      ];

      const idMap = new Map<string, string>();
      const importedList: VaultAccount[] = [];
      const now = Date.now();

      for (const item of emailsFirst) {
        const oldId = typeof item.id === 'string' ? item.id : '';
        const newId = generateSafeId(item.recordType === 'email' ? 'em' : 'ap');
        if (oldId) idMap.set(oldId, newId);

        const mappedParent =
          typeof item.parentEmailId === 'string' && idMap.has(item.parentEmailId)
            ? idMap.get(item.parentEmailId)!
            : typeof item.parentEmailId === 'string'
              ? item.parentEmailId
              : '';

        const sanitized = sanitizeAccountPayload(
          {
            ...(item as unknown as VaultAccountDraft),
            parentEmailId: mappedParent,
          },
          user.uid,
          newId,
          createdIds
        );

        importedList.push({ ...sanitized, createdAt: now, updatedAt: now });
        if (sanitized.recordType === 'email') {
          createdIds.add(newId);
        }
        count++;
      }

      const nextAccounts = [...importedList, ...accounts];
      setAccounts(nextAccounts);
      await persistVault(nextAccounts, preferences);
      return count;
    },
    [user, emailIdentities, accounts, preferences, persistVault]
  );

  const openNewAccountModal = (overrides?: Partial<VaultAccountDraft>) => {
    setEditingAccount(null);
    setDraftOverrides(overrides);
    setModalOpen(true);
  };

  const openEditAccountModal = (acc: VaultAccount) => {
    setEditingAccount(acc);
    setDraftOverrides(undefined);
    setModalOpen(true);
  };

  const copyQuick = (e: React.MouseEvent, value: string, key: string) => {
    e.stopPropagation();
    if (!value) return;
    void navigator.clipboard.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey((curr) => (curr === key ? null : curr)), 1500);
  };

  if (!user) {
    return (
      <AuthScreen
        onLogin={handleLogin}
        onRegister={handleRegister}
        registeredUsersCount={registeredUsersCount}
        signingIn={signingIn}
        authError={authError}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />
    );
  }

  if (isLocked && preferences.vaultPinHash) {
    return (
      <VaultLockScreen
        expectedPinHash={preferences.vaultPinHash}
        userLabel={`@${user.username}`}
        onUnlock={() => setIsLocked(false)}
        onSignOut={handleSignOut}
      />
    );
  }

  const protectedCount = accounts.filter((a) => a.twoFactorEnabled).length;

  const navItems: {
    id: ActiveSection;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }[] = [
    {
      id: 'all',
      label: 'جميع الحسابات',
      icon: <LayoutGrid className="w-4 h-4 shrink-0" />,
      badge: accounts.length,
    },
    {
      id: 'graph',
      label: 'خريطة الإيميلات والتطبيقات',
      icon: <Link2 className="w-4 h-4 shrink-0" />,
      badge: emailIdentities.length,
    },
    {
      id: 'dates',
      label: 'سجل التواريخ والميلاد',
      icon: <Calendar className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'audit',
      label: 'التدقيق الأمني والتطابق',
      icon: <ShieldAlert className="w-4 h-4 shrink-0" />,
      badge: totalAuditAlerts > 0 ? totalAuditAlerts : undefined,
    },
    {
      id: 'generator',
      label: 'مولّد كلمات المرور',
      icon: <KeyRound className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'settings',
      label: 'الإعدادات والنسخ الاحتياطي',
      icon: <Settings className="w-4 h-4 shrink-0" />,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex">
      {/* Mobile Sidebar Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 right-0 z-40 h-screen w-66 shrink-0 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col justify-between transition-transform duration-200 lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-5 space-y-6 overflow-y-auto">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
              <Lock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span className="text-lg font-bold tracking-tight">خَزْنَتِي</span>
            </div>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="p-1.5 rounded-lg text-slate-500 lg:hidden"
              aria-label="إغلاق القائمة"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              openNewAccountModal();
            }}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة إيميل أو حساب</span>
          </button>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const active = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveSection(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full px-3 py-2.5 rounded-lg text-xs font-medium flex items-center justify-between gap-2 transition-colors whitespace-nowrap cursor-pointer ${
                    active
                      ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <span className="flex items-center gap-2.5 truncate">
                    {item.icon}
                    <span className="truncate">{item.label}</span>
                  </span>
                  {item.badge !== undefined && (
                    <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom User & Lock Controls */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <div className="px-2 space-y-0.5">
            <p className="text-xs font-semibold truncate font-mono" dir="ltr">
              @{user.username}
            </p>
            <p className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 truncate" dir="ltr">
              {formatReadableDate(user.birthdate)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {preferences.vaultPinHash && (
              <button
                type="button"
                onClick={() => setIsLocked(true)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>قفل</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>خروج</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border-b border-slate-200 dark:border-slate-800 px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 lg:hidden"
              aria-label="فتح القائمة"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="text-sm font-semibold truncate">
              {navItems.find((n) => n.id === activeSection)?.label}
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleToggleTheme}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="تبديل المظهر"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() =>
                openNewAccountModal({
                  recordType: 'email',
                  platformKey: 'gmail',
                  category: 'email',
                })
              }
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>بريد جديد</span>
            </button>

            <button
              type="button"
              onClick={() => openNewAccountModal({ recordType: 'app' })}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>حساب تطبيق</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {activeSection === 'all' && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-1">
                  <span className="text-xs text-slate-500 dark:text-slate-400">إجمالي السجلات</span>
                  <p className="text-2xl font-bold font-mono tabular-nums">{accounts.length}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-1">
                  <span className="text-xs text-slate-500 dark:text-slate-400">الإيميلات الرئيسية</span>
                  <p className="text-2xl font-bold font-mono tabular-nums text-indigo-600 dark:text-indigo-400">
                    {emailIdentities.length}
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-1">
                  <span className="text-xs text-slate-500 dark:text-slate-400">التطبيقات والمواقع</span>
                  <p className="text-2xl font-bold font-mono tabular-nums">
                    {accounts.length - emailIdentities.length}
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-1">
                  <span className="text-xs text-slate-500 dark:text-slate-400">محمية بالتحقق بخطوتين</span>
                  <p className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                    {protectedCount}
                  </p>
                </div>
              </div>

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث بالاسم، الإيميل، اسم المستخدم، سنة الميلاد، الملاحظات..."
                    className="w-full pr-10 pl-4 py-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-lg">
                    {(
                      [
                        { id: 'all', label: 'الكل' },
                        { id: 'email', label: 'الإيميلات' },
                        { id: 'app', label: 'التطبيقات' },
                        { id: 'favorites', label: 'المفضلة' },
                      ] as { id: RecordFilter; label: string }[]
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setRecordFilter(tab.id)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          recordFilter === tab.id
                            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <select
                    value={categoryFilter}
                    onChange={(e) =>
                      setCategoryFilter(e.target.value as 'all' | AccountCategory)
                    }
                    aria-label="تصفية حسب التصنيف"
                    className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">كل التصنيفات</option>
                    {(Object.keys(CATEGORY_LABELS) as AccountCategory[]).map((cat) => (
                      <option key={cat} value={cat}>
                        {CATEGORY_LABELS[cat]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {loadingAccounts ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className="h-44 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
                    >
                      <div className="h-5 w-1/2 bg-slate-200 dark:bg-slate-800 rounded" />
                      <div className="h-4 w-3/4 bg-slate-100 dark:bg-slate-800/60 rounded" />
                      <div className="h-4 w-2/3 bg-slate-100 dark:bg-slate-800/60 rounded" />
                    </div>
                  ))}
                </div>
              ) : accounts.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center space-y-5">
                  <Lock className="w-10 h-10 text-indigo-600 dark:text-indigo-400 mx-auto" />
                  <div className="space-y-1.5 max-w-lg mx-auto">
                    <h3 className="text-base font-bold">خزنتك جاهزة لتنظيم حساباتك</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      ابدأ بإضافة بريدك الإلكتروني الأساسي ثم اربط تحته حساباتك في إنستقرام وفيسبوك وغيرها، أو جرّب تحميل بيانات نموذجية جاهزة لاكتشاف كل التفاصيل.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        openNewAccountModal({
                          recordType: 'email',
                          platformKey: 'gmail',
                          category: 'email',
                        })
                      }
                      className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>إضافة أول بريد إلكتروني</span>
                    </button>
                    <button
                      type="button"
                      disabled={seedingDemo}
                      onClick={() => void handleSeedSampleData()}
                      className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <Database className="w-4 h-4" />
                      <span>
                        {seedingDemo ? 'جاري تحميل الأمثلة...' : 'تحميل أمثلة جاهزة للتجربة'}
                      </span>
                    </button>
                  </div>
                </div>
              ) : filteredAccounts.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center space-y-2">
                  <p className="text-sm font-semibold">لا توجد نتائج مطابقة لبحثك</p>
                  <p className="text-xs text-slate-500">جرّب تغيير كلمات البحث أو إزالة التصفية.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredAccounts.map((acc) => {
                    const pwdRevealed = Boolean(revealedCardPwds[acc.id]);
                    const linkedAppsCount =
                      acc.recordType === 'email'
                        ? accounts.filter(
                            (child) =>
                              child.id !== acc.id &&
                              (child.parentEmailId === acc.id ||
                                (acc.emailAddress &&
                                  child.recordType === 'app' &&
                                  child.emailAddress.toLowerCase() ===
                                    acc.emailAddress.toLowerCase()))
                          ).length
                        : 0;
                    const createdDur = calculateAccountDuration(acc.accountCreatedAt);

                    return (
                      <div
                        key={acc.id}
                        onClick={() => setSelectedAccountId(acc.id)}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 rounded-xl p-5 space-y-4 transition-colors cursor-pointer flex flex-col justify-between"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <PlatformIcon
                                platformKey={acc.platformKey}
                                recordType={acc.recordType}
                                size="md"
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <h3 className="text-sm font-bold truncate">{acc.title}</h3>
                                  {acc.isFavorite && (
                                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                                  <span>
                                    {acc.recordType === 'email'
                                      ? 'بريد رئيسي'
                                      : CATEGORY_LABELS[acc.category]}
                                  </span>
                                  {acc.recordType === 'email' && (
                                    <>
                                      <span aria-hidden="true">·</span>
                                      <span className="tabular-nums">
                                        {linkedAppsCount} تطبيقات مرتبطة
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            {acc.twoFactorEnabled && (
                              <ShieldCheck
                                className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0"
                                aria-label="محمي بالتحقق بخطوتين"
                              />
                            )}
                          </div>

                          <div className="space-y-1.5 text-xs">
                            {acc.emailAddress && (
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-slate-400 shrink-0">البريد</span>
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span
                                    className="font-mono text-slate-700 dark:text-slate-300 truncate"
                                    dir="ltr"
                                  >
                                    {acc.emailAddress}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => copyQuick(e, acc.emailAddress, `em_${acc.id}`)}
                                    className="text-slate-400 hover:text-indigo-600 p-0.5 cursor-pointer"
                                    aria-label="نسخ البريد"
                                  >
                                    {copiedKey === `em_${acc.id}` ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            )}

                            {acc.username && (
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-slate-400 shrink-0">المستخدم</span>
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span
                                    className="font-mono text-slate-700 dark:text-slate-300 truncate"
                                    dir="ltr"
                                  >
                                    {acc.username}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => copyQuick(e, acc.username, `un_${acc.id}`)}
                                    className="text-slate-400 hover:text-indigo-600 p-0.5 cursor-pointer"
                                    aria-label="نسخ اسم المستخدم"
                                  >
                                    {copiedKey === `un_${acc.id}` ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            )}

                            {acc.password && (
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-slate-400 shrink-0">كلمة المرور</span>
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span
                                    className="font-mono text-slate-800 dark:text-slate-200 truncate"
                                    dir="ltr"
                                  >
                                    {pwdRevealed ? acc.password : '••••••••••'}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setRevealedCardPwds((p) => ({
                                        ...p,
                                        [acc.id]: !pwdRevealed,
                                      }));
                                    }}
                                    className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                                    aria-label="إظهار أو إخفاء كلمة المرور"
                                  >
                                    {pwdRevealed ? (
                                      <EyeOff className="w-3.5 h-3.5" />
                                    ) : (
                                      <Eye className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => copyQuick(e, acc.password, `pw_${acc.id}`)}
                                    className="text-slate-400 hover:text-indigo-600 p-0.5 cursor-pointer"
                                    aria-label="نسخ كلمة المرور"
                                  >
                                    {copiedKey === `pw_${acc.id}` ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                          <span>
                            الميلاد:{' '}
                            <strong className="font-mono text-slate-700 dark:text-slate-300">
                              {formatReadableDate(acc.registeredBirthdate)}
                            </strong>
                          </span>
                          <span>
                            {createdDur
                              ? createdDur.label
                              : `الإنشاء: ${formatReadableDate(acc.accountCreatedAt)}`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {activeSection === 'graph' && (
            <IdentityGraphView
              accounts={accounts}
              onSelectAccount={(acc) => setSelectedAccountId(acc.id)}
              onAddLinkedApp={(parentEmail) =>
                openNewAccountModal({
                  recordType: 'app',
                  parentEmailId: parentEmail.id,
                  emailAddress: parentEmail.emailAddress,
                  registeredBirthdate: parentEmail.registeredBirthdate,
                })
              }
              onAddNewEmail={() =>
                openNewAccountModal({
                  recordType: 'email',
                  platformKey: 'gmail',
                  category: 'email',
                })
              }
            />
          )}

          {activeSection === 'dates' && (
            <DatesTimelineView
              accounts={accounts}
              realBirthdate={preferences.realBirthdate}
              onSelectAccount={(acc) => setSelectedAccountId(acc.id)}
            />
          )}

          {activeSection === 'audit' && (
            <SecurityAuditView
              accounts={accounts}
              realBirthdate={preferences.realBirthdate}
              onEditAccount={(acc) => openEditAccountModal(acc)}
              onSelectAccount={(acc) => setSelectedAccountId(acc.id)}
            />
          )}

          {activeSection === 'generator' && <PasswordGeneratorView />}

          {activeSection === 'settings' && (
            <SettingsView
              preferences={preferences}
              accounts={accounts}
              onSavePreferences={handleSavePreferences}
              onImportAccounts={handleImportAccounts}
              onSeedSampleData={handleSeedSampleData}
            />
          )}
        </main>
      </div>

      <AccountModal
        isOpen={modalOpen}
        editingAccount={editingAccount}
        initialDraftOverrides={draftOverrides}
        emailIdentities={emailIdentities}
        realBirthdate={preferences.realBirthdate}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveAccount}
      />

      <AccountDetailDrawer
        account={selectedAccount}
        allAccounts={accounts}
        realBirthdate={preferences.realBirthdate}
        onClose={() => setSelectedAccountId(null)}
        onSelectAccount={(acc) => setSelectedAccountId(acc.id)}
        onEdit={(acc) => openEditAccountModal(acc)}
        onDelete={handleDeleteAccount}
        onToggleFavorite={handleToggleFavorite}
        onAddLinkedApp={(parentEmail) =>
          openNewAccountModal({
            recordType: 'app',
            parentEmailId: parentEmail.id,
            emailAddress: parentEmail.emailAddress,
            registeredBirthdate: parentEmail.registeredBirthdate,
          })
        }
      />

      <OfflineIndicator />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <VaultApp />
    </ErrorBoundary>
  );
}
