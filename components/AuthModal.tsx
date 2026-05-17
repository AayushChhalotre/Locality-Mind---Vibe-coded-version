import React, { useState } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';
import { linkWithGoogle, loginWithGoogle, logout, auth } from '../services/firebaseClient';

interface AuthModalProps {
  onClose: () => void;
  isAnonymous: boolean;
  isLoggedIn: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, isAnonymous, isLoggedIn }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEmbedded = window.self !== window.top;

  const handleGoogleAuth = async () => {
    if (isEmbedded) {
      window.open(window.location.href, '_blank');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      if (isAnonymous) {
        await linkWithGoogle();
      } else {
        await loginWithGoogle();
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    await logout();
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden p-8">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"
        >
          <X size={20} />
        </button>

        <div className="mb-8">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">
            {isLoggedIn && !isAnonymous ? 'Account Settings' : 'Save Your Progress'}
          </h2>
          <p className="text-sm font-medium text-slate-500 leading-relaxed">
            {isLoggedIn && !isAnonymous
              ? 'You are currently signed in.'
              : 'Sign in with Google to save your historical searches across devices.'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-start gap-3 mb-6 text-sm font-medium">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <div>{error}</div>
          </div>
        )}

        {isLoggedIn && !isAnonymous ? (
          <div className="space-y-6">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="text-xs font-black uppercase text-slate-400 tracking-widest mb-1">Signed in as</div>
              <div className="font-semibold text-slate-900 truncate">{auth.currentUser?.email}</div>
            </div>
            <button
              onClick={handleLogout}
              disabled={loading}
              className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : 'Log Out'}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <button
              onClick={handleGoogleAuth}
              disabled={loading}
              className="w-full bg-white border border-slate-200 text-slate-900 font-bold py-4 rounded-2xl hover:bg-slate-50 transition-colors shadow-sm flex items-center justify-center gap-3"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  {isEmbedded ? 'Open in New Tab to Sign In' : 'Continue with Google'}
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
