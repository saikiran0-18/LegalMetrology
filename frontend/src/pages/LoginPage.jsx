import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Scan, ArrowRight, Lock, KeyRound, AlertCircle, Loader2, User, Mail, UserPlus, LogIn } from 'lucide-react';

export default function LoginPage() {
  const { loginWithGoogle, loginWithDemo, register, login, isAuthenticated, isProfileComplete } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const googleBtnRef = useRef(null);

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const redirectPath = location.state?.from?.pathname || '/';

  // If already authenticated and profile completed, redirect
  useEffect(() => {
    if (isAuthenticated) {
      if (!isProfileComplete) {
        navigate('/onboarding', { replace: true });
      } else {
        navigate(redirectPath, { replace: true });
      }
    }
  }, [isAuthenticated, isProfileComplete, navigate, redirectPath]);

  // Initialize Google Identity Services if available and client id is set
  useEffect(() => {
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    if (window.google && googleClientId && googleBtnRef.current) {
      try {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response) => {
            if (response.credential) {
              setLoading(true);
              setError('');
              const res = await loginWithGoogle(response.credential);
              setLoading(false);
              if (!res.success) {
                setError(res.error || 'Google authentication failed');
              }
            }
          }
        });

        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'outline',
          size: 'large',
          width: 320,
          text: mode === 'register' ? 'signup_with' : 'signin_with',
          shape: 'pill'
        });
      } catch (err) {
        console.warn('Could not initialize Google Identity Services:', err);
      }
    }
  }, [loginWithGoogle, mode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please fill in all required credentials.');
      return;
    }

    setLoading(true);

    if (mode === 'register') {
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        setLoading(false);
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters long.');
        setLoading(false);
        return;
      }

      const res = await register(email.trim(), password, name.trim());
      setLoading(false);
      if (res.success) {
        // Newly registered users are navigated to complete profile
        navigate('/onboarding', { replace: true });
      } else {
        setError(res.error || 'Registration failed');
      }
    } else {
      const res = await login(email.trim(), password);
      setLoading(false);
      if (res.success) {
        if (!res.user?.profileCompleted) {
          navigate('/onboarding', { replace: true });
        } else {
          navigate(redirectPath, { replace: true });
        }
      } else {
        setError(res.error || 'Login failed');
      }
    }
  };

  const handleDemoLogin = async (role = 'Inspector') => {
    setLoading(true);
    setError('');
    const res = await loginWithDemo(role);
    setLoading(false);
    if (res.success) {
      navigate(redirectPath, { replace: true });
    } else {
      setError(res.error || 'Failed to login');
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 p-6 relative overflow-hidden">
      {/* Background Decorative Gradients */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Card */}
        <div className="bg-white/85 dark:bg-card/90 backdrop-blur-2xl border border-border/80 rounded-3xl p-8 shadow-2xl space-y-6">
          
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-primary to-purple-600 text-white shadow-xl shadow-primary/25 mb-1">
              <Scan className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center justify-center gap-1.5">
              PackSure <span className="text-primary font-medium">AI</span>
            </h1>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Legal Metrology Enforcement System
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex p-1 bg-black/5 dark:bg-white/5 rounded-2xl border border-border/50">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                mode === 'login'
                  ? 'bg-white dark:bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(''); }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                mode === 'register'
                  ? 'bg-white dark:bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Create Account</span>
            </button>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Credentials Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <User className="w-3 h-3 text-primary" />
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Officer Name"
                  className="w-full px-3.5 py-2.5 border border-border rounded-xl bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Mail className="w-3 h-3 text-primary" />
                Official Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="officer@department.gov.in"
                className="w-full px-3.5 py-2.5 border border-border rounded-xl bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-primary" />
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 border border-border rounded-xl bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
              />
            </div>

            {mode === 'register' && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-primary" />
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 border border-border rounded-xl bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-sm transition-all duration-200 shadow-md shadow-primary/20 flex items-center justify-center gap-2 group mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>{mode === 'register' ? 'Create Account & Continue' : 'Sign In to Portal'}</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          {/* Social / SSO Divider */}
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-border"></div>
            <span className="flex-shrink mx-3 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              Or Authenticate With
            </span>
            <div className="flex-grow border-t border-border"></div>
          </div>

          {/* Google Sign-In */}
          <div className="flex flex-col items-center justify-center">
            <div ref={googleBtnRef} className="w-full flex justify-center" />

            {(!import.meta.env.VITE_GOOGLE_CLIENT_ID || !window.google) && (
              <button
                type="button"
                onClick={() => handleDemoLogin('Inspector')}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-border hover:bg-black/5 dark:hover:bg-white/5 font-medium text-xs text-foreground transition-all duration-200 shadow-sm"
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
            )}
          </div>

          {/* Instant Inspector Access (Demo mode) */}
          <button
            type="button"
            onClick={() => handleDemoLogin('Inspector')}
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary font-semibold text-xs transition-all flex items-center justify-center gap-2"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Instant Inspector Access (Demo Mode)</span>
          </button>

          {/* Footer Security Badges */}
          <div className="pt-3 border-t border-border/70 flex items-center justify-center gap-2 text-muted-foreground text-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>End-to-End Encrypted & Audited System</span>
          </div>

        </div>
      </div>
    </div>
  );
}
