import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Copy,
  FileSpreadsheet,
  KeyRound,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { VaultAccount } from '../types/vault';
import { PlatformIcon } from './PlatformIcon';

interface CommandPaletteProps {
  isOpen: boolean;
  accounts: VaultAccount[];
  onClose: () => void;
  onSelectAccount: (acc: VaultAccount) => void;
  onCopySecret: (value: string, label: string) => void;
  onNewAccount: () => void;
  onOpenGenerator: () => void;
  onOpenExcelExport: () => void;
}

interface SearchHit {
  id: string;
  kind: 'account' | 'site' | 'action';
  title: string;
  subtitle: string;
  platformKey: string;
  recordType: 'email' | 'app';
  account?: VaultAccount;
  emailToCopy?: string;
  usernameToCopy?: string;
  passwordToCopy?: string;
  action?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  accounts,
  onClose,
  onSelectAccount,
  onCopySecret,
  onNewAccount,
  onOpenGenerator,
  onOpenExcelExport,
}) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [isOpen]);

  const hits = useMemo<SearchHit[]>(() => {
    const q = query.trim().toLowerCase();
    const list: SearchHit[] = [];

    for (const acc of accounts) {
      const hay = `${acc.title} ${acc.emailAddress} ${acc.username} ${acc.phoneNumber} ${acc.accountRegion} ${acc.notes}`.toLowerCase();
      if (!q || hay.includes(q)) {
        list.push({
          id: `acc_${acc.id}`,
          kind: 'account',
          title: acc.title,
          subtitle: acc.emailAddress || acc.username || 'سجل حساب',
          platformKey: acc.platformKey,
          recordType: acc.recordType,
          account: acc,
          emailToCopy: acc.emailAddress,
          usernameToCopy: acc.username,
          passwordToCopy: acc.password,
        });
      }

      for (const site of acc.registeredSites || []) {
        const sHay = `${site.name} ${site.username} ${site.url} ${acc.title} ${acc.emailAddress}`.toLowerCase();
        if (q && !sHay.includes(q)) continue;
        if (!q && list.length >= 8) continue;
        list.push({
          id: `site_${acc.id}_${site.id}`,
          kind: 'site',
          title: site.name,
          subtitle: `موقع مرتبط بـ ${acc.title}${site.username ? ` · ${site.username}` : ''}`,
          platformKey: site.platformKey || 'custom',
          recordType: 'app',
          account: acc,
          emailToCopy: acc.emailAddress,
          usernameToCopy: site.username,
          passwordToCopy: site.password || acc.password,
        });
      }
    }

    const quickActions: SearchHit[] = [
      {
        id: 'act_new',
        kind: 'action',
        title: 'إضافة إيميل أو حساب جديد',
        subtitle: 'فتح نافذة إنشاء سجل جديد',
        platformKey: 'custom',
        recordType: 'app',
        action: () => {
          onClose();
          onNewAccount();
        },
      },
      {
        id: 'act_gen',
        kind: 'action',
        title: 'فتح مولّد كلمات المرور والعبارات السرية',
        subtitle: 'توليد وفحص كلمات مرور عشوائية',
        platformKey: 'custom',
        recordType: 'app',
        action: () => {
          onClose();
          onOpenGenerator();
        },
      },
      {
        id: 'act_excel',
        kind: 'action',
        title: 'تصدير مصنّف Excel الفخم (.xlsx)',
        subtitle: 'تنزيل جدول شامل ومنسّق بكل الحسابات والمواقع',
        platformKey: 'custom',
        recordType: 'app',
        action: () => {
          onClose();
          onOpenExcelExport();
        },
      },
    ];

    const filteredActions = q
      ? quickActions.filter((a) => `${a.title} ${a.subtitle}`.toLowerCase().includes(q))
      : quickActions;

    return [...list.slice(0, 10), ...filteredActions];
  }, [accounts, query, onClose, onNewAccount, onOpenGenerator, onOpenExcelExport]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  if (!isOpen) return null;

  const triggerHit = (hit: SearchHit) => {
    if (hit.kind === 'action' && hit.action) {
      hit.action();
    } else if (hit.account) {
      onSelectAccount(hit.account);
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (hits.length ? (i + 1) % hits.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (hits.length ? (i - 1 + hits.length) % hits.length : 0));
    } else if (e.key === 'Enter' && hits[activeIndex]) {
      e.preventDefault();
      triggerHit(hits[activeIndex]);
    }
  };

  const copyQuickField = (e: React.MouseEvent, value: string, key: string, secret: boolean, label: string) => {
    e.stopPropagation();
    if (!value) return;
    if (secret) {
      onCopySecret(value, label);
    } else {
      void navigator.clipboard.writeText(value);
    }
    setCopiedId(key);
    setTimeout(() => setCopiedId((c) => (c === key ? null : c)), 1400);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4 bg-slate-950/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input */}
        <div className="px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <Search className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن أي حساب، إيميل، تطبيق، اسم مستخدم... (↑↓ للتنقل، Enter للفتح)"
            className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-slate-400"
          />
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
            aria-label="إغلاق البحث السريع"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/70">
          {hits.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              لا توجد نتائج مطابقة لـ «{query}»
            </div>
          ) : (
            hits.map((hit, idx) => {
              const isSelected = idx === activeIndex;
              return (
                <div
                  key={hit.id}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => triggerHit(hit)}
                  className={`px-4 py-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                    isSelected ? 'bg-indigo-50/70 dark:bg-indigo-950/40' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {hit.kind === 'action' ? (
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                        {hit.id === 'act_new' ? (
                          <Plus className="w-4 h-4" />
                        ) : hit.id === 'act_excel' ? (
                          <FileSpreadsheet className="w-4 h-4" />
                        ) : (
                          <KeyRound className="w-4 h-4" />
                        )}
                      </div>
                    ) : (
                      <PlatformIcon
                        platformKey={hit.platformKey}
                        recordType={hit.recordType}
                        size="sm"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate text-slate-900 dark:text-slate-100">
                        {hit.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {hit.subtitle}
                      </p>
                    </div>
                  </div>

                  {hit.kind !== 'action' && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      {(hit.usernameToCopy || hit.emailToCopy) && (
                        <button
                          type="button"
                          onClick={(e) =>
                            copyQuickField(
                              e,
                              hit.usernameToCopy || hit.emailToCopy || '',
                              `u_${hit.id}`,
                              false,
                              'المعرف'
                            )
                          }
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-indigo-400 cursor-pointer"
                        >
                          {copiedId === `u_${hit.id}` ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3 text-slate-400" />
                          )}
                          <span>المستخدم</span>
                        </button>
                      )}
                      {hit.passwordToCopy && (
                        <button
                          type="button"
                          onClick={(e) =>
                            copyQuickField(
                              e,
                              hit.passwordToCopy || '',
                              `p_${hit.id}`,
                              true,
                              `كلمة مرور ${hit.title}`
                            )
                          }
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                        >
                          {copiedId === `p_${hit.id}` ? (
                            <Check className="w-3 h-3" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>كلمة المرور</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Shortcut Hint */}
        <div className="px-4 py-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex items-center justify-between text-xs text-slate-500">
          <span>اختصار الفتح السريع: Ctrl + K</span>
          <span>ESC للإغلاق</span>
        </div>
      </div>
    </div>
  );
};
