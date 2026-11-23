import React, { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Search, ShieldCheck } from 'lucide-react';
import { VaultAccount } from '../types/vault';
import { generateTotpCode, TotpResult } from '../utils/totp';
import { PlatformIcon } from './PlatformIcon';

interface AuthenticatorHubViewProps {
  accounts: VaultAccount[];
  onSelectAccount: (acc: VaultAccount) => void;
  onCopySecret: (value: string, label: string) => void;
}

export const AuthenticatorHubView: React.FC<AuthenticatorHubViewProps> = ({
  accounts,
  onSelectAccount,
  onCopySecret,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [codes, setCodes] = useState<Record<string, TotpResult>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const totpAccounts = useMemo(
    () => accounts.filter((a) => Boolean(a.totpSecret && a.totpSecret.trim())),
    [accounts]
  );

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return totpAccounts;
    return totpAccounts.filter((a) =>
      `${a.title} ${a.emailAddress} ${a.username}`.toLowerCase().includes(q)
    );
  }, [totpAccounts, searchQuery]);

  useEffect(() => {
    if (totpAccounts.length === 0) {
      setCodes({});
      return;
    }

    let active = true;
    const refreshAll = async () => {
      const entries = await Promise.all(
        totpAccounts.map(async (acc) => {
          const res = await generateTotpCode(acc.totpSecret);
          return [acc.id, res] as const;
        })
      );
      if (!active) return;
      const next: Record<string, TotpResult> = {};
      for (const [id, res] of entries) {
        if (res) next[id] = res;
      }
      setCodes(next);
    };

    void refreshAll();
    const timer = window.setInterval(() => {
      void refreshAll();
    }, 1000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [totpAccounts]);

  const handleCopyCode = (acc: VaultAccount, code: string) => {
    onCopySecret(code, `رمز 2FA لـ ${acc.title}`);
    setCopiedId(acc.id);
    setTimeout(() => setCopiedId((c) => (c === acc.id ? null : c)), 1500);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold">مركز رموز المصادقة الحية (2FA Authenticator)</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          جميع رموز التحقق الثنائي الحية المتجددة كل 30 ثانية لحساباتك، محلياً بدون أي اتصال بالإنترنت
        </p>
      </div>

      {totpAccounts.length > 0 && (
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث باسم الحساب أو البريد..."
            className="w-full pr-10 pl-4 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
          />
        </div>
      )}

      {totpAccounts.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center space-y-3">
          <ShieldCheck className="w-10 h-10 text-emerald-600 dark:text-emerald-400 mx-auto" />
          <div className="space-y-1 max-w-md mx-auto">
            <p className="text-sm font-bold">لم تضف مفاتيح Authenticator (TOTP) بعد</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              من تبويب «الأمان والاسترداد» عند تعديل أي حساب، ألصق مفتاح TOTP السري ليتم توليد الرموز السداسية المتجددة هنا تلقائياً.
            </p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center text-xs text-slate-500">
          لا توجد حسابات مطابقة لبحثك.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((acc) => {
            const state = codes[acc.id];
            const pct = state ? (state.remainingSeconds / state.period) * 100 : 0;
            const lowTime = state ? state.remainingSeconds <= 5 : false;

            return (
              <div
                key={acc.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 flex flex-col justify-between"
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => onSelectAccount(acc)}
                    className="flex items-center gap-3 min-w-0 text-right hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                  >
                    <PlatformIcon
                      platformKey={acc.platformKey}
                      recordType={acc.recordType}
                      size="md"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">{acc.title}</p>
                      <p className="text-xs font-mono text-slate-500 truncate" dir="ltr">
                        {acc.emailAddress || acc.username}
                      </p>
                    </div>
                  </button>

                  {state && (
                    <span
                      className={`text-xs font-mono font-bold tabular-nums shrink-0 ${
                        lowTime
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {state.remainingSeconds} ث
                    </span>
                  )}
                </div>

                {state ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                      <span
                        dir="ltr"
                        className={`text-2xl font-mono font-bold tracking-widest tabular-nums ${
                          lowTime
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {state.code.slice(0, 3)} {state.code.slice(3)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyCode(acc, state.code)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                      >
                        {copiedId === acc.id ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>نُسخ</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>نسخ</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-1000 ${
                          lowTime ? 'bg-rose-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    تنسيق مفتاح TOTP غير صالح
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
