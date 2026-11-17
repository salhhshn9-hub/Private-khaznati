import React, { useState } from 'react';
import {
  Calendar,
  Eye,
  EyeOff,
  KeyRound,
  Link2,
  Lock,
  Moon,
  ShieldCheck,
  Sun,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import { OfflineIndicator } from './PWAInstallButton';

interface AuthScreenProps {
  onLogin: (params: {
    username: string;
    password: string;
    birthdate: string;
    rememberDevice: boolean;
  }) => Promise<void>;
  onRegister: (params: {
    username: string;
    password: string;
    birthdate: string;
    rememberDevice: boolean;
  }) => Promise<void>;
  registeredUsersCount: number;
  signingIn: boolean;
  authError: string | null;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onLogin,
  onRegister,
  registeredUsersCount,
  signingIn,
  authError,
  theme,
  onToggleTheme,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(
    registeredUsersCount > 0 ? 'login' : 'register'
  );
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [rememberDevice, setRememberDevice] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!username.trim()) {
      setLocalError('يرجى إدخال اسم المستخدم.');
      return;
    }
    if (!password) {
      setLocalError('يرجى إدخال كلمة المرور.');
      return;
    }
    if (!birthdate) {
      setLocalError('يرجى إدخال تاريخ الميلاد.');
      return;
    }

    if (mode === 'register') {
      if (password.length < 4) {
        setLocalError('كلمة المرور يجب أن تكون 4 أحرف أو أرقام على الأقل.');
        return;
      }
      if (password !== confirmPassword) {
        setLocalError('كلمتا المرور غير متطابقتين.');
        return;
      }
      await onRegister({
        username: username.trim(),
        password,
        birthdate,
        rememberDevice,
      });
    } else {
      await onLogin({
        username: username.trim(),
        password,
        birthdate,
        rememberDevice,
      });
    }
  };

  const displayError = localError || authError;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Top Bar */}
      <header className="w-full border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-8">
          <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
            <Lock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span className="text-lg font-bold tracking-tight">خَزْنَتِي</span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-600 dark:text-slate-400">
            <span className="whitespace-nowrap shrink-0">خريطة الإيميلات</span>
            <span className="whitespace-nowrap shrink-0">التواريخ الحيوية</span>
            <span className="whitespace-nowrap shrink-0">تدقيق الأمان</span>
          </nav>

          <button
            type="button"
            onClick={onToggleTheme}
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            aria-label="تبديل المظهر"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span>{theme === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي'}</span>
          </button>
        </div>
      </header>

      {/* Main 2-column Auth Workspace */}
      <main className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Form Column */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-7 lg:p-10 flex flex-col justify-between space-y-7">
            <div className="space-y-3">
              <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                نسخة محلية مستقلة · تعمل بدون حساب Google أو إنترنت
              </p>
              <h1 className="text-2xl lg:text-3xl font-bold leading-snug text-balance">
                افتح خزنتك الخاصة باسم المستخدم وكلمة المرور وتاريخ الميلاد
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                تحفظ جميع إيميلاتك وحساباتك وتواريخ الميلاد والإنشاء محلياً داخل جهازك بأمان تام، مع دعم النسخ الاحتياطي والاستيراد.
              </p>
            </div>

            {/* Mode Switcher */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setLocalError(null);
                }}
                className={`py-2.5 px-3 text-xs font-semibold rounded-md flex items-center justify-center gap-2 transition-colors whitespace-nowrap cursor-pointer ${
                  mode === 'login'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                <span>تسجيل الدخول</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setLocalError(null);
                }}
                className={`py-2.5 px-3 text-xs font-semibold rounded-md flex items-center justify-center gap-2 transition-colors whitespace-nowrap cursor-pointer ${
                  mode === 'register'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                <span>إنشاء خزنة جديدة</span>
              </button>
            </div>

            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
              {displayError && (
                <div className="p-3 rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/50 text-xs text-rose-700 dark:text-rose-300">
                  {displayError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="auth-username" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    اسم المستخدم
                  </label>
                  <input
                    id="auth-username"
                    type="text"
                    autoComplete="username"
                    dir="ltr"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="salem_97"
                    className="w-full px-3.5 py-2.5 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="auth-birthdate" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    تاريخ الميلاد
                  </label>
                  <input
                    id="auth-birthdate"
                    type="date"
                    dir="ltr"
                    value={birthdate}
                    onChange={(e) => setBirthdate(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className={`grid grid-cols-1 ${mode === 'register' ? 'sm:grid-cols-2' : ''} gap-4`}>
                <div className="space-y-1.5">
                  <label htmlFor="auth-password" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    كلمة المرور
                  </label>
                  <div className="relative">
                    <input
                      id="auth-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                      dir="ltr"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                      aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {mode === 'register' && (
                  <div className="space-y-1.5">
                    <label htmlFor="auth-confirm-password" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      تأكيد كلمة المرور
                    </label>
                    <input
                      id="auth-confirm-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      dir="ltr"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2.5 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-4 pt-1">
                <label className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberDevice}
                    onChange={(e) => setRememberDevice(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>إبقاء تسجيل الدخول محفوظاً على هذا الجهاز</span>
                </label>

                {registeredUsersCount > 0 && (
                  <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    حسابات محفوظة: {registeredUsersCount}
                  </span>
                )}
              </div>

              <button
                type="submit"
                disabled={signingIn}
                className="w-full py-3 px-6 text-sm font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-60 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>
                  {signingIn
                    ? 'جاري الفتح...'
                    : mode === 'register'
                      ? 'إنشاء الخزنة والدخول'
                      : 'دخول إلى الخزنة'}
                </span>
              </button>
            </form>

            {/* Quick Feature Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>ربط الإيميل بالتطبيقات</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>تواريخ الميلاد والإنشاء</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>تدقيق الأمان والتكرار</span>
              </div>
              <div className="flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>تعمل بدون إنترنت</span>
              </div>
            </div>
          </div>

          {/* Right Artwork Column */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col">
            <div className="relative flex-1 min-h-[260px] bg-slate-900">
              {!imgError ? (
                <img
                  src="/src/assets/images/vault_security_art_1794861464643.jpg"
                  alt="خزنة أمان رقمية لحفظ الحسابات وكلمات المرور"
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-slate-300 bg-gradient-to-br from-slate-800 to-slate-950">
                  <ShieldCheck className="w-16 h-16 text-indigo-400 mb-4" />
                  <p className="text-sm font-medium">خَزْنَتِي المستقلة</p>
                </div>
              )}
            </div>
            <div className="p-6 bg-slate-900 text-slate-200 border-t border-slate-800 space-y-2">
              <p className="text-sm font-semibold">حفظ محلي مستقل وسريع</p>
              <p className="text-xs text-slate-400 leading-relaxed">
                يُستخدم تاريخ ميلادك عند التسجيل كمرجع تلقائي لمقارنته مع تواريخ الميلاد المسجّلة في كل إيميل وتطبيق، مع إمكانية تصدير نسخة احتياطية JSON في أي وقت.
              </p>
            </div>
          </div>
        </div>
      </main>
      <OfflineIndicator />
    </div>
  );
};
