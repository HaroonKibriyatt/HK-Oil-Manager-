import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export const PinLockScreen: React.FC = () => {
  const { unlockWithPin, settings } = useApp();
  const [pin, setPin] = useState('');
  const [shake, setShake] = useState(false);

  const handleDigit = (digit: string) => {
    if (pin.length < 6) {
      const nextPin = pin + digit;
      setPin(nextPin);
      if (nextPin.length === 4 || nextPin.length === 6) {
        // Automatically test PIN on 4 digits
        if (unlockWithPin(nextPin)) {
          // Unlocked
        } else if (nextPin.length === 6) {
          triggerError();
        }
      }
    }
  };

  const triggerError = () => {
    setShake(true);
    setTimeout(() => {
      setShake(false);
      setPin('');
    }, 450);
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPin('');
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlockWithPin(pin)) {
      triggerError();
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-slate-950 flex flex-col items-center justify-between p-6 select-none">
      {/* Top Branding */}
      <div className="flex flex-col items-center mt-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 shadow-xl shadow-sky-600/30 flex items-center justify-center text-white mb-4 border border-sky-400/30">
          <svg className="w-9 h-9" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-white tracking-tight">
          {settings?.businessName || 'LubeFlow Pro'}
        </h1>
        <p className="text-xs text-slate-400 mt-1">Oil Inventory & Sales Security Lock</p>
      </div>

      {/* PIN Input Dots */}
      <div className="flex flex-col items-center">
        <p className="text-xs font-medium text-slate-400 mb-4 tracking-wide uppercase">
          Enter Security PIN
        </p>

        <div className={`flex items-center gap-4 mb-3 ${shake ? 'animate-bounce' : ''}`}>
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-4 h-4 rounded-full transition-all duration-200 border ${
                pin.length > idx
                  ? 'bg-sky-400 border-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.7)] scale-110'
                  : 'bg-slate-800/80 border-slate-700'
              }`}
            />
          ))}
        </div>

        <p className="text-[11px] text-slate-500">
          Default Master PIN: <span className="font-mono text-sky-400">{settings?.pinCode || '1234'}</span>
        </p>
      </div>

      {/* Keypad */}
      <div className="w-full max-w-xs grid grid-cols-3 gap-3 mb-6">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
          <button
            key={digit}
            type="button"
            onClick={() => handleDigit(digit)}
            className="h-16 rounded-2xl bg-slate-900/90 active:bg-sky-600/30 text-white text-2xl font-semibold border border-slate-800 hover:border-slate-700 flex items-center justify-center transition-all duration-150 active:scale-95 shadow-sm"
          >
            {digit}
          </button>
        ))}

        <button
          type="button"
          onClick={handleClear}
          className="h-16 rounded-2xl bg-slate-900/40 text-slate-400 hover:text-white text-xs font-semibold uppercase tracking-wider border border-slate-800/60 flex items-center justify-center active:scale-95"
        >
          Clear
        </button>

        <button
          type="button"
          onClick={() => handleDigit('0')}
          className="h-16 rounded-2xl bg-slate-900/90 active:bg-sky-600/30 text-white text-2xl font-semibold border border-slate-800 hover:border-slate-700 flex items-center justify-center transition-all duration-150 active:scale-95 shadow-sm"
        >
          0
        </button>

        <button
          type="button"
          onClick={handleDelete}
          className="h-16 rounded-2xl bg-slate-900/40 active:bg-rose-950/40 text-slate-400 hover:text-rose-400 text-lg border border-slate-800/60 flex items-center justify-center active:scale-95"
        >
          ⌫
        </button>
      </div>

      {/* Footer info */}
      <div className="text-center text-[11px] text-slate-600">
        100% Offline-Safe · Encrypted Local Session
      </div>
    </div>
  );
};
