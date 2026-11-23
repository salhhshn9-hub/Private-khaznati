import React, { useMemo } from 'react';
import { Calendar, CreditCard, RefreshCw } from 'lucide-react';
import { SubscriptionCurrency, VaultAccount } from '../types/vault';
import {
  CURRENCY_LABELS,
  SUBSCRIPTION_LABELS,
  formatReadableDate,
} from '../utils/vaultHelpers';
import { PlatformIcon } from './PlatformIcon';

interface SubscriptionsViewProps {
  accounts: VaultAccount[];
  onSelectAccount: (acc: VaultAccount) => void;
}

interface SubscriptionRow {
  id: string;
  title: string;
  parentTitle?: string;
  platformKey: string;
  recordType: 'email' | 'app';
  cycleLabel: string;
  costDisplay: string;
  amount: number;
  currency: SubscriptionCurrency;
  isMonthly: boolean;
  isYearly: boolean;
  autoRenew: boolean;
  renewalDate: string;
  daysLeft: number | null;
  paymentHint: string;
  targetAccount: VaultAccount;
}

function getDaysUntil(dateStr: string): number | null {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const target = new Date(`${dateStr}T00:00:00`).getTime();
  if (Number.isNaN(target)) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target - today.getTime()) / (1000 * 60 * 60 * 24));
}

