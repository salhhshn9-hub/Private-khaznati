import React, { useState } from 'react';
import { Check, FileSpreadsheet, Lock, ShieldCheck, X } from 'lucide-react';
import { VaultAccount } from '../types/vault';
import { exportLuxuryExcelWorkbook } from '../utils/excelExport';

interface ExcelExportModalProps {
  isOpen: boolean;
  accounts: VaultAccount[];
  realBirthdate: string;
  ownerUsername: string;
  scopeLabel?: string;
  customFileSuffix?: string;
  onClose: () => void;
  onExportComplete?: () => void;
}

export const ExcelExportModal: React.FC<ExcelExportModalProps> = ({
  isOpen,
  accounts,
  realBirthdate,
  ownerUsername,
  scopeLabel,
  customFileSuffix,
  onClose,
  onExportComplete,
}) => {
  // Default to TRUE so every email, nested site, password, PIN, and secret is exported cleanly
  const [includeSecrets, setIncludeSecrets] = useState(true);
  const [sheets, setSheets] = useState({
    summary: true,
    hierarchy: true,
    accounts: true,
    sites: true,
    subscriptions: true,
    historyAndFields: true,
    recovery: true,
  });
  const [exporting, setExporting] = useState(false);

  if (!isOpen) return null;

  const emailCount = accounts.filter((a) => a.recordType === 'email').length;
  const totalSites =
    accounts.filter((a) => a.recordType === 'app').length +
    accounts.reduce((sum, a) => sum + (a.registeredSites?.length || 0), 0);

  const anySheetSelected = Object.values(sheets).some(Boolean);

  const handleExport = async () => {
    if (!anySheetSelected) return;
    setExporting(true);
    try {
      await exportLuxuryExcelWorkbook({
        accounts,
        realBirthdate,
        ownerUsername,
        includeSecrets,
        scopeLabel,
        customFileSuffix,
        sheets,
      });
      onExportComplete?.();
      onClose();
    } finally {
      setExporting(false);
    }
  };

  const toggleSheet = (key: keyof typeof sheets) => {
    setSheets((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const sheetItems: { key: keyof typeof sheets; title: string; desc: string }[] = [
    {
      key: 'summary',
      title: '1. الملخص التنفيذي والمؤشرات',
      desc: 'لوحة القيادة، مؤشرات الأمان، وتوزيع التصنيفات بمعادلات SUM التلقائية',
    },
    {
      key: 'hierarchy',
      title: '2. الشجرة الشاملة (البريد وما بداخله بالكامل)',
      desc: `${emailCount} إيميل رئيسي يتبعه مباشرة كل ما بداخله من تطبيقات ومواقع وكلمات مرور وتواريخ`,
    },
    {
      key: 'accounts',
      title: '3. سجل الحسابات الرئيسية (32 حقل كامل)',
      desc: `${accounts.length} سجل شامل كلمة المرور، PIN، مفتاح 2FA، البصمة، الميلاد، الفواتير، والملاحظات`,
    },
    {
      key: 'sites',
      title: '4. المواقع والتطبيقات المرتبطة',
      desc: `${totalSites} موقع وتطبيق بروابط قابلة للنقر، اسم المستخدم، كلمة المرور، العمر، والجهاز`,
    },
    {
      key: 'subscriptions',
      title: '5. الاشتراكات والمدفوعات',
      desc: 'جدول الباقات ومواعيد التجديد مع إجماليات تلقائية حسب العملة (SUMIF)',
    },
    {
      key: 'historyAndFields',
      title: '6. سجل كلمات المرور والأحداث والحقول المخصصة',
      desc: 'أرشيف كلمات المرور السابقة المؤرشفة، جميع الحقول المخصصة، والمحطات الزمنية',
    },
    {
      key: 'recovery',
      title: '7. ملف الاسترداد والطوارئ',
      desc: 'بيانات استرجاع الحسابات، الأكواد الاحتياطية، أسئلة الأمان، وخطط الطوارئ',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold">
                تصدير مصنّف Excel التنفيذي الكامل (.xlsx)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {scopeLabel
                  ? `نطاق التصدير: ${scopeLabel} (${accounts.length} سجل)`
                  : '7 أوراق عمل عربية منسّقة (RTL) تشمل كل بريد وكل ما بداخله بالكامل'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Security Mode Selection */}
          <div className="space-y-2.5">
            <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              محتوى البيانات السرية داخل ملف الإكسل
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIncludeSecrets(true)}
                className={`p-3.5 rounded-xl border text-right transition-colors cursor-pointer space-y-1 ${
                  includeSecrets
                    ? 'border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/25'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">تصدير شامل بكل الأسرار</span>
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  يُصدّر الإيميلات وكل ما بداخلها مع كلمات المرور الكاملة، PIN، مفاتيح 2FA، والأكواد الاحتياطية.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setIncludeSecrets(false)}
                className={`p-3.5 rounded-xl border text-right transition-colors cursor-pointer space-y-1 ${
                  !includeSecrets
                    ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/30'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">نسخة آمنة بدون كلمات مرور</span>
                  <Lock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  تُظهر البريد والتفاصيل والمواقع والتواريخ مع إخفاء كلمات المرور (مناسبة للطباعة أو المراجعة).
                </p>
              </button>
            </div>
          </div>

          {/* Sheets Selection */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                أوراق العمل المشمولة في المصنّف (7 أوراق)
              </span>
              <button
                type="button"
                onClick={() => {
                  const allOn = Object.values(sheets).every(Boolean);
                  setSheets({
                    summary: !allOn,
                    hierarchy: !allOn,
                    accounts: !allOn,
                    sites: !allOn,
                    subscriptions: !allOn,
                    historyAndFields: !allOn,
                    recovery: !allOn,
                  });
                }}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                {Object.values(sheets).every(Boolean) ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
              </button>
            </div>
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800">
              {sheetItems.map((item) => {
                const checked = sheets[item.key];
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => toggleSheet(item.key)}
                    className="w-full px-4 py-3 flex items-start justify-between gap-3 text-right hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                  >
                    <div className="space-y-0.5">
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {item.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{item.desc}</p>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 ${
                        checked
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {checked && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            إلغاء
          </button>
          <button
            type="button"
            disabled={!anySheetSelected || exporting}
            onClick={() => void handleExport()}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{exporting ? 'جاري تجهيز المصنّف الفخم...' : 'تنزيل ملف Excel الشامل (.xlsx)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
