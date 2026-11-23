import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Edit3,
  KeyRound,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { VaultAccount } from '../types/vault';
import {
  analyzePasswordRisks,
  buildVaultAuditReport,
  evaluatePasswordStrength,
  formatReadableDate,
  generateSecurePassword,
} from '../utils/vaultHelpers';
import { PlatformIcon } from './PlatformIcon';

interface SecurityAuditViewProps {
  accounts: VaultAccount[];
  realBirthdate: string;
  onEditAccount: (acc: VaultAccount) => void;
  onSelectAccount: (acc: VaultAccount) => void;
  onRotatePassword: (acc: VaultAccount, newPassword: string, note: string) => Promise<void>;
  onCopySecret: (value: string, label: string) => void;
}

export const SecurityAuditView: React.FC<SecurityAuditViewProps> = ({
  accounts,
  realBirthdate,
  onEditAccount,
  onSelectAccount,
  onRotatePassword,
  onCopySecret,
}) => {
  const [rotatingId, setRotatingId] = useState<string | null>(null);
  const [rotatedFeedback, setRotatedFeedback] = useState<{
    accountTitle: string;
    newPassword: string;
  } | null>(null);
  const [copiedNew, setCopiedNew] = useState(false);

  const report = useMemo(
    () => buildVaultAuditReport(accounts, realBirthdate),
    [accounts, realBirthdate]
  );

  const strengthStats = useMemo(() => {
    let excellent = 0;
    let strong = 0;
    let fair = 0;
    let weak = 0;
    let missing = 0;
    for (const acc of accounts) {
      if (!acc.password) {
        missing++;
        continue;
      }
      const ev = evaluatePasswordStrength(acc.password);
      if (ev.tier === 'excellent') excellent++;
      else if (ev.tier === 'strong') strong++;
      else if (ev.tier === 'fair') fair++;
      else weak++;
    }
    return { excellent, strong, fair, weak, missing };
  }, [accounts]);

  const patternRisks = useMemo(() => {
    const items: { account: VaultAccount; reasons: string[] }[] = [];
    for (const acc of accounts) {
      const reasons = analyzePasswordRisks(acc, realBirthdate);
      if (reasons.length > 0) {
        items.push({ account: acc, reasons });
      }
    }
    return items;
  }, [accounts, realBirthdate]);

  const twoFactorCoverage = useMemo(() => {
    if (accounts.length === 0) return 0;
    const count = accounts.filter((a) => a.twoFactorEnabled).length;
    return Math.round((count / accounts.length) * 100);
  }, [accounts]);

  const totalFindings =
    report.reusedPasswordGroups.length +
    report.weakPasswordAccounts.length +
    report.birthdateMismatches.length +
    report.noTwoFactorAccounts.length +
    patternRisks.length;

  const handleQuickRotate = async (acc: VaultAccount, reasonNote: string) => {
    setRotatingId(acc.id);
    try {
      const nextPwd = generateSecurePassword({
        length: 18,
        uppercase: true,
        lowercase: true,
        numbers: true,
        symbols: true,
      });
      await onRotatePassword(acc, nextPwd, reasonNote);
      setRotatedFeedback({ accountTitle: acc.title, newPassword: nextPwd });
      setCopiedNew(false);
    } finally {
      setRotatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold">مركز التدقيق الأمني وكشف المخاطر الذكي</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            تحليل محلي شامل لقوة كلمات المرور، التكرار، تطابق التواريخ، والبيانات الشخصية المكشوفة داخل كلمات السر
          </p>
        </div>
      </div>

      {rotatedFeedback && (
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-emerald-800 dark:text-emerald-200">
              تم تدوير كلمة مرور "{rotatedFeedback.accountTitle}" وحفظ القديمة في الأرشيف
            </p>
            <p className="text-xs font-mono text-emerald-700 dark:text-emerald-300" dir="ltr">
              {rotatedFeedback.newPassword}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onCopySecret(
                  rotatedFeedback.newPassword,
                  `كلمة مرور ${rotatedFeedback.accountTitle}`
                );
                setCopiedNew(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
            >
              {copiedNew ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedNew ? 'تم النسخ' : 'نسخ كلمة المرور الجديدة'}</span>
            </button>
            <button
              type="button"
              onClick={() => setRotatedFeedback(null)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 cursor-pointer"
            >
              إخفاء
            </button>
          </div>
        </div>
      )}

      {/* Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-xs text-slate-500 dark:text-slate-400">تغطية التحقق 2FA</span>
          <p className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
            {twoFactorCoverage}%
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-xs text-slate-500 dark:text-slate-400">كلمات مرور مكررة</span>
          <p className="text-2xl font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400">
            {report.reusedPasswordGroups.length}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-xs text-slate-500 dark:text-slate-400">كلمات ضعيفة / مكشوفة</span>
          <p className="text-2xl font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400">
            {report.weakPasswordAccounts.length + patternRisks.length}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-xs text-slate-500 dark:text-slate-400">تباين تواريخ الميلاد</span>
          <p className="text-2xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">
            {report.birthdateMismatches.length}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-xs text-slate-500 dark:text-slate-400">بدون تحقق بخطوتين</span>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
            {report.noTwoFactorAccounts.length}
          </p>
        </div>
      </div>

      {/* Password Strength Distribution Visual Bar */}
      {accounts.length > 0 && (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>توزيع قوة كلمات المرور في الخزنة</span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                ممتازة: {strengthStats.excellent}
              </span>
              <span aria-hidden="true">·</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                قوية: {strengthStats.strong}
              </span>
              <span aria-hidden="true">·</span>
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                متوسطة: {strengthStats.fair}
              </span>
              <span aria-hidden="true">·</span>
              <span className="text-rose-600 dark:text-rose-400 font-medium">
                ضعيفة: {strengthStats.weak}
              </span>
              {strengthStats.missing > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>بدون كلمة: {strengthStats.missing}</span>
                </>
              )}
            </div>
          </div>

          <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
            {strengthStats.excellent > 0 && (
              <div
                style={{ width: `${(strengthStats.excellent / accounts.length) * 100}%` }}
                className="bg-emerald-500 h-full"
                title={`ممتازة: ${strengthStats.excellent}`}
              />
            )}
            {strengthStats.strong > 0 && (
              <div
                style={{ width: `${(strengthStats.strong / accounts.length) * 100}%` }}
                className="bg-indigo-500 h-full"
                title={`قوية: ${strengthStats.strong}`}
              />
            )}
            {strengthStats.fair > 0 && (
              <div
                style={{ width: `${(strengthStats.fair / accounts.length) * 100}%` }}
                className="bg-amber-500 h-full"
                title={`متوسطة: ${strengthStats.fair}`}
              />
            )}
            {strengthStats.weak > 0 && (
              <div
                style={{ width: `${(strengthStats.weak / accounts.length) * 100}%` }}
                className="bg-rose-500 h-full"
                title={`ضعيفة: ${strengthStats.weak}`}
              />
            )}
          </div>
        </section>
      )}

      {accounts.length > 0 && totalFindings === 0 && report.missingDatesAccounts.length === 0 && (
        <div className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900 rounded-xl p-8 flex items-center gap-4">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div>
            <h3 className="text-sm font-bold">الخزنة في حالة ممتازة</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              جميع حساباتك تستخدم كلمات مرور فريدة وقوية وتواريخ ميلاد متطابقة مع تفعيل التحقق بخطوتين.
            </p>
          </div>
        </div>
      )}

      {/* Pattern Risks (Personal Info inside Password) */}
      {patternRisks.length > 0 && (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 text-sm font-semibold">
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            <span>كلمات مرور تحتوي بيانات شخصية أو أنماطاً سهلة التخمين ({patternRisks.length})</span>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {patternRisks.map(({ account, reasons }) => (
              <div
                key={account.id}
                className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-4"
              >
                <button
                  type="button"
                  onClick={() => onSelectAccount(account)}
                  className="flex items-center gap-3 text-right min-w-0 cursor-pointer"
                >
                  <PlatformIcon
                    platformKey={account.platformKey}
                    recordType={account.recordType}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{account.title}</p>
                    <p className="text-xs text-rose-600 dark:text-rose-400">
                      {reasons.join(' · ')}
                    </p>
                  </div>
                </button>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={rotatingId === account.id}
                    onClick={() =>
                      void handleQuickRotate(account, 'تدوير لإزالة البيانات الشخصية من كلمة المرور')
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-60 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{rotatingId === account.id ? 'جاري التدوير...' : 'توليد وتدوير فوري'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 1. Birthdate Mismatch Section */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>سجل اختلافات تواريخ الميلاد بين الحسابات</span>
          </div>
          {realBirthdate && (
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums" dir="ltr">
              ميلادك المرجعي: {formatReadableDate(realBirthdate)}
            </span>
          )}
        </div>

        {report.birthdateMismatches.length === 0 ? (
          <p className="px-5 py-4 text-xs text-slate-500 dark:text-slate-400">
            لا توجد اختلافات مسجلة في تواريخ الميلاد حالياً.
          </p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {report.birthdateMismatches.map(({ account, siteName, siteBirthdate, reason }, idx) => (
              <div
                key={`${account.id}_${siteName || 'main'}_${idx}`}
                className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-4"
              >
                <button
                  type="button"
                  onClick={() => onSelectAccount(account)}
                  className="flex items-center gap-3 text-right min-w-0 cursor-pointer"
                >
                  <PlatformIcon
                    platformKey={account.platformKey}
                    recordType={account.recordType}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{account.title}</p>
                    <p className="text-xs text-amber-600 dark:text-amber-400">{reason}</p>
                  </div>
                </button>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-xs font-mono tabular-nums text-slate-700 dark:text-slate-300" dir="ltr">
                    {formatReadableDate(siteBirthdate || account.registeredBirthdate)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onEditAccount(account)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>مراجعة</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 2. Reused Passwords */}
      {report.reusedPasswordGroups.length > 0 && (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 text-sm font-semibold">
            <KeyRound className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            <span>كلمات مرور مكررة عبر أكثر من حساب</span>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {report.reusedPasswordGroups.map((group, idx) => (
              <div key={idx} className="p-5 space-y-3">
                <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                  كلمة المرور ({group.passwordMasked}) مستخدمة في {group.accounts.length} حسابات:
                </p>
                <div className="flex flex-wrap gap-2.5">
                  {group.accounts.map((acc) => (
                    <div
                      key={acc.id}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs"
                    >
                      <button
                        type="button"
                        onClick={() => onSelectAccount(acc)}
                        className="inline-flex items-center gap-2 font-medium hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                      >
                        <PlatformIcon
                          platformKey={acc.platformKey}
                          recordType={acc.recordType}
                          size="sm"
                        />
                        <span>{acc.title}</span>
                      </button>
                      <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">|</span>
                      <button
                        type="button"
                        disabled={rotatingId === acc.id}
                        onClick={() =>
                          void handleQuickRotate(acc, 'تدوير تلقائي لإلغاء التكرار')
                        }
                        className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
                      >
                        {rotatingId === acc.id ? '...' : 'تغيير فوري'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. Weak Passwords & Missing 2FA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 text-sm font-semibold">
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            <span>كلمات مرور ضعيفة ({report.weakPasswordAccounts.length})</span>
          </div>
          {report.weakPasswordAccounts.length === 0 ? (
            <p className="px-5 py-4 text-xs text-slate-500 dark:text-slate-400">
              لا توجد كلمات مرور ضعيفة.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {report.weakPasswordAccounts.map((acc) => (
                <div key={acc.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => onSelectAccount(acc)}
                    className="text-sm font-medium hover:text-indigo-600 cursor-pointer"
                  >
                    {acc.title}
                  </button>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={rotatingId === acc.id}
                      onClick={() => void handleQuickRotate(acc, 'تدوير فوري لتقوية كلمة المرور')}
                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      {rotatingId === acc.id ? 'جاري التدوير...' : 'توليد وتدوير فوري'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onEditAccount(acc)}
                      className="text-xs text-slate-500 hover:underline cursor-pointer"
                    >
                      تعديل
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 text-sm font-semibold">
            <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>حسابات بدون تحقق بخطوتين ({report.noTwoFactorAccounts.length})</span>
          </div>
          {report.noTwoFactorAccounts.length === 0 ? (
            <p className="px-5 py-4 text-xs text-slate-500 dark:text-slate-400">
              جميع الحسابات النشطة محمية بالتحقق بخطوتين.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {report.noTwoFactorAccounts.map((acc) => (
                <div key={acc.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => onSelectAccount(acc)}
                    className="text-sm font-medium hover:text-indigo-600 cursor-pointer"
                  >
                    {acc.title}
                  </button>
                  <button
                    type="button"
                    onClick={() => onEditAccount(acc)}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    تحديث الحالة
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* 4. Old Passwords & Missing Dates */}
      {(report.oldPasswordAccounts.length > 0 || report.missingDatesAccounts.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {report.oldPasswordAccounts.length > 0 && (
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 text-sm font-semibold">
                <RefreshCw className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>كلمات مرور قديمة لم تتغير منذ +180 يوماً ({report.oldPasswordAccounts.length})</span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {report.oldPasswordAccounts.map(({ account: acc, daysSinceChange }) => (
                  <div key={acc.id} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{acc.title}</p>
                      <p className="text-xs text-slate-500 font-mono tabular-nums" dir="ltr">
                        آخر تغيير: {formatReadableDate(acc.lastPasswordChangedAt)} ({daysSinceChange}d)
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={rotatingId === acc.id}
                      onClick={() => void handleQuickRotate(acc, 'تحديث دوري بعد 180 يوماً')}
                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      {rotatingId === acc.id ? 'جاري التدوير...' : 'تدوير الآن'}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {report.missingDatesAccounts.length > 0 && (
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 text-sm font-semibold">
                <Clock className="w-4 h-4 text-slate-500" />
                <span>حسابات ينقصها تاريخ الميلاد أو الإنشاء ({report.missingDatesAccounts.length})</span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {report.missingDatesAccounts.map((acc) => (
                  <div key={acc.id} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{acc.title}</p>
                      <p className="text-xs text-slate-500">
                        {!acc.registeredBirthdate && !acc.accountCreatedAt
                          ? 'ينقصه تاريخ الميلاد وتاريخ الإنشاء'
                          : !acc.registeredBirthdate
                            ? 'ينقصه تاريخ الميلاد المسجل'
                            : 'ينقصه تاريخ إنشاء الحساب'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onEditAccount(acc)}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      إكمال التواريخ
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};