export const SubscriptionsView: React.FC<SubscriptionsViewProps> = ({
  accounts,
  onSelectAccount,
}) => {
  const rows = useMemo<SubscriptionRow[]>(() => {
    const items: SubscriptionRow[] = [];

    for (const acc of accounts) {
      const hasPaidStatus =
        acc.subscriptionStatus === 'monthly' ||
        acc.subscriptionStatus === 'yearly' ||
        acc.subscriptionStatus === 'lifetime';
      if (hasPaidStatus || acc.subscriptionAmount > 0 || acc.subscriptionCost || acc.renewalDate) {
        const currency = acc.subscriptionCurrency || 'SAR';
        const costDisplay =
          acc.subscriptionAmount > 0
            ? `${acc.subscriptionAmount} ${CURRENCY_LABELS[currency]}`
            : acc.subscriptionCost || SUBSCRIPTION_LABELS[acc.subscriptionStatus];

        items.push({
          id: `acc_${acc.id}`,
          title: acc.title,
          platformKey: acc.platformKey,
          recordType: acc.recordType,
          cycleLabel: SUBSCRIPTION_LABELS[acc.subscriptionStatus],
          costDisplay,
          amount: acc.subscriptionAmount || 0,
          currency,
          isMonthly: acc.subscriptionStatus === 'monthly',
          isYearly: acc.subscriptionStatus === 'yearly',
          autoRenew: acc.autoRenew,
          renewalDate: acc.renewalDate,
          daysLeft: getDaysUntil(acc.renewalDate),
          paymentHint: acc.linkedPaymentHint,
          targetAccount: acc,
        });
      }

      for (const site of acc.registeredSites || []) {
        if (site.subscriptionCost || site.renewalDate) {
          items.push({
            id: `site_${acc.id}_${site.id}`,
            title: site.name,
            parentTitle: acc.title,
            platformKey: site.platformKey || 'custom',
            recordType: 'app',
            cycleLabel: 'اشتراك موقع مرتبط',
            costDisplay: site.subscriptionCost || 'مفعل',
            amount: 0,
            currency: 'SAR',
            isMonthly: false,
            isYearly: false,
            autoRenew: false,
            renewalDate: site.renewalDate,
            daysLeft: getDaysUntil(site.renewalDate),
            paymentHint: site.linkedCardHint || acc.linkedPaymentHint,
            targetAccount: acc,
          });
        }
      }
    }

    return items.sort((a, b) => {
      if (a.renewalDate && b.renewalDate) return a.renewalDate.localeCompare(b.renewalDate);
      if (a.renewalDate) return -1;
      if (b.renewalDate) return 1;
      return a.title.localeCompare(b.title);
    });
  }, [accounts]);

  const currencyTotals = useMemo(() => {
    const totals = new Map<SubscriptionCurrency, { monthly: number; yearly: number; count: number }>();
    for (const r of rows) {
      if (r.amount <= 0) continue;
      const curr = totals.get(r.currency) || { monthly: 0, yearly: 0, count: 0 };
      curr.count += 1;
      if (r.isMonthly) {
        curr.monthly += r.amount;
        curr.yearly += r.amount * 12;
      } else if (r.isYearly) {
        curr.monthly += r.amount / 12;
        curr.yearly += r.amount;
      }
      totals.set(r.currency, curr);
    }
    return Array.from(totals.entries());
  }, [rows]);

  const upcomingCount = rows.filter((r) => r.daysLeft !== null && r.daysLeft <= 14).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold">الاشتراكات ومواعيد التجديد</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          متابعة كل اشتراكاتك الشهرية والسنوية، البطاقات المربوطة بها، والتنبيه قبل موعد التجديد
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-xs text-slate-500 dark:text-slate-400">الاشتراكات المسجلة</span>
          <p className="text-2xl font-bold font-mono tabular-nums">{rows.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-xs text-slate-500 dark:text-slate-400">تجديد خلال 14 يوماً</span>
          <p
            className={`text-2xl font-bold font-mono tabular-nums ${
              upcomingCount > 0 ? 'text-amber-600 dark:text-amber-400' : ''
            }`}
          >
            {upcomingCount}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-1.5">
          <span className="text-xs text-slate-500 dark:text-slate-400">إجمالي التكلفة المقدّرة</span>
          {currencyTotals.length === 0 ? (
            <p className="text-xs text-slate-400">أضف المبلغ الرقمي في تعديل الحساب لعرض الإجمالي</p>
          ) : (
            <div className="space-y-1">
              {currencyTotals.map(([curr, vals]) => (
                <p key={curr} className="text-xs font-mono tabular-nums font-semibold">
                  {vals.monthly.toFixed(2)} / شهر · {vals.yearly.toFixed(0)} / سنة ({curr})
                </p>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Subscriptions Table */}
      {rows.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center space-y-2">
          <CreditCard className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-sm font-semibold">لا توجد اشتراكات مسجلة بعد</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            من تبويب «الأجهزة والملاحظات» في أي حساب يمكنك تحديد باقة الاشتراك والمبلغ وتاريخ التجديد.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((row) => {
            const isOverdue = row.daysLeft !== null && row.daysLeft < 0;
            const isSoon = row.daysLeft !== null && row.daysLeft >= 0 && row.daysLeft <= 14;

            return (
              <div
                key={row.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <PlatformIcon platformKey={row.platformKey} recordType={row.recordType} size="sm" />
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold truncate">{row.title}</p>
                      {row.parentTitle && (
                        <span className="text-xs text-slate-400 truncate">· تابع لـ {row.parentTitle}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span>{row.cycleLabel}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                        {row.costDisplay}
                      </span>
                      {row.paymentHint && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>الدفع: {row.paymentHint}</span>
                        </>
                      )}
                      {row.autoRenew && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                            <RefreshCw className="w-3 h-3" />
                            <span>تجديد تلقائي</span>
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                  <div className="text-right sm:text-left tabular-nums">
                    <div className="inline-flex items-center gap-1.5 text-xs font-mono">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span dir="ltr">{formatReadableDate(row.renewalDate)}</span>
                    </div>
                    {row.daysLeft !== null && (
                      <p
                        className={`text-xs font-medium ${
                          isOverdue
                            ? 'text-rose-600 dark:text-rose-400'
                            : isSoon
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {isOverdue
                          ? `متأخر منذ ${Math.abs(row.daysLeft)} يوم`
                          : row.daysLeft === 0
                            ? 'يتجدد اليوم'
                            : `متبقي ${row.daysLeft} يوم`}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectAccount(row.targetAccount)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    فتح الحساب
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
