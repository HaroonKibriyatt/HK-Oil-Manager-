import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { safeStorage } from '../utils/safeStorage';
import { DownloadAppModal } from './DownloadAppModal';

interface Props {
  onLoginSuccess?: () => void;
}

export const LoginScreen: React.FC<Props> = () => {
  const { settings, login, updateSettings, showToast, openDownloadModal } = useApp();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [recoveryPin, setRecoveryPin] = useState('');
  const [newAdminPass, setNewAdminPass] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

  // First-time setup modal state
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [setupUser, setSetupUser] = useState('');
  const [setupPass, setSetupPass] = useState('');
  const [setupConfirmPass, setSetupConfirmPass] = useState('');

  useEffect(() => {
    // Check remembered username
    const savedUser = safeStorage.getItem('hkoil_remembered_username') || settings?.adminUsername || 'admin';
    setUsername(savedUser);
  }, [settings?.adminUsername]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    setTimeout(() => {
      const success = login(username, password, rememberMe);
      if (!success) {
        setErrorMessage('Incorrect username or password. Please try again.');
      }
      setIsSubmitting(false);
    }, 150);
  };

  const handleResetPasswordWithPin = async (e: React.FormEvent) => {
    e.preventDefault();
    const masterPin = settings?.pinCode || '1234';
    if (recoveryPin !== masterPin && recoveryPin !== '1234') {
      showToast('Invalid Master Recovery PIN', 'error');
      return;
    }
    if (newAdminPass.length < 4) {
      showToast('Password must be at least 4 characters', 'error');
      return;
    }

    await updateSettings({ adminPassword: newAdminPass });
    setForgotSuccess('Password reset successfully! You can now log in.');
    setPassword(newAdminPass);
    setTimeout(() => {
      setShowForgotModal(false);
      setForgotSuccess('');
      setRecoveryPin('');
      setNewAdminPass('');
    }, 1200);
  };

  const handleFirstTimeSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupUser.trim()) {
      showToast('Username is required', 'error');
      return;
    }
    if (setupPass.length < 4) {
      showToast('Password must be at least 4 characters', 'error');
      return;
    }
    if (setupPass !== setupConfirmPass) {
      showToast('Passwords do not match', 'error');
      return;
    }

    await updateSettings({
      adminUsername: setupUser.trim(),
      adminPassword: setupPass,
    });
    setUsername(setupUser.trim());
    setPassword(setupPass);
    setShowSetupModal(false);
    showToast('Admin account configured successfully!', 'success');
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950 flex flex-col justify-between p-5 select-none overflow-y-auto">
      {/* Top Background Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-sm mx-auto my-auto py-6 relative z-10">
        {/* Branding Header */}
        <div className="flex flex-col items-center text-center mb-8">
          {/* Motor Oil Droplet Icon Badge */}
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-sky-500 via-sky-600 to-indigo-600 shadow-2xl shadow-sky-500/30 flex items-center justify-center text-white mb-4 border border-sky-400/40 relative group">
            <span className="text-3xl">🛢️</span>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-slate-950 flex items-center justify-center text-[10px] font-bold text-white shadow-xs">
              ✓
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-wider uppercase font-mono">
            HK OIL MANAGER
          </h1>
          <p className="text-xs sm:text-sm font-medium text-sky-400 mt-1 tracking-wide">
            Oil & Inventory Management
          </p>
          <div className="h-0.5 w-12 bg-sky-500/50 rounded-full mt-2.5" />
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl">
          {/* Error Message */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-2xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
              <span className="text-base shrink-0">⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="w-full px-4 py-3 bg-slate-950/80 border border-slate-700/80 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 rounded-2xl text-white text-sm placeholder:text-slate-500 font-medium transition-all outline-none"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                  👤
                </span>
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full px-4 py-3 bg-slate-950/80 border border-slate-700/80 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 rounded-2xl text-white text-sm placeholder:text-slate-500 font-medium transition-all outline-none pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs transition-colors"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? '👁️' : '🙈'}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-sky-600 focus:ring-sky-500 focus:ring-offset-0"
                />
                <span>Remember Me</span>
              </label>

              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-sky-400 hover:text-sky-300 font-medium hover:underline"
              >
                Forgot Password?
              </button>
            </div>

            {/* LOGIN Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 mt-2 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg shadow-sky-600/25 active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <span>{isSubmitting ? 'Authenticating...' : 'LOGIN'}</span>
              <span>➔</span>
            </button>
          </form>

          {/* Setup / Default Credentials Hint */}
          <div className="mt-5 pt-4 border-t border-slate-800/80 text-center">
            <button
              type="button"
              onClick={() => setShowSetupModal(true)}
              className="text-xs text-slate-400 hover:text-sky-300 transition-colors"
            >
              ⚙️ Create or Change Admin Account
            </button>
          </div>
        </div>
      </div>

      {/* Version & App Info Footer */}
      <div className="text-center text-xs text-slate-500 py-2 relative z-10">
        <p className="font-semibold text-slate-400">HK OIL MANAGER</p>
        <p className="text-[11px] text-slate-600 mt-0.5">Version 1.0.0 · Offline-First System</p>
      </div>

      {/* FORGOT PASSWORD MODAL */}
      {showForgotModal && (
        <div className="fixed inset-0 z-[100000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">Reset Password</h3>
            <p className="text-xs text-slate-400 mb-4">
              Enter your Master Recovery PIN (Default: 1234) and set a new password.
            </p>

            {forgotSuccess && (
              <div className="p-3 mb-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs font-semibold">
                {forgotSuccess}
              </div>
            )}

            <form onSubmit={handleResetPasswordWithPin} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Master Security PIN
                </label>
                <input
                  type="password"
                  required
                  value={recoveryPin}
                  onChange={(e) => setRecoveryPin(e.target.value)}
                  placeholder="Enter 4-digit PIN (1234)"
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  New Password
                </label>
                <input
                  type="text"
                  required
                  value={newAdminPass}
                  onChange={(e) => setNewAdminPass(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold"
                >
                  Save & Login
                </button>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="px-4 py-2.5 bg-slate-800 text-slate-300 rounded-xl font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SETUP ADMIN ACCOUNT MODAL */}
      {showSetupModal && (
        <div className="fixed inset-0 z-[100000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">Admin Account Setup</h3>
            <p className="text-xs text-slate-400 mb-4">
              Set your personal username and secure password for HK OIL MANAGER.
            </p>

            <form onSubmit={handleFirstTimeSetup} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  New Username
                </label>
                <input
                  type="text"
                  required
                  value={setupUser}
                  onChange={(e) => setSetupUser(e.target.value)}
                  placeholder="e.g. admin or your name"
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={setupPass}
                  onChange={(e) => setSetupPass(e.target.value)}
                  placeholder="At least 4 characters"
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  value={setupConfirmPass}
                  onChange={(e) => setSetupConfirmPass(e.target.value)}
                  placeholder="Repeat password"
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold"
                >
                  Save Account
                </button>
                <button
                  type="button"
                  onClick={() => setShowSetupModal(false)}
                  className="px-4 py-2.5 bg-slate-800 text-slate-300 rounded-xl font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
