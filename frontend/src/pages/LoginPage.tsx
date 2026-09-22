import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import {
  Sparkles, Mail, Lock, Eye, EyeOff,
  ArrowRight, Loader2, AlertCircle, Info
} from 'lucide-react';
import { authApi } from '../api/client';

interface LoginPageProps {
  onNavigate: (page: string) => void;
  onLoginSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate, onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleNotice, setGoogleNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login, googleAuth } = useAuth();
  const { toast } = useToast();

  const validate = () => {
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address.');
      return false;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setGoogleNotice(null);
    if (!validate()) return;

    setLoading(true);
    try {
      await login(email, password);
      toast('Welcome back! Signed in successfully.', 'success');
      onLoginSuccess();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Invalid email or password. Please try again.';
      setError(msg);
      toast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setGoogleNotice(null);
    setLoading(true);
    try {
      const config = await authApi.getGoogleConfig();
      const resolvedClientId = ((import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || config?.client_id || '').trim();

      if (!resolvedClientId) {
        setGoogleNotice('Google Sign-In is not configured yet. To enable it, set GOOGLE_CLIENT_ID in the backend .env file. Please sign in with your email and password below.');
        toast('Google Sign-In is not configured. Please use email/password.', 'info');
        setLoading(false);
        return;
      }

      // Check if Google Identity Services script is available
      if (typeof window === 'undefined' || !(window as any).google?.accounts) {
        setGoogleNotice('Google Identity Services script is loading. Please try again in a moment or sign in with email.');
        setLoading(false);
        return;
      }

      // Preferred Flow: OAuth2 Token Client opens real Google account chooser popup
      if ((window as any).google?.accounts?.oauth2) {
        const client = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: resolvedClientId,
          scope: 'email profile openid',
          callback: async (tokenResponse: any) => {
            if (tokenResponse.error) {
              if (tokenResponse.error !== 'popup_closed_by_user') {
                const msg = tokenResponse.error_description || tokenResponse.error || 'Google sign in was canceled.';
                setError(msg);
                toast(msg, 'error');
              }
              setLoading(false);
              return;
            }
            if (tokenResponse.access_token) {
              try {
                setLoading(true);
                await googleAuth({ token: tokenResponse.access_token });
                toast('Signed in via Google successfully!', 'success');
                onLoginSuccess();
              } catch (err: any) {
                const msg = err.response?.data?.detail || 'Google sign in failed.';
                setError(msg);
                toast(msg, 'error');
              } finally {
                setLoading(false);
              }
            } else {
              setLoading(false);
            }
          },
        });
        client.requestAccessToken({ prompt: 'select_account' });
        return;
      }

      // Fallback Flow: Google ID token (GIS initialize / prompt)
      if ((window as any).google?.accounts?.id) {
        (window as any).google.accounts.id.initialize({
          client_id: resolvedClientId,
          callback: async (response: any) => {
            if (response.credential) {
              try {
                setLoading(true);
                await googleAuth({ token: response.credential });
                toast('Signed in via Google successfully!', 'success');
                onLoginSuccess();
              } catch (err: any) {
                const msg = err.response?.data?.detail || 'Google sign in failed.';
                setError(msg);
                toast(msg, 'error');
              } finally {
                setLoading(false);
              }
            } else {
              setLoading(false);
            }
          },
        });
        (window as any).google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            setGoogleNotice('Google prompt was closed or blocked. Please allow popups or use email sign-in.');
            setLoading(false);
          }
        });
      }
    } catch (err: any) {
      setError('Could not verify Google authentication configuration.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md p-8 sm:p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6"
      >
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 mx-auto flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Welcome Back
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Sign in to access your saved notes, quizzes, and study history
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Google Configuration Notice */}
        {googleNotice && (
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2.5">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{googleNotice}</span>
          </div>
        )}


        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-200 transition-all hover:scale-[1.01]"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
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
          <span>Continue with Google</span>
        </button>

        <div className="relative flex items-center justify-center">
          <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
          <span className="bg-white dark:bg-slate-900 px-3 text-xs text-slate-400 uppercase tracking-wider font-semibold">
            Or with email
          </span>
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Password
              </label>
              <button
                type="button"
                onClick={() => onNavigate('forgot-password')}
                className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 absolute right-3.5 top-3.5"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/25 transition-all hover:scale-[1.01] disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer Link */}
        <p className="text-center text-xs text-slate-500 dark:text-slate-400">
          Don't have an account yet?{' '}
          <button
            onClick={() => onNavigate('register')}
            className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Create free account
          </button>
        </p>
      </motion.div>
    </div>
  );
};
