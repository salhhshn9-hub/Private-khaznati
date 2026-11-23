import React, { useMemo, useState } from 'react';
import { Check, Copy, RefreshCw, ShieldCheck, UserCheck } from 'lucide-react';
import {
  PasswordGeneratorOptions,
  evaluatePasswordStrength,
  generatePassphrase,
  generateRandomUsername,
  generateSecurePassword,
} from '../utils/vaultHelpers';

interface PasswordGeneratorViewProps {
  onCopySecret?: (value: string, label: string) => void;
}

export const PasswordGeneratorView: React.FC<PasswordGeneratorViewProps> = ({
  onCopySecret,
}) => {
  const [genMode, setGenMode] = useState<'random' | 'passphrase'>('random');
  const [options, setOptions] = useState<PasswordGeneratorOptions>({
    length: 18,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
  });

  // Passphrase options
  const [wordCount, setWordCount] = useState(4);
  const [separator, setSeparator] = useState('-');
  const [capitalizeWords, setCapitalizeWords] = useState(true);
  const [includeNumber, setIncludeNumber] = useState(true);

  const [password, setPassword] = useState<string>(() =>
    generateSecurePassword({
      length: 18,
      uppercase: true,
      lowercase: true,
      numbers: true,
      symbols: true,
    })
  );
  const [copiedPwd, setCopiedPwd] = useState(false);

  // Live Password Checker
  const [testPassword, setTestPassword] = useState('');

  // Random Username Generator
  const [usernameBase, setUsernameBase] = useState('');
  const [generatedUsername, setGeneratedUsername] = useState<string>(() =>
    generateRandomUsername('')
  );
  const [copiedUser, setCopiedUser] = useState(false);

  const evaluation = useMemo(() => evaluatePasswordStrength(password), [password]);
  const testEvaluation = useMemo(() => evaluatePasswordStrength(testPassword), [testPassword]);

  const regenerate = (nextOpts: PasswordGeneratorOptions = options) => {
    setGenMode('random');
    setOptions(nextOpts);
    setPassword(generateSecurePassword(nextOpts));
    setCopiedPwd(false);
  };

  const regeneratePassphrase = (
    wc = wordCount,
    sep = separator,
    cap = capitalizeWords,
    num = includeNumber
  ) => {
    setGenMode('passphrase');
    setWordCount(wc);
    setSeparator(sep);
    setCapitalizeWords(cap);
    setIncludeNumber(num);
    setPassword(generatePassphrase(wc, sep, cap, num));
    setCopiedPwd(false);
  };

  const generatePin6 = () => {
    setGenMode('random');
    const arr = new Uint32Array(6);
    crypto.getRandomValues(arr);
    const pin = Array.from(arr, (v) => String(v % 10)).join('');
    setPassword(pin);
    setCopiedPwd(false);
  };

  const handleCopyPassword = () => {
    if (onCopySecret) {
      onCopySecret(password, 'كلمة المرور المولّدة');
    } else {
      void navigator.clipboard.writeText(password);
    }
    setCopiedPwd(true);
    setTimeout(() => setCopiedPwd(false), 1600);
  };

  const handleCopyUsername = () => {
    void navigator.clipboard.writeText(generatedUsername);
    setCopiedUser(true);
    setTimeout(() => setCopiedUser(false), 1600);
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-lg font-bold">مولّد كلمات المرور والعبارات السرية</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          توليد كلمات مرور عشوائية، عبارات سرية سهلة الحفظ والكتابة، فحص قوة أي كلمة مرور، واقتراح أسماء مستخدمين محلياً
        </p>
      </div>

      {/* 1. Password / Passphrase Generator */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-6">
        {/* Mode Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <button
              type="button"
              onClick={() => regenerate()}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                genMode === 'random'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              أحرف عشوائية
            </button>
            <button
              type="button"
              onClick={() => regeneratePassphrase()}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                genMode === 'passphrase'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              عبارة سرية (Passphrase)
            </button>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                regenerate({ length: 12, uppercase: true, lowercase: true, numbers: true, symbols: false })
              }
              className="px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              بسيطة (12)
            </button>
            <button
              type="button"
              onClick={() =>
                regenerate({ length: 18, uppercase: true, lowercase: true, numbers: true, symbols: true })
              }
              className="px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              متوازنة (18)
            </button>
            <button
              type="button"
              onClick={() =>
                regenerate({ length: 28, uppercase: true, lowercase: true, numbers: true, symbols: true })
              }
              className="px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              فائقة (28)
            </button>
            <button
              type="button"
              onClick={generatePin6}
              className="px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              PIN (6 أرقام)
            </button>
          </div>
        </div>

        {/* Output Display */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between gap-4">
          <span
            dir="ltr"
            className="text-lg sm:text-xl font-mono font-semibold tracking-wide break-all select-all text-slate-900 dark:text-slate-100"
          >
            {password}
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() =>
                genMode === 'passphrase' ? regeneratePassphrase() : regenerate()
              }
              className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="توليد جديد"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleCopyPassword}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {copiedPwd ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedPwd ? 'تم النسخ' : 'نسخ'}</span>
            </button>
          </div>
        </div>

        {/* Strength Meter */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-slate-600 dark:text-slate-400">مقياس القوة والوقت اللازم لكسرها</span>
            <span className="font-medium tabular-nums">
              {evaluation.label} · {evaluation.entropyBits} بت · كسرها يستغرق: {evaluation.crackEstimate}
            </span>
          </div>
          <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                evaluation.tier === 'weak'
                  ? 'bg-rose-500'
                  : evaluation.tier === 'fair'
                    ? 'bg-amber-500'
                    : evaluation.tier === 'strong'
                      ? 'bg-emerald-500'
                      : 'bg-indigo-600'
              }`}
              style={{ width: `${evaluation.score}%` }}
            />
          </div>
        </div>

        {genMode === 'random' ? (
          <>
            {/* Length Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="pwd-len-slider" className="font-medium text-slate-700 dark:text-slate-300">
                  طول كلمة المرور
                </label>
                <span className="font-mono font-bold tabular-nums">{options.length} حرف</span>
              </div>
              <input
                id="pwd-len-slider"
                type="range"
                min={8}
                max={40}
                value={options.length}
                onChange={(e) => regenerate({ ...options, length: Number(e.target.value) })}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            {/* Character Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(
                [
                  { key: 'uppercase', label: 'أحرف كبيرة (A–Z)' },
                  { key: 'lowercase', label: 'أحرف صغيرة (a–z)' },
                  { key: 'numbers', label: 'أرقام (0–9)' },
                  { key: 'symbols', label: 'رموز خاصة (!@#$%)' },
                ] as const
              ).map((item) => (
                <label
                  key={item.key}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40"
                >
                  <span className="text-xs font-medium">{item.label}</span>
                  <input
                    type="checkbox"
                    checked={options[item.key]}
                    onChange={(e) => {
                      const next = { ...options, [item.key]: e.target.checked };
                      if (!next.uppercase && !next.lowercase && !next.numbers && !next.symbols) return;
                      regenerate(next);
                    }}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </label>
              ))}
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="pp-words-slider" className="font-medium text-slate-700 dark:text-slate-300">
                  عدد الكلمات في العبارة السرية
                </label>
                <span className="font-mono font-bold tabular-nums">{wordCount} كلمات</span>
              </div>
              <input
                id="pp-words-slider"
                type="range"
                min={3}
                max={7}
                value={wordCount}
                onChange={(e) => regeneratePassphrase(Number(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="block text-xs text-slate-600 dark:text-slate-400">الفاصل بين الكلمات</label>
                <select
                  value={separator}
                  onChange={(e) => regeneratePassphrase(wordCount, e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="-">شرطة (-)</option>
                  <option value="_">شرطة سفلية (_)</option>
                  <option value=".">نقطة (.)</option>
                  <option value=" ">مسافة</option>
                </select>
              </div>
              <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer">
                <span className="text-xs font-medium">حرف كبير بالبداية</span>
                <input
                  type="checkbox"
                  checked={capitalizeWords}
                  onChange={(e) =>
                    regeneratePassphrase(wordCount, separator, e.target.checked, includeNumber)
                  }
                  className="rounded border-slate-300 text-indigo-600"
                />
              </label>
              <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer">
                <span className="text-xs font-medium">تضمين رقم</span>
                <input
                  type="checkbox"
                  checked={includeNumber}
                  onChange={(e) =>
                    regeneratePassphrase(wordCount, separator, capitalizeWords, e.target.checked)
                  }
                  className="rounded border-slate-300 text-indigo-600"
                />
              </label>
            </div>
          </div>
        )}
      </div>

      {/* 2. Live Password Strength Checker */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold">
          <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>فاحص قوة كلمة المرور الفوري</span>
        </div>

        <input
          type="text"
          dir="ltr"
          value={testPassword}
          onChange={(e) => setTestPassword(e.target.value)}
          placeholder="اكتب أو الصق أي كلمة مرور لاختبار متانتها محلياً..."
          className="w-full px-3.5 py-2.5 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
        />

        {testPassword && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs tabular-nums">
              <span>
                التقييم: <strong>{testEvaluation.label}</strong> ({testEvaluation.entropyBits} بت)
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                الزمن التقديري للتخمين: <strong>{testEvaluation.crackEstimate}</strong>
              </span>
            </div>
            <div className="h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  testEvaluation.tier === 'weak'
                    ? 'bg-rose-500'
                    : testEvaluation.tier === 'fair'
                      ? 'bg-amber-500'
                      : testEvaluation.tier === 'strong'
                        ? 'bg-emerald-500'
                        : 'bg-indigo-600'
                }`}
                style={{ width: `${testEvaluation.score}%` }}
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
              {[
                { ok: testPassword.length >= 12, text: '12+ حرف' },
                { ok: /[A-Z]/.test(testPassword), text: 'أحرف كبيرة' },
                { ok: /[a-z]/.test(testPassword), text: 'أحرف صغيرة' },
                { ok: /[0-9]/.test(testPassword), text: 'أرقام' },
                { ok: /[^a-zA-Z0-9]/.test(testPassword), text: 'رموز خاصة' },
              ].map((chk, idx) => (
                <div
                  key={idx}
                  className={`px-2.5 py-1.5 rounded-lg border text-center ${
                    chk.ok
                      ? 'border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20'
                      : 'border-slate-200 dark:border-slate-800 text-slate-400'
                  }`}
                >
                  {chk.text}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. Username Generator */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold">
          <UserCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>مولّد أسماء المستخدمين للتطبيقات</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            dir="ltr"
            value={usernameBase}
            onChange={(e) => {
              setUsernameBase(e.target.value);
              setGeneratedUsername(generateRandomUsername(e.target.value));
            }}
            placeholder="كلمة أساسية بالإنجليزية (اختياري، مثل salem)"
            className="flex-1 px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
          />
          <button
            type="button"
            onClick={() => setGeneratedUsername(generateRandomUsername(usernameBase))}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>اقتراح جديد</span>
          </button>
        </div>

        <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between gap-3">
          <span dir="ltr" className="text-sm font-mono font-semibold text-slate-900 dark:text-slate-100">
            @{generatedUsername}
          </span>
          <button
            type="button"
            onClick={handleCopyUsername}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            {copiedUser ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedUser ? 'تم النسخ' : 'نسخ'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
