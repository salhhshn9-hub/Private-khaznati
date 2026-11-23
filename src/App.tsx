import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  Check,
  CheckSquare,
  Copy,
  CreditCard,
  Database,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Globe,
  KeyRound,
  LayoutGrid,
  Link2,
  List,
  Lock,
  LogOut,
  Mail,
  Menu,
  Moon,
  Plus,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Square,
  Star,
  Sun,
  Timer,
  Trash2,
  X,
} from 'lucide-react';
import {
  AccountCategory,
  RegisteredSiteItem,
  VaultAccount,
  VaultAccountDraft,
  VaultPreferences,
} from './types/vault';
import {
  CATEGORY_LABELS,
  analyzePasswordRisks,
  buildVaultAuditReport,
  calculateAccountDuration,
  createEmptyAccountDraft,
  createSampleAccountsForUser,
  evaluatePasswordStrength,
  formatReadableDate,
  generateSafeId,
  getAccountFieldCompleteness,
  getAccountNeedsAttention,
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
import { AccountModal, ModalTab } from './components/AccountModal';
import { AccountDetailDrawer } from './components/AccountDetailDrawer';
import { IdentityGraphView } from './components/IdentityGraphView';
import { SitesDirectoryView } from './components/SitesDirectoryView';
import { SubscriptionsView } from './components/SubscriptionsView';
import { DatesTimelineView } from './components/DatesTimelineView';
import { SecurityAuditView } from './components/SecurityAuditView';
import { PasswordGeneratorView } from './components/PasswordGeneratorView';
import { AuthenticatorHubView } from './components/AuthenticatorHubView';
import { SettingsView } from './components/SettingsView';
import { CommandPalette } from './components/CommandPalette';
import { ExcelExportModal } from './components/ExcelExportModal';
import { OfflineIndicator } from './components/PWAInstallButton';

type ActiveSection =
  | 'all'
  | 'sites'
  | 'graph'
  | 'totp'
  | 'dates'
  | 'subscriptions'
  | 'audit'
  | 'generator'
  | 'settings';
type RecordFilter = 'all' | 'email' | 'app' | 'favorites' | 'attention';
type SortOption = 'updated' | 'created_newest' | 'created_oldest' | 'title' | 'completeness';
type ViewMode = 'cards' | 'table';

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
    clipboardClearSeconds: 30,
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
  const [sortBy, setSortBy] = useState<SortOption>('updated');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [privacyMode, setPrivacyMode] = useState(false);

  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [excelModalOpen, setExcelModalOpen] = useState(false);
  const [excelScope, setExcelScope] = useState<{
    accounts: VaultAccount[];
    scopeLabel?: string;
    customFileSuffix?: string;
  } | null>(null);

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalInitialTab, setModalInitialTab] = useState<ModalTab>('identity');
  const [editingAccount, setEditingAccount] = useState<VaultAccount | null>(null);
  const [draftOverrides, setDraftOverrides] = useState<Partial<VaultAccountDraft> | undefined>(
    undefined
  );

  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [revealedCardPwds, setRevealedCardPwds] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [seedingDemo, setSeedingDemo] = useState(false);

  // Global Clipboard Auto-Clear State
  const [clipboardTimer, setClipboardTimer] = useState<{
    secondsLeft: number;
    label: string;
  } | null>(null);

  const initialLockCheckedRef = useRef(false);

  // Global Ctrl+K / Cmd+K Quick Search Shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!user || isLocked) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [user, isLocked]);

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

  // Clipboard countdown auto-clear
  useEffect(() => {
    if (!clipboardTimer) return;
    if (clipboardTimer.secondsLeft <= 0) {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        void navigator.clipboard.writeText('').catch(() => {});
      }
      setClipboardTimer(null);
      return;
    }
    const id = window.setTimeout(() => {
      setClipboardTimer((curr) =>
        curr ? { ...curr, secondsLeft: curr.secondsLeft - 1 } : null
      );
    }, 1000);
    return () => window.clearTimeout(id);
  }, [clipboardTimer]);

  const copySecretWithTimer = useCallback(
    (value: string, label = 'البيان السري') => {
      if (!value) return;
      void navigator.clipboard.writeText(value);
      const seconds = preferences.clipboardClearSeconds ?? 30;
      if (seconds > 0) {
        setClipboardTimer({ secondsLeft: seconds, label });
      }
    },
    [preferences.clipboardClearSeconds]
  );

  const clearClipboardNow = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText('').catch(() => {});
    }
    setClipboardTimer(null);
  };

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
      initialLockCheckedRef.current = true;
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
    setClipboardTimer(null);
    setAuthError(null);
  };

  const emailIdentities = useMemo(
    () => accounts.filter((a) => a.recordType === 'email'),
    [accounts]
  );

  const totalSitesAndAppsCount = useMemo(
    () =>
      accounts.length -
      emailIdentities.length +
      accounts.reduce((sum, a) => sum + (a.registeredSites?.length || 0), 0),
    [accounts, emailIdentities.length]
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

  const totpCount = useMemo(
    () => accounts.filter((a) => Boolean(a.totpSecret && a.totpSecret.trim())).length,
    [accounts]
  );

  const attentionCount = useMemo(
    () => accounts.filter((a) => getAccountNeedsAttention(a, auditReport)).length,
    [accounts, auditReport]
  );

  const strongPasswordPercent = useMemo(() => {
    const withPwd = accounts.filter((a) => Boolean(a.password));
    if (withPwd.length === 0) return 0;
    const strong = withPwd.filter((a) => {
      const ev = evaluatePasswordStrength(a.password);
      return ev.tier === 'strong' || ev.tier === 'excellent';
    }).length;
    return Math.round((strong / withPwd.length) * 100);
  }, [accounts]);

  const dueSoonSubsCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let count = 0;
    const checkDate = (dateStr: string) => {
      if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return;
      const target = new Date(`${dateStr}T00:00:00`).getTime();
      if (Number.isNaN(target)) return;
      const days = Math.round((target - today.getTime()) / (1000 * 60 * 60 * 24));
      if (days <= 14) count++;
    };
    for (const acc of accounts) {
      if (acc.renewalDate) checkDate(acc.renewalDate);
      for (const s of acc.registeredSites || []) {
        if (s.renewalDate) checkDate(s.renewalDate);
      }
    }
    return count;
  }, [accounts]);

  const filteredAccounts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const matched = accounts.filter((acc) => {
      if (recordFilter === 'email' && acc.recordType !== 'email') return false;
      if (recordFilter === 'app' && acc.recordType !== 'app') return false;
      if (recordFilter === 'favorites' && !acc.isFavorite) return false;
      if (recordFilter === 'attention' && !getAccountNeedsAttention(acc, auditReport)) return false;
      if (categoryFilter !== 'all' && acc.category !== categoryFilter) return false;

      if (q) {
        const questionsText = (acc.securityQuestions || [])
          .map((sq) => `${sq.question} ${sq.answer}`)
          .join(' ');
        const sitesText = (acc.registeredSites || [])
          .map((s) => `${s.name} ${s.url} ${s.username} ${s.displayName} ${s.phoneNumber} ${s.notes}`)
          .join(' ');
        const customText = (acc.customFields || [])
          .map((cf) => `${cf.label} ${cf.isSecret ? '' : cf.value}`)
          .join(' ');
        const haystack = [
          acc.title,
          acc.emailAddress,
          acc.username,
          acc.displayName,
          acc.registeredFullName,
          acc.accountRegion,
          acc.billingAddressHint,
          acc.billingEmail,
          acc.creationContext,
          acc.recoveryContactPerson,
          acc.emergencyInstructions,
          acc.accountExternalId,
          acc.linkedPaymentHint,
          acc.phoneNumber,
          acc.recoveryEmail,
          acc.registeredBirthdate,
          acc.accountCreatedAt,
          acc.websiteUrl,
          acc.notes,
          ...(acc.trustedDevices || []),
          questionsText,
          sitesText,
          customText,
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    return [...matched].sort((a, b) => {
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title, 'ar');
      }
      if (sortBy === 'created_newest') {
        return (b.accountCreatedAt || '').localeCompare(a.accountCreatedAt || '');
      }
      if (sortBy === 'created_oldest') {
        const ad = a.accountCreatedAt || '9999-12-31';
        const bd = b.accountCreatedAt || '9999-12-31';
        return ad.localeCompare(bd);
      }
      if (sortBy === 'completeness') {
        return getAccountFieldCompleteness(b).filled - getAccountFieldCompleteness(a).filled;
      }
      const aTime = typeof a.updatedAt === 'number' ? a.updatedAt : 0;
      const bTime = typeof b.updatedAt === 'number' ? b.updatedAt : 0;
      return bTime - aTime;
    });
  }, [accounts, recordFilter, categoryFilter, searchQuery, sortBy, auditReport]);

  const handleSaveAccount = useCallback(
    async (draft: VaultAccountDraft, existingId?: string) => {
      if (!user) return;
      const accountId = existingId || generateSafeId(draft.recordType === 'email' ? 'em' : 'ap');
      const validParents = new Set(accounts.filter((a) => a.id !== accountId).map((a) => a.id));
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
    [user, accounts, preferences, persistVault]
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

  const handleAddQuickSite = useCallback(
    async (parentAccount: VaultAccount, site: RegisteredSiteItem) => {
      if (!user) return;
      const now = Date.now();
      const nextAccounts = accounts.map((a) =>
        a.id === parentAccount.id
          ? {
              ...a,
              registeredSites: [site, ...(a.registeredSites || [])],
              updatedAt: now,
            }
          : a
      );
      setAccounts(nextAccounts);
      await persistVault(nextAccounts, preferences);
    },
    [user, accounts, preferences, persistVault]
  );

  const handleUpdateQuickSite = useCallback(
    async (parentAccount: VaultAccount, updatedSite: RegisteredSiteItem) => {
      if (!user) return;
      const now = Date.now();
      const nextAccounts = accounts.map((a) =>
        a.id === parentAccount.id
          ? {
              ...a,
              registeredSites: (a.registeredSites || []).map((s) =>
                s.id === updatedSite.id ? updatedSite : s
              ),
              updatedAt: now,
            }
          : a
      );
      setAccounts(nextAccounts);
      await persistVault(nextAccounts, preferences);
    },
    [user, accounts, preferences, persistVault]
  );

  const handleRemoveQuickSite = useCallback(
    async (parentAccount: VaultAccount, siteId: string) => {
      if (!user) return;
      const now = Date.now();
      const nextAccounts = accounts.map((a) =>
        a.id === parentAccount.id
          ? {
              ...a,
              registeredSites: (a.registeredSites || []).filter((s) => s.id !== siteId),
              updatedAt: now,
            }
          : a
      );
      setAccounts(nextAccounts);
      await persistVault(nextAccounts, preferences);
    },
    [user, accounts, preferences, persistVault]
  );

  const handlePromoteSiteToAccount = useCallback(
    async (parentAccount: VaultAccount, site: RegisteredSiteItem) => {
      if (!user) return;
      const now = Date.now();
      const newAccountId = generateSafeId('ap');
      const draft = createEmptyAccountDraft({
        recordType: 'app',
        title: site.name,
        platformKey: site.platformKey || 'custom',
        category: 'other',
        parentEmailId: parentAccount.id,
        emailAddress: parentAccount.emailAddress,
        username: site.username,
        displayName: site.displayName,
        password: site.password,
        phoneNumber: site.phoneNumber,
        pinCode: site.pinCode,
        websiteUrl: site.url,
        loginMethod: site.signupMethod === 'oauth_button' ? 'google_oauth' : 'email_password',
        registeredBirthdate: site.registeredBirthdate || parentAccount.registeredBirthdate,
        accountCreatedAt: site.createdAtDate,
        createdDateApproximate: site.isApproximateDate,
        twoFactorEnabled: site.twoFactorEnabled,
        linkedPaymentHint: site.linkedCardHint,
        subscriptionCost: site.subscriptionCost,
        renewalDate: site.renewalDate,
        primaryDevice: site.deviceUsed,
        notes: site.notes,
      });
      const validParents = new Set(accounts.map((a) => a.id));
      const sanitized = sanitizeAccountPayload(draft, user.uid, newAccountId, validParents);
      const promoted: VaultAccount = { ...sanitized, createdAt: now, updatedAt: now };

      const nextAccounts = [
        promoted,
        ...accounts.map((a) =>
          a.id === parentAccount.id
            ? {
                ...a,
                registeredSites: (a.registeredSites || []).filter((s) => s.id !== site.id),
                updatedAt: now,
              }
            : a
        ),
      ];
      setAccounts(nextAccounts);
      setSelectedAccountId(promoted.id);
      await persistVault(nextAccounts, preferences);
    },
    [user, accounts, preferences, persistVault]
  );

  const openNewAccountModal = (overrides?: Partial<VaultAccountDraft>, initialTab: ModalTab = 'identity') => {
    setEditingAccount(null);
    setDraftOverrides(overrides);
    setModalInitialTab(initialTab);
    setModalOpen(true);
  };

  const openEditAccountModal = (acc: VaultAccount, initialTab: ModalTab = 'identity') => {
    setEditingAccount(acc);
    setDraftOverrides(undefined);
    setModalInitialTab(initialTab);
    setModalOpen(true);
  };

  const handleRotatePassword = useCallback(
    async (acc: VaultAccount, newPassword: string, note: string) => {
      if (!user || !newPassword.trim()) return;
      const today = new Date().toISOString().slice(0, 10);
      const now = Date.now();
      const historyEntry = acc.password
        ? [
            {
              password: acc.password,
              changedAt: today,
              note: note.trim() || 'تدوير سريع',
            },
          ]
        : [];
      const nextAccounts = accounts.map((a) =>
        a.id === acc.id
          ? {
              ...a,
              password: newPassword.trim(),
              lastPasswordChangedAt: today,
              passwordHistory: [...historyEntry, ...(a.passwordHistory || [])],
              updatedAt: now,
            }
          : a
      );
      setAccounts(nextAccounts);
      await persistVault(nextAccounts, preferences);
    },
    [user, accounts, preferences, persistVault]
  );

  const handleMarkAccessedToday = useCallback(
    async (acc: VaultAccount) => {
      if (!user) return;
      const today = new Date().toISOString().slice(0, 10);
      const now = Date.now();
      const nextAccounts = accounts.map((a) =>
        a.id === acc.id
          ? {
              ...a,
              lastAccessedAt: today,
              updatedAt: now,
            }
          : a
      );
      setAccounts(nextAccounts);
      await persistVault(nextAccounts, preferences);
    },
    [user, accounts, preferences, persistVault]
  );

  const handleDuplicateAccount = (acc: VaultAccount) => {
    setSelectedAccountId(null);
    openNewAccountModal({
      recordType: acc.recordType,
      title: `${acc.title} (نسخة)`,
      platformKey: acc.platformKey,
      category: acc.category,
      parentEmailId: acc.parentEmailId,
      emailAddress: acc.emailAddress,
      username: acc.username,
      displayName: acc.displayName,
      registeredFullName: acc.registeredFullName,
      registeredGender: acc.registeredGender,
      accountRegion: acc.accountRegion,
      billingAddressHint: acc.billingAddressHint,
      billingEmail: acc.billingEmail,
      loginMethod: acc.loginMethod,
      registeredBirthdate: acc.registeredBirthdate,
      primaryDevice: acc.primaryDevice,
      recoveryEmail: acc.recoveryEmail,
      recoveryPhone: acc.recoveryPhone,
      phoneNumber: acc.phoneNumber,
      websiteUrl: acc.websiteUrl,
      password: '',
    });
  };

  const openExcelModal = (
    scopedAccounts?: VaultAccount[],
    scopeLabel?: string,
    customFileSuffix?: string
  ) => {
    if (scopedAccounts) {
      setExcelScope({ accounts: scopedAccounts, scopeLabel, customFileSuffix });
    } else {
      setExcelScope(null);
    }
    setExcelModalOpen(true);
  };

  const toggleSelectId = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkFavorite = async () => {
    if (!user || selectedIds.length === 0) return;
    const now = Date.now();
    const idSet = new Set(selectedIds);
    const nextAccounts = accounts.map((a) =>
      idSet.has(a.id) ? { ...a, isFavorite: true, updatedAt: now } : a
    );
    setAccounts(nextAccounts);
    await persistVault(nextAccounts, preferences);
  };

  const handleBulkCategory = async (category: AccountCategory) => {
    if (!user || selectedIds.length === 0) return;
    const now = Date.now();
    const idSet = new Set(selectedIds);
    const nextAccounts = accounts.map((a) =>
      idSet.has(a.id) ? { ...a, category, updatedAt: now } : a
    );
    setAccounts(nextAccounts);
    await persistVault(nextAccounts, preferences);
  };

  const handleBulkDelete = async () => {
    if (!user || selectedIds.length === 0) return;
    const now = Date.now();
    const idSet = new Set(selectedIds);
    const nextAccounts = accounts
      .filter((a) => !idSet.has(a.id))
      .map((a) =>
        a.parentEmailId && idSet.has(a.parentEmailId)
          ? { ...a, parentEmailId: '', updatedAt: now }
          : a
      );
    setAccounts(nextAccounts);
    setSelectedIds([]);
    setSelectionMode(false);
    setConfirmBulkDelete(false);
    await persistVault(nextAccounts, preferences);
  };

  const copyQuick = (e: React.MouseEvent, value: string, key: string, isSecret = false, secretLabel = 'كلمة المرور') => {
    e.stopPropagation();
    if (!value) return;
    if (isSecret) {
      copySecretWithTimer(value, secretLabel);
    } else {
      void navigator.clipboard.writeText(value);
    }
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
      id: 'sites',
      label: 'دليل المواقع والتطبيقات',
      icon: <Globe className="w-4 h-4 shrink-0" />,
      badge: totalSitesAndAppsCount,
    },
    {
      id: 'graph',
      label: 'خريطة الإيميلات والتطبيقات',
      icon: <Link2 className="w-4 h-4 shrink-0" />,
      badge: emailIdentities.length,
    },
    {
      id: 'totp',
      label: 'رموز التحقق الحية (2FA)',
      icon: <Shield className="w-4 h-4 shrink-0" />,
      badge: totpCount > 0 ? totpCount : undefined,
    },
    {
      id: 'dates',
      label: 'سجل التواريخ والميلاد',
      icon: <Calendar className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'subscriptions',
      label: 'الاشتراكات والتجديدات',
      icon: <CreditCard className="w-4 h-4 shrink-0" />,
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

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setCommandPaletteOpen(true)}
              className="hidden md:inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              title="بحث سريع (Ctrl+K)"
            >
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span>بحث سريع...</span>
              <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500">
                ⌘K
              </kbd>
            </button>

            <button
              type="button"
              onClick={() => setPrivacyMode((p) => !p)}
              className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                privacyMode
                  ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title={privacyMode ? 'إلغاء وضع الخصوصية' : 'تفعيل وضع الخصوصية (إخفاء البيانات الحساسة)'}
              aria-label={privacyMode ? 'إلغاء وضع الخصوصية' : 'تفعيل وضع الخصوصية'}
            >
              {privacyMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => openExcelModal()}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              title="تصدير ملف إكسل منسق وفخم بكل الحسابات وما بداخلها"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>تصدير Excel</span>
            </button>

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
              className="hidden lg:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
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
                  <span className="text-xs text-slate-500 dark:text-slate-400">التطبيقات والمواقع المسجلة</span>
                  <p className="text-2xl font-bold font-mono tabular-nums">
                    {totalSitesAndAppsCount}
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-1">
                  <span className="text-xs text-slate-500 dark:text-slate-400">محمية بالتحقق بخطوتين</span>
                  <p className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                    {protectedCount}
                  </p>
                </div>
              </div>

              {/* Vault Security Posture Strip + Subscription Due Alert */}
              {accounts.length > 0 && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-4 text-xs">
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 tabular-nums">
                    <span className="text-slate-600 dark:text-slate-300">
                      قوة كلمات المرور:{' '}
                      <strong
                        className={
                          strongPasswordPercent >= 80
                            ? 'text-emerald-600 dark:text-emerald-400 font-mono'
                            : 'text-amber-600 dark:text-amber-400 font-mono'
                        }
                      >
                        {strongPasswordPercent}%
                      </strong>
                    </span>
                    <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
                    <span className="text-slate-600 dark:text-slate-300">
                      مفاتيح 2FA حية:{' '}
                      <strong className="font-mono text-indigo-600 dark:text-indigo-400">
                        {totpCount}
                      </strong>
                    </span>
                    {attentionCount > 0 && (
                      <>
                        <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
                        <button
                          type="button"
                          onClick={() => setRecordFilter('attention')}
                          className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold hover:underline cursor-pointer"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>{attentionCount} حسابات تستحق المراجعة</span>
                        </button>
                      </>
                    )}
                    {dueSoonSubsCount > 0 && (
                      <>
                        <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
                        <button
                          type="button"
                          onClick={() => setActiveSection('subscriptions')}
                          className="inline-flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-semibold hover:underline cursor-pointer"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>{dueSoonSubsCount} اشتراكات قريبة التجديد</span>
                        </button>
                      </>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setActiveSection('audit')}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium transition-colors whitespace-nowrap cursor-pointer"
                    >
                      مركز التدقيق
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveSection('totp')}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium transition-colors whitespace-nowrap cursor-pointer"
                    >
                      رموز 2FA
                    </button>
                    <button
                      type="button"
                      onClick={() => openExcelModal()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors whitespace-nowrap cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>تصدير الكل لـ Excel</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث بالاسم، الإيميل، المواقع المسجّلة به، الدولة، سنة الميلاد..."
                    className="w-full pr-10 pl-4 py-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-lg overflow-x-auto">
                    {(
                      [
                        { id: 'all', label: 'الكل' },
                        { id: 'email', label: 'الإيميلات' },
                        { id: 'app', label: 'التطبيقات' },
                        { id: 'favorites', label: 'المفضلة' },
                        {
                          id: 'attention',
                          label: attentionCount > 0 ? `تحتاج انتباه (${attentionCount})` : 'تحتاج انتباه',
                        },
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

                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    aria-label="ترتيب النتائج"
                    className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="updated">الأحدث تعديلاً</option>
                    <option value="created_newest">تاريخ الإنشاء (الأحدث)</option>
                    <option value="created_oldest">الأقدم تأسيساً</option>
                    <option value="title">الترتيب الأبجدي</option>
                    <option value="completeness">اكتمال البيانات</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectionMode((prev) => !prev);
                      setSelectedIds([]);
                      setConfirmBulkDelete(false);
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      selectionMode
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>تحديد متعدد</span>
                  </button>

                  <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setViewMode('cards')}
                      className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                        viewMode === 'cards'
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                      }`}
                      aria-label="عرض كبطاقات"
                      title="عرض كبطاقات"
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('table')}
                      className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                        viewMode === 'table'
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                      }`}
                      aria-label="عرض كجدول"
                      title="عرض كجدول"
                    >
                      <List className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Bulk Selection Toolbar */}
              {selectionMode && (
                <div className="bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-bold text-indigo-900 dark:text-indigo-200 tabular-nums">
                      المحدد: {selectedIds.length} من {filteredAccounts.length}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedIds(
                          selectedIds.length === filteredAccounts.length
                            ? []
                            : filteredAccounts.map((a) => a.id)
                        )
                      }
                      className="text-indigo-700 dark:text-indigo-300 hover:underline font-medium cursor-pointer"
                    >
                      {selectedIds.length === filteredAccounts.length ? 'إلغاء الكل' : 'تحديد الكل'}
                    </button>
                  </div>

                  {selectedIds.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const subset = accounts.filter((a) => selectedIds.includes(a.id));
                          openExcelModal(subset, `الحسابات المحددة (${subset.length})`, 'selected');
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>تصدير المحدد لـ Excel</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleBulkFavorite()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium cursor-pointer"
                      >
                        <Star className="w-3.5 h-3.5 text-amber-500" />
                        <span>إضافة للمفضلة</span>
                      </button>

                      <select
                        defaultValue=""
                        onChange={(e) => {
                          if (!e.target.value) return;
                          void handleBulkCategory(e.target.value as AccountCategory);
                          e.target.value = '';
                        }}
                        aria-label="نقل المحدد لتصنيف"
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                      >
                        <option value="">نقل لتصنيف...</option>
                        {(Object.keys(CATEGORY_LABELS) as AccountCategory[]).map((cat) => (
                          <option key={cat} value={cat}>
                            {CATEGORY_LABELS[cat]}
                          </option>
                        ))}
                      </select>

                      {confirmBulkDelete ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => void handleBulkDelete()}
                            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold cursor-pointer"
                          >
                            تأكيد حذف ({selectedIds.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmBulkDelete(false)}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer"
                          >
                            تراجع
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmBulkDelete(true)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-medium cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>حذف</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

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
              ) : viewMode === 'table' ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                        <tr>
                          {selectionMode && <th className="py-3 px-3 w-8" />}
                          <th className="py-3 px-4 font-semibold">الحساب</th>
                          <th className="py-3 px-4 font-semibold">البريد / المستخدم</th>
                          <th className="py-3 px-4 font-semibold">الأمان</th>
                          <th className="py-3 px-4 font-semibold">الميلاد</th>
                          <th className="py-3 px-4 font-semibold">تاريخ الإنشاء</th>
                          <th className="py-3 px-4 font-semibold">إجراء سريع</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredAccounts.map((acc) => {
                          const pwdStrength = evaluatePasswordStrength(acc.password);
                          const createdDur = calculateAccountDuration(acc.accountCreatedAt);
                          const isSelected = selectedIds.includes(acc.id);
                          return (
                            <tr
                              key={acc.id}
                              onClick={() =>
                                selectionMode
                                  ? toggleSelectId(acc.id)
                                  : setSelectedAccountId(acc.id)
                              }
                              className={`transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-indigo-50/70 dark:bg-indigo-950/30'
                                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                              }`}
                            >
                              {selectionMode && (
                                <td className="py-3 px-3">
                                  {isSelected ? (
                                    <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                  ) : (
                                    <Square className="w-4 h-4 text-slate-400" />
                                  )}
                                </td>
                              )}
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2.5">
                                  <PlatformIcon
                                    platformKey={acc.platformKey}
                                    recordType={acc.recordType}
                                    size="sm"
                                  />
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-semibold truncate">{acc.title}</span>
                                      {acc.isFavorite && (
                                        <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                                      )}
                                    </div>
                                    <span className="text-[11px] text-slate-500">
                                      {acc.recordType === 'email'
                                        ? 'بريد رئيسي'
                                        : CATEGORY_LABELS[acc.category]}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300" dir="ltr">
                                {privacyMode
                                  ? '••••••••'
                                  : acc.emailAddress || acc.username || '—'}
                              </td>
                              <td className="py-3 px-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  {acc.twoFactorEnabled && (
                                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                  )}
                                  <span
                                    className={
                                      pwdStrength.tier === 'strong' || pwdStrength.tier === 'excellent'
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : pwdStrength.tier === 'weak'
                                          ? 'text-rose-600 dark:text-rose-400'
                                          : 'text-slate-500'
                                    }
                                  >
                                    {pwdStrength.label}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-4 font-mono tabular-nums" dir="ltr">
                                {formatReadableDate(acc.registeredBirthdate)}
                              </td>
                              <td className="py-3 px-4 tabular-nums text-slate-500 dark:text-slate-400">
                                {createdDur ? createdDur.label : formatReadableDate(acc.accountCreatedAt)}
                              </td>
                              <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center gap-1.5">
                                  {(acc.emailAddress || acc.username) && (
                                    <button
                                      type="button"
                                      onClick={(e) =>
                                        copyQuick(
                                          e,
                                          acc.emailAddress || acc.username,
                                          `tbl_u_${acc.id}`
                                        )
                                      }
                                      className="px-2 py-1 text-[11px] rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap cursor-pointer"
                                    >
                                      {copiedKey === `tbl_u_${acc.id}` ? 'تم' : 'نسخ البريد'}
                                    </button>
                                  )}
                                  {acc.password && (
                                    <button
                                      type="button"
                                      onClick={(e) =>
                                        copyQuick(
                                          e,
                                          acc.password,
                                          `tbl_p_${acc.id}`,
                                          true,
                                          `كلمة مرور ${acc.title}`
                                        )
                                      }
                                      className="px-2 py-1 text-[11px] rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap cursor-pointer"
                                    >
                                      {copiedKey === `tbl_p_${acc.id}` ? 'تم' : 'نسخ السر'}
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredAccounts.map((acc) => {
                    const pwdRevealed = Boolean(revealedCardPwds[acc.id]);
                    const isSelected = selectedIds.includes(acc.id);
                    const pwdEval = evaluatePasswordStrength(acc.password);
                    const pwdRisks = analyzePasswordRisks(acc, preferences.realBirthdate);
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
                        onClick={() =>
                          selectionMode
                            ? toggleSelectId(acc.id)
                            : setSelectedAccountId(acc.id)
                        }
                        className={`bg-white dark:bg-slate-900 border rounded-xl p-5 space-y-4 transition-colors cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'border-indigo-600 ring-1 ring-indigo-600 dark:border-indigo-400'
                            : 'border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600'
                        }`}
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              {selectionMode && (
                                <span className="shrink-0">
                                  {isSelected ? (
                                    <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                  ) : (
                                    <Square className="w-4 h-4 text-slate-400" />
                                  )}
                                </span>
                              )}
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
                                <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                                  <span>
                                    {acc.recordType === 'email'
                                      ? 'بريد رئيسي'
                                      : CATEGORY_LABELS[acc.category]}
                                  </span>
                                  {(linkedAppsCount > 0 || (acc.registeredSites?.length || 0) > 0) && (
                                    <>
                                      <span aria-hidden="true">·</span>
                                      <span className="tabular-nums text-indigo-600 dark:text-indigo-400">
                                        {linkedAppsCount + (acc.registeredSites?.length || 0)} مواقع وتطبيقات
                                      </span>
                                    </>
                                  )}
                                  {acc.accountRegion && (
                                    <>
                                      <span aria-hidden="true">·</span>
                                      <span>{acc.accountRegion}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {pwdRisks.length > 0 && (
                                <AlertTriangle
                                  className="w-4 h-4 text-rose-500"
                                  aria-label={pwdRisks.join(' - ')}
                                />
                              )}
                              {acc.twoFactorEnabled && (
                                <ShieldCheck
                                  className="w-4 h-4 text-emerald-600 dark:text-emerald-400"
                                  aria-label="محمي بالتحقق بخطوتين"
                                />
                              )}
                            </div>
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
                                    {privacyMode ? '••••••@••••' : acc.emailAddress}
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
                                    {privacyMode ? '••••••' : acc.username}
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
                              <div className="space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-slate-400 shrink-0">كلمة المرور</span>
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span
                                      className="font-mono text-slate-800 dark:text-slate-200 truncate"
                                      dir="ltr"
                                    >
                                      {pwdRevealed && !privacyMode ? acc.password : '••••••••••'}
                                    </span>
                                    {!privacyMode && (
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
                                    )}
                                    <button
                                      type="button"
                                      onClick={(e) =>
                                        copyQuick(e, acc.password, `pw_${acc.id}`, true, `كلمة مرور ${acc.title}`)
                                      }
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
                                <div className="h-0.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full ${
                                      pwdEval.tier === 'excellent' || pwdEval.tier === 'strong'
                                        ? 'bg-emerald-500'
                                        : pwdEval.tier === 'fair'
                                          ? 'bg-amber-500'
                                          : 'bg-rose-500'
                                    }`}
                                    style={{ width: `${Math.max(12, pwdEval.score)}%` }}
                                  />
                                </div>
                              </div>
                            )}

                            {!privacyMode && (acc.registeredSites?.length || 0) > 0 && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate pt-1">
                                مسجّل به: {acc.registeredSites.slice(0, 3).map((s) => s.name).join(' · ')}
                                {acc.registeredSites.length > 3 ? ` (+${acc.registeredSites.length - 3})` : ''}
                              </p>
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
                              ? `${createdDur.label}${acc.createdDateApproximate ? ' ~' : ''}`
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

          {activeSection === 'sites' && (
            <SitesDirectoryView
              accounts={accounts}
              realBirthdate={preferences.realBirthdate}
              onSelectAccount={(acc) => setSelectedAccountId(acc.id)}
              onAddQuickSite={handleAddQuickSite}
              onCopySecret={copySecretWithTimer}
            />
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
              onManageSites={(parentAccount) => openEditAccountModal(parentAccount, 'sites')}
              onAddNewEmail={() =>
                openNewAccountModal({
                  recordType: 'email',
                  platformKey: 'gmail',
                  category: 'email',
                })
              }
              onExportEmailTree={(email, linkedApps) =>
                openExcelModal(
                  [email, ...linkedApps],
                  `شجرة ${email.title} (${email.emailAddress || 'بريد رئيسي'})`,
                  email.platformKey || 'email-tree'
                )
              }
            />
          )}

          {activeSection === 'totp' && (
            <AuthenticatorHubView
              accounts={accounts}
              onSelectAccount={(acc) => setSelectedAccountId(acc.id)}
              onCopySecret={copySecretWithTimer}
            />
          )}

          {activeSection === 'dates' && (
            <DatesTimelineView
              accounts={accounts}
              realBirthdate={preferences.realBirthdate}
              onSelectAccount={(acc) => setSelectedAccountId(acc.id)}
            />
          )}

          {activeSection === 'subscriptions' && (
            <SubscriptionsView
              accounts={accounts}
              onSelectAccount={(acc) => setSelectedAccountId(acc.id)}
            />
          )}

          {activeSection === 'audit' && (
            <SecurityAuditView
              accounts={accounts}
              realBirthdate={preferences.realBirthdate}
              onEditAccount={(acc) => openEditAccountModal(acc)}
              onSelectAccount={(acc) => setSelectedAccountId(acc.id)}
              onRotatePassword={handleRotatePassword}
              onCopySecret={copySecretWithTimer}
            />
          )}

          {activeSection === 'generator' && (
            <PasswordGeneratorView onCopySecret={copySecretWithTimer} />
          )}

          {activeSection === 'settings' && (
            <SettingsView
              preferences={preferences}
              accounts={accounts}
              onSavePreferences={handleSavePreferences}
              onImportAccounts={handleImportAccounts}
              onSeedSampleData={handleSeedSampleData}
              onOpenExcelExport={() => openExcelModal()}
            />
          )}
        </main>
      </div>

      {/* Floating Clipboard Auto-Clear Countdown Toast */}
      {clipboardTimer && (
        <div className="fixed bottom-4 left-4 z-50 bg-slate-900 dark:bg-slate-800 text-white border border-slate-700 rounded-xl px-4 py-3 shadow-xl flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-indigo-400 shrink-0" />
            <div>
              <p className="font-medium">تم نسخ: {clipboardTimer.label}</p>
              <p className="text-slate-400 tabular-nums">
                سيتم مسح الحافظة تلقائياً خلال {clipboardTimer.secondsLeft} ث
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={clearClipboardNow}
              className="px-2.5 py-1 rounded-md bg-rose-600 hover:bg-rose-700 text-white font-medium cursor-pointer"
            >
              مسح الآن
            </button>
            <button
              type="button"
              onClick={() => setClipboardTimer(null)}
              className="p-1 text-slate-400 hover:text-white cursor-pointer"
              aria-label="إلغاء المسح التلقائي"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      <AccountModal
        isOpen={modalOpen}
        editingAccount={editingAccount}
        initialDraftOverrides={draftOverrides}
        initialTab={modalInitialTab}
        allAccounts={accounts}
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
        onEdit={(acc, tab) => openEditAccountModal(acc, tab)}
        onDelete={handleDeleteAccount}
        onToggleFavorite={handleToggleFavorite}
        onAddLinkedApp={(parentAccount) =>
          openNewAccountModal({
            recordType: 'app',
            parentEmailId: parentAccount.id,
            emailAddress: parentAccount.emailAddress,
            registeredBirthdate: parentAccount.registeredBirthdate,
          })
        }
        onAddQuickSite={handleAddQuickSite}
        onUpdateQuickSite={handleUpdateQuickSite}
        onRemoveQuickSite={handleRemoveQuickSite}
        onPromoteSiteToAccount={handlePromoteSiteToAccount}
        onRotatePassword={handleRotatePassword}
        onMarkAccessedToday={handleMarkAccessedToday}
        onDuplicateAccount={handleDuplicateAccount}
        onExportExcel={(acc, linkedApps) =>
          openExcelModal(
            [acc, ...linkedApps],
            `${acc.title}${linkedApps.length > 0 ? ` (+${linkedApps.length} مرتبطة)` : ''}`,
            acc.platformKey || 'account'
          )
        }
        onCopySecret={copySecretWithTimer}
      />

      <CommandPalette
        isOpen={commandPaletteOpen}
        accounts={accounts}
        onClose={() => setCommandPaletteOpen(false)}
        onSelectAccount={(acc) => setSelectedAccountId(acc.id)}
        onCopySecret={copySecretWithTimer}
        onNewAccount={() => openNewAccountModal()}
        onOpenGenerator={() => setActiveSection('generator')}
        onOpenExcelExport={() => openExcelModal()}
      />

      <ExcelExportModal
        isOpen={excelModalOpen}
        accounts={excelScope ? excelScope.accounts : accounts}
        realBirthdate={preferences.realBirthdate}
        ownerUsername={user.username}
        scopeLabel={excelScope?.scopeLabel}
        customFileSuffix={excelScope?.customFileSuffix}
        onClose={() => {
          setExcelModalOpen(false);
          setExcelScope(null);
        }}
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
