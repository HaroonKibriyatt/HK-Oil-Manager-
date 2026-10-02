import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { useApp } from '../context/AppContext';

export const DownloadAppModal: React.FC = () => {
  const { isDownloadModalOpen, closeDownloadModal, showToast } = useApp();
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const GITHUB_REPO_URL = 'https://github.com/HaroonKibriyatt/HK-Oil-Manager';
  const GITHUB_ACTIONS_URL = 'https://github.com/HaroonKibriyatt/HK-Oil-Manager/actions';
  const GITHUB_RELEASES_URL = 'https://github.com/HaroonKibriyatt/HK-Oil-Manager/releases';

  useEffect(() => {
    if (isDownloadModalOpen) {
      QRCode.toDataURL(GITHUB_ACTIONS_URL, {
        width: 220,
        margin: 1,
        color: { dark: '#0f172a', light: '#ffffff' },
      })
        .then((url) => setQrCodeUrl(url))
        .catch(() => {});
    }
  }, [isDownloadModalOpen]);

  if (!isDownloadModalOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(GITHUB_ACTIONS_URL);
    setCopied(true);
    showToast('Download link copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center text-xl shadow-md shadow-emerald-600/20 shrink-0">
              <span>🤖</span>
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                Download HK Oil Manager App
              </h3>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                Android APK · Official GitHub Live Build
              </p>
            </div>
          </div>
          <button
            onClick={closeDownloadModal}
            className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-lg transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Top Hero Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-850 to-emerald-950 text-white border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-800">
                Native Android Build
              </span>
              <span className="text-xs text-slate-400 font-mono">v1.0.0 APK</span>
            </div>
            <div>
              <h4 className="text-sm sm:text-base font-bold text-white">
                HK Oil Manager Native Android APK
              </h4>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Install directly on your Android smartphone or tablet. Fast, offline-first, camera barcode scanning, and instant WhatsApp billing.
              </p>
            </div>
          </div>

          {/* Primary Action: Direct GitHub Actions Artifacts Link */}
          <div className="space-y-2">
            <a
              href={GITHUB_ACTIONS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl text-xs sm:text-sm font-extrabold shadow-md shadow-emerald-600/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer no-underline text-center"
            >
              <span className="text-lg">⬇️</span>
              <span>Download APK from GitHub Actions</span>
              <span className="bg-emerald-950/40 text-emerald-100 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">
                Artifact
              </span>
            </a>

            <div className="grid grid-cols-2 gap-2">
              <a
                href={GITHUB_RELEASES_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 no-underline text-center"
              >
                <span>🏷️</span>
                <span>GitHub Releases</span>
              </a>

              <a
                href={GITHUB_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 no-underline text-center"
              >
                <span>🐙</span>
                <span>GitHub Repository</span>
              </a>
            </div>
          </div>

          {/* Mobile QR Code Card */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            {qrCodeUrl ? (
              <img
                src={qrCodeUrl}
                alt="Scan to Download APK"
                className="w-28 h-28 object-contain rounded-xl bg-white p-1.5 border border-slate-200 shadow-xs shrink-0"
              />
            ) : (
              <div className="w-28 h-28 rounded-xl bg-slate-200 animate-pulse shrink-0" />
            )}
            <div className="space-y-1.5 min-w-0">
              <h5 className="font-extrabold text-xs text-slate-900 dark:text-white">
                Scan with Phone Camera
              </h5>
              <p className="text-[11px] text-slate-500 leading-normal">
                Point your mobile phone camera at this QR code to open the GitHub live download page on your phone.
              </p>
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1 px-3 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <span>{copied ? '✓ Copied' : '📋 Copy Download Link'}</span>
              </button>
            </div>
          </div>

          {/* Live GitHub URL Details */}
          <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Official GitHub Live URL
            </span>
            <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-mono text-[11px] text-sky-600 dark:text-sky-400 overflow-x-auto">
              <span className="truncate">{GITHUB_ACTIONS_URL}</span>
            </div>
          </div>

          {/* Quick 3-Step Install Guide */}
          <div className="space-y-2 text-xs">
            <h5 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider text-slate-400">
              How to Install on Android Phone:
            </h5>
            <ol className="space-y-2 text-slate-600 dark:text-slate-400 list-decimal list-inside text-[11px]">
              <li className="leading-relaxed">
                Click <strong>"Download APK from GitHub Actions"</strong> above (or open the link on your phone).
              </li>
              <li className="leading-relaxed">
                Click on the latest completed workflow, scroll down to <strong>Artifacts</strong>, and tap <strong>HK-Oil-Manager-APK</strong>.
              </li>
              <li className="leading-relaxed">
                Open <strong>HK-Oil-Manager.apk</strong> on your phone and tap <strong>Install</strong> (allow "Install unknown apps" if prompted).
              </li>
            </ol>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={closeDownloadModal}
            className="px-5 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
