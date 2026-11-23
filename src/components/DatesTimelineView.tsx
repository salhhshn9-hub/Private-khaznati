import React, { useMemo, useState } from 'react';
import { Calendar, Search } from 'lucide-react';
import { VaultAccount } from '../types/vault';
import {
  calculateAccountDuration,
  calculateAgeFromBirthdate,
  formatReadableDate,
} from '../utils/vaultHelpers';
import { PlatformIcon } from './PlatformIcon';

interface DatesTimelineViewProps {
  accounts: VaultAccount[];
  realBirthdate: string;
  onSelectAccount: (acc: VaultAccount) => void;
}

interface DateRow {
  rowKey: string;
  title: string;
  subtitle: string;
  platformKey: string;
  recordType: 'email' | 'app';
  emailOrParent: string;
  registeredBirthdate: string;
  createdDate: string;
  mismatch: boolean;
  targetAccount: VaultAccount;
}

export const DatesTimelineView: React.FC<DatesTimelineViewProps> = ({
  accounts,
  realBirthdate,
  onSelectAccount,
}) => {
  const [filterText, setFilterText] = useState('');
  const [onlyMismatches, setOnlyMismatches] = useState(false);
  const [includeSites, setIncludeSites] = useState(true);

  const accountById = useMemo(
    () => new Map(accounts.map((a) => [a.id, a])),
    [accounts]
  );

  const allRows = useMemo<DateRow[]>(() => {
    const rows: DateRow[] = [];

    for (const acc of accounts) {
      const parent = acc.parentEmailId ? accountById.get(acc.parentEmailId) : undefined;
      const mismatch = Boolean(
        (parent?.registeredBirthdate &&
          acc.registeredBirthdate &&
          parent.registeredBirthdate !== acc.registeredBirthdate) ||
          (realBirthdate &&
            acc.registeredBirthdate &&
            realBirthdate !== acc.registeredBirthdate)
      );

      rows.push({
        rowKey: acc.id,
        title: acc.title,
        subtitle: acc.recordType === 'email' ? 'بريد إلكتروني' : 'تطبيق / موقع',
        platformKey: acc.platformKey,
        recordType: acc.recordType,
        emailOrParent: acc.emailAddress || acc.username || '—',
        registeredBirthdate: acc.registeredBirthdate,
        createdDate: acc.accountCreatedAt,
        mismatch,
        targetAccount: acc,
      });

      if (includeSites && acc.registeredSites?.length) {
        for (const site of acc.registeredSites) {
          const siteMismatch = Boolean(
            (acc.registeredBirthdate &&
              site.registeredBirthdate &&
              acc.registeredBirthdate !== site.registeredBirthdate) ||
              (realBirthdate &&
                site.registeredBirthdate &&
                realBirthdate !== site.registeredBirthdate)
          );
          rows.push({
            rowKey: `${acc.id}_${site.id}`,
            title: site.name,
            subtitle: `موقع منشأ عبر: ${acc.title}`,
            platformKey: site.platformKey,
            recordType: 'app',
            emailOrParent: acc.emailAddress || acc.title,
            registeredBirthdate: site.registeredBirthdate,
            createdDate: site.createdAtDate,
            mismatch: siteMismatch,
            targetAccount: acc,
          });
        }
      }
    }

    return rows;
  }, [accounts, accountById, realBirthdate, includeSites]);

  const filtered = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    return allRows.filter((row) => {
      if (q) {
        const hay =
          `${row.title} ${row.subtitle} ${row.emailOrParent} ${row.registeredBirthdate} ${row.createdDate}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (onlyMismatches && !row.mismatch) return false;
      return true;
    });
  }, [allRows, filterText, onlyMismatches]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold">جدول تواريخ الميلاد والإنشاء لجميع الحسابات والمواقع</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            مرجع شامل يوضح تاريخ الميلاد المسجّل وعمر الحساب وتاريخ إنشائه في كل إيميل وتطبيق وموقع فرعي
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="ابحث بالسنة أو الإيميل أو الموقع..."
              className="pr-9 pl-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 w-60 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            type="button"
            onClick={() => setIncludeSites((v) => !v)}
            className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              includeSites
                ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
            }`}
          >
            تضمين المواقع الفرعية
          </button>

          <button
            type="button"
            onClick={() => setOnlyMismatches((v) => !v)}
            className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              onlyMismatches
                ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
            }`}
          >
            التواريخ المختلفة فقط
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <Calendar className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-sm font-medium">لا توجد سجلات مطابقة للتصفية</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-800/30">
                  <th className="py-3 px-5 font-medium">الحساب / الموقع</th>
                  <th className="py-3 px-4 font-medium">البريد المرتبط</th>
                  <th className="py-3 px-4 font-medium">تاريخ الميلاد المسجّل</th>
                  <th className="py-3 px-4 font-medium">العمر المسجّل</th>
                  <th className="py-3 px-4 font-medium">تاريخ إنشاء الحساب</th>
                  <th className="py-3 px-5 font-medium">عمر الحساب</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {filtered.map((row) => {
                  const regAge = calculateAgeFromBirthdate(row.registeredBirthdate);
                  const createdDur = calculateAccountDuration(row.createdDate);

                  return (
                    <tr
                      key={row.rowKey}
                      onClick={() => onSelectAccount(row.targetAccount)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <PlatformIcon
                            platformKey={row.platformKey}
                            recordType={row.recordType}
                            size="sm"
                          />
                          <div>
                            <p className="font-semibold text-sm">{row.title}</p>
                            <p className="text-xs text-slate-500">{row.subtitle}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-600 dark:text-slate-400" dir="ltr">
                        {row.emailOrParent}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs tabular-nums" dir="ltr">
                        <span
                          className={
                            row.mismatch
                              ? 'text-amber-600 dark:text-amber-400 font-semibold'
                              : 'text-slate-800 dark:text-slate-200'
                          }
                        >
                          {formatReadableDate(row.registeredBirthdate)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs tabular-nums text-slate-600 dark:text-slate-400">
                        {regAge !== null ? `${regAge} سنة` : '—'}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs tabular-nums text-slate-800 dark:text-slate-200" dir="ltr">
                        {formatReadableDate(row.createdDate)}
                      </td>
                      <td className="py-3.5 px-5 text-xs tabular-nums text-slate-600 dark:text-slate-400">
                        {createdDur ? createdDur.label : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
