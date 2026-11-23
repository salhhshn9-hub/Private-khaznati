import React, { useMemo, useState } from 'react';
import {
  Calendar,
  Check,
  Copy,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Globe,
  Link2,
  Mail,
  Plus,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { VaultAccount } from '../types/vault';
import {
  SITE_SIGNUP_METHOD_LABELS,
  calculateAccountDuration,
  calculateAgeFromBirthdate,
  formatReadableDate,
} from '../utils/vaultHelpers';
import { PlatformIcon } from './PlatformIcon';

interface IdentityGraphViewProps {
  accounts: VaultAccount[];
  onSelectAccount: (acc: VaultAccount) => void;
  onAddLinkedApp: (parentEmail: VaultAccount) => void;
  onManageSites: (parentAccount: VaultAccount) => void;
  onAddNewEmail: () => void;
  onExportEmailTree?: (email: VaultAccount, linkedApps: VaultAccount[]) => void;
}

export const IdentityGraphView: React.FC<IdentityGraphViewProps> = ({
  accounts,
  onSelectAccount,
  onAddLinkedApp,
  onManageSites,
  onAddNewEmail,
  onExportEmailTree,
}) => {
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [treeSearch, setTreeSearch] = useState('');

  const { emailTrees, standaloneApps } = useMemo(() => {
    const emails = accounts.filter((a) => a.recordType === 'email');
    const apps = accounts.filter((a) => a.recordType === 'app');
    const emailById = new Map(emails.map((e) => [e.id, e]));
    const emailByAddress = new Map(
      emails
        .filter((e) => e.emailAddress.trim())
        .map((e) => [e.emailAddress.trim().toLowerCase(), e])
    );

    const childrenByEmailId = new Map<string, VaultAccount[]>();
    emails.forEach((e) => childrenByEmailId.set(e.id, []));

    const unlinked: VaultAccount[] = [];

    for (const app of apps) {
      let matchedParent: VaultAccount | undefined;
      if (app.parentEmailId && emailById.has(app.parentEmailId)) {
        matchedParent = emailById.get(app.parentEmailId);
      } else if (app.emailAddress.trim()) {
        matchedParent = emailByAddress.get(app.emailAddress.trim().toLowerCase());
      }

      if (matchedParent) {
        childrenByEmailId.get(matchedParent.id)?.push(app);
      } else {
        unlinked.push(app);
      }
    }

    const q = treeSearch.trim().toLowerCase();
    const matchesAccount = (acc: VaultAccount) => {
      const sitesText = (acc.registeredSites || [])
        .map((s) => `${s.name} ${s.url} ${s.username} ${s.notes}`)
        .join(' ');
      return `${acc.title} ${acc.emailAddress} ${acc.username} ${acc.accountRegion} ${sitesText}`
        .toLowerCase()
        .includes(q);
    };

    const allTrees = emails.map((email) => ({
      email,
      apps: childrenByEmailId.get(email.id) || [],
    }));

    const filteredTrees = !q
      ? allTrees
      : allTrees.filter(
          ({ email, apps: childApps }) =>
            matchesAccount(email) || childApps.some((c) => matchesAccount(c))
        );

    const filteredStandalone = !q ? unlinked : unlinked.filter(matchesAccount);

    return {
      emailTrees: filteredTrees,
      standaloneApps: filteredStandalone,
    };
  }, [accounts, treeSearch]);

  const copyText = (val: string, key: string) => {
    if (!val) return;
    void navigator.clipboard.writeText(val);
    setCopiedId(key);
    setTimeout(() => setCopiedId((c) => (c === key ? null : c)), 1500);
  };

  if (accounts.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center space-y-4">
        <Mail className="w-10 h-10 text-slate-400 mx-auto" />
        <div className="space-y-1">
          <h3 className="text-base font-semibold">لا توجد هويات بريدية مسجلة بعد</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            ابدأ بإضافة بريدك الإلكتروني الأساسي، ثم أضف تحته جميع المواقع والتطبيقات التي أنشأتها به لتظهر هنا في خريطة مترابطة.
          </p>
        </div>
        <button
          type="button"
          onClick={onAddNewEmail}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة أول بريد إلكتروني</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold">خريطة الإيميلات والمواقع والتطبيقات المرتبطة</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            استعرض كل بريد إلكتروني مع كامل التطبيقات والمواقع التي أنشأتها به وتواريخها الخاصة
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={treeSearch}
              onChange={(e) => setTreeSearch(e.target.value)}
              placeholder="ابحث عن إيميل أو موقع مرتبط..."
              className="pr-9 pl-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 w-60 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            type="button"
            onClick={onAddNewEmail}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة بريد رئيسي جديد</span>
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {emailTrees.map(({ email, apps }) => {
          const emailOpen = Boolean(revealedIds[email.id]);
          const emailAge = calculateAgeFromBirthdate(email.registeredBirthdate);
          const emailDuration = calculateAccountDuration(email.accountCreatedAt);
          const sites = email.registeredSites || [];
          const totalConnected = apps.length + sites.length;

          return (
            <div
              key={email.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden"
            >
              {/* Parent Email Header */}
              <div className="p-5 bg-slate-50/70 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                  <PlatformIcon platformKey={email.platformKey} recordType="email" size="lg" />
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onSelectAccount(email)}
                        className="text-base font-bold hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                      >
                        {email.title}
                      </button>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-xs font-mono text-slate-700 dark:text-slate-300" dir="ltr">
                        {email.emailAddress}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyText(email.emailAddress, `em_${email.id}`)}
                        className="p-1 text-slate-400 hover:text-indigo-600 cursor-pointer"
                        aria-label="نسخ الإيميل"
                      >
                        {copiedId === `em_${email.id}` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>
                          تاريخ الميلاد:{' '}
                          <strong className="font-mono text-slate-700 dark:text-slate-200">
                            {formatReadableDate(email.registeredBirthdate)}
                          </strong>
                          {emailAge !== null ? ` (${emailAge} سنة)` : ''}
                        </span>
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        تاريخ الإنشاء:{' '}
                        <strong className="font-mono text-slate-700 dark:text-slate-200">
                          {formatReadableDate(email.accountCreatedAt)}
                        </strong>
                        {emailDuration ? ` (${emailDuration.label})` : ''}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {totalConnected} مواقع وتطبيقات مرتبطة
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {email.password && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                      <span className="text-xs font-mono" dir="ltr">
                        {emailOpen ? email.password : '••••••••'}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setRevealedIds((p) => ({ ...p, [email.id]: !emailOpen }))
                        }
                        className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                        aria-label="كشف كلمة مرور الإيميل"
                      >
                        {emailOpen ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => copyText(email.password, `pwd_${email.id}`)}
                        className="p-1 text-slate-400 hover:text-indigo-600 cursor-pointer"
                        aria-label="نسخ كلمة مرور الإيميل"
                      >
                        {copiedId === `pwd_${email.id}` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  )}

                  {onExportEmailTree && (
                    <button
                      type="button"
                      onClick={() => onExportEmailTree(email, apps)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      title="تصدير هذا البريد وكل المواقع والتطبيقات التي بداخله وكلمات مرورها إلى ملف Excel"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>تصدير الشجرة لـ Excel</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onManageSites(email)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Globe className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>إضافة / إدارة المواقع</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onAddLinkedApp(email)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 bg-indigo-50/70 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-950/70 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>ربط تطبيق</span>
                  </button>
                </div>
              </div>

              {/* Connected Apps & Sites Table */}
              {totalConnected === 0 ? (
                <div className="px-6 py-5 text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center justify-between gap-2">
                  <span>لا توجد تطبيقات أو مواقع مسجّلة بهذا البريد حالياً.</span>
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => onManageSites(email)}
                      className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      إضافة مواقع أنشأتها بهذا البريد
                    </button>
                    <button
                      type="button"
                      onClick={() => onAddLinkedApp(email)}
                      className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      أو ربط تطبيق مستقل
                    </button>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                        <th className="py-2.5 px-5 font-medium">التطبيق / الموقع</th>
                        <th className="py-2.5 px-4 font-medium">نوع الربط / الدخول</th>
                        <th className="py-2.5 px-4 font-medium">اسم المستخدم</th>
                        <th className="py-2.5 px-4 font-medium">كلمة المرور</th>
                        <th className="py-2.5 px-4 font-medium">تاريخ الميلاد</th>
                        <th className="py-2.5 px-5 font-medium text-left">تاريخ الإنشاء / الحماية</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
                      {apps.map((app) => {
                        const open = Boolean(revealedIds[app.id]);
                        const birthDiffers =
                          email.registeredBirthdate &&
                          app.registeredBirthdate &&
                          email.registeredBirthdate !== app.registeredBirthdate;

                        return (
                          <tr
                            key={app.id}
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                          >
                            <td className="py-3 px-5">
                              <button
                                type="button"
                                onClick={() => onSelectAccount(app)}
                                className="flex items-center gap-2.5 text-right font-medium hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                              >
                                <PlatformIcon
                                  platformKey={app.platformKey}
                                  recordType="app"
                                  size="sm"
                                />
                                <span className="whitespace-nowrap">{app.title}</span>
                              </button>
                            </td>
                            <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400">
                              سجل تطبيق كامل
                            </td>
                            <td className="py-3 px-4 font-mono text-xs text-slate-700 dark:text-slate-300" dir="ltr">
                              <div className="flex items-center justify-end gap-1.5">
                                <span className="truncate max-w-[150px]">{app.username || '—'}</span>
                                {app.username && (
                                  <button
                                    type="button"
                                    onClick={() => copyText(app.username, `u_${app.id}`)}
                                    className="text-slate-400 hover:text-indigo-600 cursor-pointer"
                                    aria-label="نسخ اسم المستخدم"
                                  >
                                    {copiedId === `u_${app.id}` ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 font-mono text-xs" dir="ltr">
                              {app.password ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  <span>{open ? app.password : '••••••••'}</span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setRevealedIds((p) => ({ ...p, [app.id]: !open }))
                                    }
                                    className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                                    aria-label="إظهار كلمة المرور"
                                  >
                                    {open ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => copyText(app.password, `p_${app.id}`)}
                                    className="text-slate-400 hover:text-indigo-600 cursor-pointer"
                                    aria-label="نسخ كلمة المرور"
                                  >
                                    {copiedId === `p_${app.id}` ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-xs font-mono tabular-nums" dir="ltr">
                              <span
                                className={
                                  birthDiffers
                                    ? 'text-amber-600 dark:text-amber-400 font-semibold'
                                    : 'text-slate-700 dark:text-slate-300'
                                }
                              >
                                {formatReadableDate(app.registeredBirthdate)}
                              </span>
                            </td>
                            <td className="py-3 px-5 text-left text-xs">
                              <div className="inline-flex items-center gap-2 tabular-nums">
                                <span className="font-mono text-slate-600 dark:text-slate-400" dir="ltr">
                                  {formatReadableDate(app.accountCreatedAt)}
                                </span>
                                {app.twoFactorEnabled && (
                                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                      {sites.map((site) => {
                        const siteOpen = Boolean(revealedIds[`site_${site.id}`]);
                        const birthDiffers =
                          email.registeredBirthdate &&
                          site.registeredBirthdate &&
                          email.registeredBirthdate !== site.registeredBirthdate;

                        return (
                          <tr
                            key={site.id}
                            onClick={() => onSelectAccount(email)}
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                          >
                            <td className="py-3 px-5">
                              <div className="flex items-center gap-2.5 font-medium">
                                <PlatformIcon
                                  platformKey={site.platformKey}
                                  recordType="app"
                                  size="sm"
                                />
                                <span className="whitespace-nowrap">{site.name}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-xs text-indigo-600 dark:text-indigo-400">
                              {SITE_SIGNUP_METHOD_LABELS[site.signupMethod]}
                            </td>
                            <td className="py-3 px-4 font-mono text-xs text-slate-700 dark:text-slate-300" dir="ltr">
                              {site.username || '—'}
                            </td>
                            <td
                              className="py-3 px-4 font-mono text-xs"
                              dir="ltr"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {site.password ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  <span>{siteOpen ? site.password : '••••••••'}</span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setRevealedIds((p) => ({
                                        ...p,
                                        [`site_${site.id}`]: !siteOpen,
                                      }))
                                    }
                                    className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                                    aria-label="إظهار كلمة المرور"
                                  >
                                    {siteOpen ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => copyText(site.password, `sp_${site.id}`)}
                                    className="text-slate-400 hover:text-indigo-600 cursor-pointer"
                                    aria-label="نسخ"
                                  >
                                    {copiedId === `sp_${site.id}` ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>
                              ) : (
                                <span className="text-slate-400">مرتبط بالحساب</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-xs font-mono tabular-nums" dir="ltr">
                              <span
                                className={
                                  birthDiffers
                                    ? 'text-amber-600 dark:text-amber-400 font-semibold'
                                    : 'text-slate-700 dark:text-slate-300'
                                }
                              >
                                {formatReadableDate(site.registeredBirthdate)}
                              </span>
                            </td>
                            <td className="py-3 px-5 text-left text-xs font-mono tabular-nums text-slate-600 dark:text-slate-400" dir="ltr">
                              {formatReadableDate(site.createdAtDate)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}

        {/* Standalone Unlinked Apps */}
        {standaloneApps.length > 0 && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 text-sm font-semibold">
              <Link2 className="w-4 h-4 text-slate-500" />
              <span>حسابات وتطبيقات غير مربوطة ببريد في الخزنة ({standaloneApps.length})</span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {standaloneApps.map((app) => (
                <button
                  key={app.id}
                  type="button"
                  onClick={() => onSelectAccount(app)}
                  className="w-full px-5 py-3 flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-right transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <PlatformIcon platformKey={app.platformKey} recordType="app" size="sm" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {app.title}
                        {(app.registeredSites?.length || 0) > 0 && (
                          <span className="text-xs font-normal text-indigo-600 dark:text-indigo-400 mr-2">
                            · {app.registeredSites.length} مواقع فرعية
                          </span>
                        )}
                      </p>
                      <p className="text-xs font-mono text-slate-500 truncate" dir="ltr">
                        {app.emailAddress || app.username || 'بدون بريد'}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 font-mono tabular-nums shrink-0" dir="ltr">
                    {formatReadableDate(app.registeredBirthdate)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
