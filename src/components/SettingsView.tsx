import React, { useState } from 'react';
import {
  Calendar,
  Database,
  Download,
  FileSpreadsheet,
  KeyRound,
  Lock,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { VaultAccount, VaultPreferences } from '../types/vault';
import {
  decryptVaultBackup,
  encryptVaultBackup,
  exportAccountsToCsv,
  hashPin,
  parseBrowserPasswordsCsv,
} from '../utils/vaultHelpers';

interface SettingsViewProps {
  preferences: VaultPreferences;
  accounts: VaultAccount[];
  onSavePreferences: (updates: Partial<VaultPreferences>) => Promise<void>;
  onImportAccounts: (rawAccounts: unknown[]) => Promise<number>;
  onSeedSampleData: () => Promise<void>;
  onOpenExcelExport: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  preferences,
  accounts,
  onSavePreferences,
  onImportAccounts,
  onSeedSampleData,
  onOpenExcelExport,
}) => {
  const [realBirthdate, setRealBirthdate] = useState(preferences.realBirthdate || '');
  const [autoLockMinutes, setAutoLockMinutes] = useState(preferences.autoLockMinutes ?? 15);
  const [clipboardClearSeconds, setClipboardClearSeconds] = useState(
    preferences.clipboardClearSeconds ?? 30
  );
  const [newPin, setNewPin] = useState('');
  const [savingBase, setSavingBase] = useState(false);
  const [savingPin, setSavingPin] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Encrypted backup export/import states
  const [showEncExport, setShowEncExport] = useState(false);
  const [encExportPass, setEncExportPass] = useState('');
  const [encExportConfirm, setEncExportConfirm] = useState('');
  const [encrypting, setEncrypting] = useState(false);

  const [pendingEncryptedRaw, setPendingEncryptedRaw] = useState<string | null>(null);
  const [encImportPass, setEncImportPass] = useState('');
  const [decrypting, setDecrypting] = useState(false);

  const handleSaveBaseline = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBase(true);
    setStatusMessage(null);
    try {
      await onSavePreferences({ realBirthdate, autoLockMinutes, clipboardClearSeconds });
      setStatusMessage('تم حفظ الإعدادات المرجعية والأمان بنجاح.');
    } finally {
      setSavingBase(false);
    }
  };

  const handleSetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.trim().length < 4) {
      setStatusMessage('يجب أن يتكون رمز القفل من 4 أرقام أو أحرف على الأقل.');
      return;
    }
    setSavingPin(true);
    setStatusMessage(null);
    try {
      const hashed = await hashPin(newPin.trim());
      await onSavePreferences({ vaultPinHash: hashed });
      setNewPin('');
      setStatusMessage('تم تفعيل رمز قفل الخزنة.');
    } finally {
      setSavingPin(false);
    }
  };

  const handleRemovePin = async () => {
    setSavingPin(true);
    setStatusMessage(null);
    try {
      await onSavePreferences({ vaultPinHash: '' });
      setStatusMessage('تم إلغاء قفل رمز PIN للخزنة.');
    } finally {
      setSavingPin(false);
    }
  };

  const triggerDownload = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      realBirthdate: preferences.realBirthdate,
      accounts: accounts.map(({ createdAt: _c, updatedAt: _u, ...rest }) => rest),
    };
    triggerDownload(
      JSON.stringify(payload, null, 2),
      `khaznati-backup-${new Date().toISOString().slice(0, 10)}.json`,
      'application/json'
    );
    setStatusMessage('تم تصدير النسخة الاحتياطية بصيغة JSON.');
  };

  const handleExportCsv = () => {
    const csv = exportAccountsToCsv(accounts);
    triggerDownload(
      csv,
      `khaznati-accounts-${new Date().toISOString().slice(0, 10)}.csv`,
      'text/csv;charset=utf-8'
    );
    setStatusMessage('تم تصدير جدول الحسابات والمواقع بصيغة CSV (متوافق مع Excel).');
  };

  const handleExportEncrypted = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);
    if (encExportPass.length < 6) {
      setStatusMessage('كلمة سر التشفير يجب أن لا تقل عن 6 أحرف.');
      return;
    }
    if (encExportPass !== encExportConfirm) {
      setStatusMessage('كلمتا سر التشفير غير متطابقتين.');
      return;
    }
    setEncrypting(true);
    try {
      const payload = {
        exportedAt: new Date().toISOString(),
        realBirthdate: preferences.realBirthdate,
        accounts: accounts.map(({ createdAt: _c, updatedAt: _u, ...rest }) => rest),
      };
      const encrypted = await encryptVaultBackup(payload, encExportPass);
      triggerDownload(
        encrypted,
        `khaznati-encrypted-${new Date().toISOString().slice(0, 10)}.json`,
        'application/json'
      );
      setEncExportPass('');
      setEncExportConfirm('');
      setShowEncExport(false);
      setStatusMessage('تم تصدير النسخة المشفرة AES-256 بنجاح.');
    } finally {
      setEncrypting(false);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatusMessage(null);
    setPendingEncryptedRaw(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Record<string, unknown>;
      if (parsed?.format === 'khaznati-encrypted-backup-v1') {
        setPendingEncryptedRaw(text);
        setEncImportPass('');
        setStatusMessage('هذا الملف مشفّر. أدخل كلمة سر فك التشفير بالأسفل لإتمام الاستيراد.');
        return;
      }

      const list = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.accounts)
          ? parsed.accounts
          : [];
      if (list.length === 0) {
        setStatusMessage('الملف لا يحتوي على حسابات صالحة للاستيراد.');
        return;
      }
      const importedCount = await onImportAccounts(list);
      setStatusMessage(`تم استيراد ${importedCount} سجل بنجاح إلى خزنتك.`);
    } catch {
      setStatusMessage('تعذّر قراءة ملف النسخة الاحتياطية. تأكد من صحة صيغة JSON.');
    } finally {
      e.target.value = '';
    }
  };

  const handleImportCsvFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatusMessage(null);
    try {
      const text = await file.text();
      const parsedDrafts = parseBrowserPasswordsCsv(text);
      if (parsedDrafts.length === 0) {
        setStatusMessage('لم يتم العثور على أعمدة صالحة في ملف CSV (تأكد من وجود أعمدة name/url/username/password).');
        return;
      }
      const importedCount = await onImportAccounts(parsedDrafts);
      setStatusMessage(`تم استيراد ${importedCount} حساب بنجاح من ملف المتصفح / CSV.`);
    } catch {
      setStatusMessage('تعذّر قراءة ملف CSV. تأكد من ترميز الملف وصحة الأعمدة.');
    } finally {
      e.target.value = '';
    }
  };

  const handleDecryptAndImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingEncryptedRaw || !encImportPass) return;
    setDecrypting(true);
    setStatusMessage(null);
    try {
      const decrypted = await decryptVaultBackup(pendingEncryptedRaw, encImportPass);
      const list = Array.isArray(decrypted.accounts) ? decrypted.accounts : [];
      if (list.length === 0) {
        setStatusMessage('تم فك التشفير ولكن الملف لا يحتوي على حسابات.');
        return;
      }
      const importedCount = await onImportAccounts(list);
      setPendingEncryptedRaw(null);
      setEncImportPass('');
      setStatusMessage(`تم فك التشفير واستيراد ${importedCount} سجل بنجاح.`);
    } catch {
      setStatusMessage('كلمة سر فك التشفير غير صحيحة أو الملف تالف.');
    } finally {
      setDecrypting(false);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    setStatusMessage(null);
    try {
      await onSeedSampleData();
      setStatusMessage('تمت إضافة بيانات تجريبية مترابطة لتجربة جميع المزايا.');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-lg font-bold">إعدادات الخزنة والأمان</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          ضبط تاريخ الميلاد المرجعي، مؤقت مسح الحافظة، قفل الخزنة برمز PIN، والنسخ الاحتياطي المشفر
        </p>
      </div>

      {statusMessage && (
        <div className="p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50 dark:bg-indigo-950/40 text-xs font-medium text-indigo-800 dark:text-indigo-200">
          {statusMessage}
        </div>
      )}

      {/* 1. Real Birthdate Baseline, Auto-Lock & Clipboard Timer */}
      <form
        onSubmit={(e) => void handleSaveBaseline(e)}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5"
      >
        <div className="flex items-center gap-2 text-sm font-bold">
          <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>تاريخ الميلاد المرجعي وإعدادات الخصوصية</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="pref-birthdate" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              تاريخ ميلادك الحقيقي (للمقارنة)
            </label>
            <input
              id="pref-birthdate"
              type="date"
              dir="ltr"
              value={realBirthdate}
              onChange={(e) => setRealBirthdate(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="pref-autolock" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              القفل التلقائي (بالدقائق، 0 للتعطيل)
            </label>
            <input
              id="pref-autolock"
              type="number"
              min={0}
              max={120}
              dir="ltr"
              value={autoLockMinutes}
              onChange={(e) => setAutoLockMinutes(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="pref-clipboard" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              مسح الحافظة بعد نسخ كلمة مرور
            </label>
            <select
              id="pref-clipboard"
              value={clipboardClearSeconds}
              onChange={(e) => setClipboardClearSeconds(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            >
              <option value={0}>معطل (لا تمسح تلقائياً)</option>
              <option value={15}>بعد 15 ثانية</option>
              <option value={30}>بعد 30 ثانية</option>
              <option value={60}>بعد دقيقة واحدة</option>
              <option value={120}>بعد دقيقتين</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={savingBase}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-60 transition-colors cursor-pointer"
          >
            {savingBase ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
          </button>
        </div>
      </form>

      {/* 2. Vault PIN Lock */}
      <form
        onSubmit={(e) => void handleSetPin(e)}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-bold">
            <Lock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>قفل الخزنة برمز سري (PIN)</span>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {preferences.vaultPinHash ? 'مفعّل حالياً' : 'غير مفعّل'}
          </span>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          يضيف طبقة حماية إضافية لقفل الشاشة أمام أي شخص يستخدم جهازك حتى بعد تسجيل دخولك.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <input
            type="password"
            inputMode="numeric"
            dir="ltr"
            value={newPin}
            onChange={(e) => setNewPin(e.target.value)}
            placeholder="أدخل رمزاً جديداً (4+ أرقام)"
            className="flex-1 min-w-[200px] px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
          />
          <button
            type="submit"
            disabled={savingPin}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors cursor-pointer"
          >
            {preferences.vaultPinHash ? 'تحديث الرمز' : 'تفعيل الرمز'}
          </button>
          {preferences.vaultPinHash && (
            <button
              type="button"
              disabled={savingPin}
              onClick={() => void handleRemovePin()}
              className="px-4 py-2 text-xs font-medium rounded-lg border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
            >
              إلغاء القفل
            </button>
          )}
        </div>
      </form>

      {/* 3. Backup Export / Import & Encrypted Archive */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-2 text-sm font-bold">
          <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>النسخ الاحتياطي، التصدير المشفّر، ونقل البيانات</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onOpenExcelExport}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>تصدير Excel الفخم (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={() => setShowEncExport((v) => !v)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer"
          >
            <KeyRound className="w-4 h-4" />
            <span>تصدير نسخة مشفّرة (AES-256)</span>
          </button>

          <button
            type="button"
            onClick={handleExportJson}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>تصدير JSON عادي</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>تصدير CSV خفيف</span>
          </button>

          <label className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>استيراد (JSON أو مشفر)</span>
            <input type="file" accept=".json,application/json" onChange={(e) => void handleImportFile(e)} className="hidden" />
          </label>

          <label className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer">
            <Upload className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>استيراد من متصفح (Chrome / Edge / CSV)</span>
            <input type="file" accept=".csv,text/csv" onChange={(e) => void handleImportCsvFile(e)} className="hidden" />
          </label>

          <button
            type="button"
            disabled={seeding}
            onClick={() => void handleSeed()}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors cursor-pointer"
          >
            <Database className="w-4 h-4" />
            <span>{seeding ? 'جاري الإضافة...' : 'إضافة أمثلة تجريبية'}</span>
          </button>
        </div>

        {/* Inline Encrypted Export Passphrase Form */}
        {showEncExport && (
          <form
            onSubmit={(e) => void handleExportEncrypted(e)}
            className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-3"
          >
            <p className="text-xs text-slate-600 dark:text-slate-300">
              اختر كلمة سر قوية لتشفير الملف؛ لن يتمكن أحد من قراءة الحسابات أو كلمات المرور بدونها.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="password"
                dir="ltr"
                required
                value={encExportPass}
                onChange={(e) => setEncExportPass(e.target.value)}
                placeholder="كلمة سر التشفير (6+ أحرف)"
                className="px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
              <input
                type="password"
                dir="ltr"
                required
                value={encExportConfirm}
                onChange={(e) => setEncExportConfirm(e.target.value)}
                placeholder="تأكيد كلمة السر"
                className="px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowEncExport(false)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={encrypting}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-60 cursor-pointer"
              >
                {encrypting ? 'جاري التشفير...' : 'تشفير وتنزيل الملف'}
              </button>
            </div>
          </form>
        )}

        {/* Inline Encrypted Import Passphrase Unlock */}
        {pendingEncryptedRaw && (
          <form
            onSubmit={(e) => void handleDecryptAndImport(e)}
            className="p-4 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50/40 dark:bg-amber-950/20 space-y-3"
          >
            <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
              ملف النسخة الاحتياطية مشفّر. أدخل كلمة سر فك التشفير لاستعادة الحسابات:
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="password"
                dir="ltr"
                required
                value={encImportPass}
                onChange={(e) => setEncImportPass(e.target.value)}
                placeholder="كلمة سر فك التشفير"
                className="flex-1 min-w-[200px] px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
              <button
                type="submit"
                disabled={decrypting}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-60 cursor-pointer"
              >
                {decrypting ? 'جاري فك التشفير...' : 'فك التشفير والاستيراد'}
              </button>
              <button
                type="button"
                onClick={() => setPendingEncryptedRaw(null)}
                className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
