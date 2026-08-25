import React, { useState, useEffect } from 'react';
import { LogOut, X, AlertTriangle, Loader2 } from 'lucide-react';

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  userEmail?: string | null;
  displayName?: string | null;
}

export const LogoutConfirmModal: React.FC<LogoutConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  userEmail,
  displayName
}) => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoggingOut) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoggingOut, onClose]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    try {
      setIsLoggingOut(true);
      await onConfirm();
      onClose();
    } catch (err) {
      console.error('Error during logout:', err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 font-['Plus_Jakarta_Sans',sans-serif] animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-modal-title"
    >
      <div
        className="bg-white border border-slate-200 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 text-center relative border-b border-slate-100 bg-slate-50/70">
          <button
            onClick={onClose}
            disabled={isLoggingOut}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 mx-auto flex items-center justify-center mb-3 shadow-xs">
            <AlertTriangle className="w-6 h-6" />
          </div>

          <h2 id="logout-modal-title" className="text-lg font-extrabold text-slate-900">
            Sign Out of NAVIGATE?
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Please confirm your action before signing out
          </p>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-4">
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs text-slate-600 leading-relaxed space-y-2">
            <p>
              Are you sure you want to sign out{displayName ? `, ` : ''}
              {displayName && <strong className="text-slate-800">{displayName}</strong>}?
            </p>
            {userEmail && (
              <p className="text-[11px] text-slate-500 font-mono truncate">
                Account: {userEmail}
              </p>
            )}
            <p className="text-[11px] text-amber-700 bg-amber-50/80 border border-amber-200/60 rounded-lg p-2 font-medium">
              💡 <strong>Tip:</strong> Any unsaved walkthrough edits or active recording sessions in progress should be saved before logging out.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoggingOut}
              className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all border border-slate-200 cursor-pointer disabled:opacity-50 text-center"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={isLoggingOut}
              className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-md shadow-rose-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-98"
            >
              {isLoggingOut ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing Out...</span>
                </>
              ) : (
                <>
                  <LogOut className="w-4 h-4" />
                  <span>Yes, Sign Out</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
