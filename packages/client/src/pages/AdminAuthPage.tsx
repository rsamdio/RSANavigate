import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Compass,
  ShieldCheck
} from 'lucide-react';
import {
  loginWithGoogle,
  AuthorUser
} from '../services/firebase';

interface AdminAuthPageProps {
  onSuccess?: (user: AuthorUser) => void;
}

export const AdminAuthPage: React.FC<AdminAuthPageProps> = ({ onSuccess }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const targetRedirect = searchParams.get('redirect') || '/admin';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSuccessfulAuth = (user: AuthorUser) => {
    if (onSuccess) onSuccess(user);
    navigate(targetRedirect);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const user = await loginWithGoogle();
      handleSuccessfulAuth(user);
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center items-center p-6 relative font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Background light glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-blue-100/50 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Brand Header */}
      <Link to="/" className="flex items-center gap-3 mb-8 group">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0c3c60] to-[#1e4e79] p-0.5 shadow-md shadow-blue-900/15 group-hover:scale-105 transition-transform flex items-center justify-center text-white">
          <Compass className="w-5 h-5" />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-xl text-[#0c3c60]">
            NAVIGATE
          </span>
          <img src="/rsamdio.webp" alt="RSA MDIO" className="h-6 w-auto object-contain" />
        </div>
      </Link>

      {/* Main Login Card */}
      <div className="bg-white border border-slate-200/90 rounded-3xl w-full max-w-md overflow-hidden shadow-xl p-8 space-y-6">
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 mx-auto flex items-center justify-center mb-3">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900">Creator & Admin Sign-in</h2>
          <p className="text-xs text-slate-500">
            Sign in with your approved Google account to create and manage interactive walkthroughs
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 font-medium leading-relaxed">
            {error.replace('ACCESS_DENIED: ', '')}
          </div>
        )}

        {/* Google Sign In */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-300 hover:border-slate-400 text-slate-800 text-xs font-bold flex items-center justify-center gap-3 transition-all cursor-pointer shadow-xs hover:shadow-md active:scale-98"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>{loading ? 'Signing in with Google...' : 'Continue with Google'}</span>
        </button>

        <div className="pt-2 text-center">
          <Link to="/" className="text-xs font-semibold text-[#0c3c60] hover:underline transition-colors">
            ← Return to Public Guides
          </Link>
        </div>
      </div>
    </div>
  );
};
