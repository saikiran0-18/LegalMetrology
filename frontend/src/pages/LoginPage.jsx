import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Scan, ArrowRight, Lock, KeyRound, AlertCircle, Loader2, Sparkles, CheckCircle } from 'lucide-react';

export default function LoginPage() {
  const { loginWithGoogle, loginWithDemo, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const googleBtnRef = useRef(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const redirectPath = location.state?.from?.pathname || '/';

  // If already authenticated, redirect
  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, navigate, redirectPath]);

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
              if (res.success) {
                navigate(redirectPath, { replace: true });
              } else {
                setError(res.error || 'Google login failed');
              }
              setLoading(false);
            }
          }
        });

        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'outline',
          size: 'large',
          width: 320,
          text: 'signin_with',
          shape: 'pill'
        });
      } catch (err) {
        console.warn('Could not initialize Google Identity Services:', err);
      }
    }
  }, [loginWithGoogle, navigate, redirectPath]);

  const handleDemoLogin = async (role = 'Inspector') => {
    setLoading(true);
    setError('');
    const res = await loginWithDemo(role);
    if (res.success) {
      navigate(redirectPath, { replace: true });
    } else {
      setError(res.error || 'Failed to login');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 p-6 relative overflow-hidden">
      {/* Background Decorative Gradients */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Card */}
        <div className="bg-white/80 dark:bg-card/90 backdrop-blur-2xl border border-border/80 rounded-3xl p-8 shadow-2xl space-y-6">
          
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-primary to-purple-600 text-white shadow-xl shadow-primary/25 mb-2">
              <Scan className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center justify-center gap-1.5">
              PackSure <span className="text-primary font-medium">AI</span>
            </h1>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Legal Metrology Compliance Portal
            </p>
          </div>

          {/* Security Assurance Badge */}
          <div className="flex items-center justify-center gap-2 py-1.5 px-3 rounded-full bg-primary/5 border border-primary/15 text-primary text-xs font-medium mx-auto w-fit">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span>Govt. Standards Compliant & Secure</span>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Auth Actions */}
          <div className="space-y-4 pt-2">
            
            {/* Google Identity Services Container */}
            <div className="flex flex-col items-center justify-center min-h-[44px]">
              <div ref={googleBtnRef} className="w-full flex justify-center" />
              
              {/* Fallback button if VITE_GOOGLE_CLIENT_ID is not configured yet */}
              {(!import.meta.env.VITE_GOOGLE_CLIENT_ID || !window.google) && (
                <button
                  type="button"
                  onClick={() => handleDemoLogin('Inspector')}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-border hover:bg-black/5 dark:hover:bg-white/5 font-medium text-sm text-foreground transition-all duration-200 shadow-sm"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
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

            {/* Divider */}
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-border"></div>
              <span className="flex-shrink mx-4 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Quick Portal Access
              </span>
              <div className="flex-grow border-t border-border"></div>
            </div>

            {/* Quick Inspector Login (Instant verification) */}
            <button
              type="button"
              onClick={() => handleDemoLogin('Inspector')}
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-sm transition-all duration-200 shadow-md shadow-primary/20 flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating Officer...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Sign In as Authorized Inspector</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </div>

          {/* Security Features Footer */}
          <div className="pt-4 border-t border-border/70 grid grid-cols-2 gap-2 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="w-3.5 h-3.5 text-emerald-500" />
              <span>JWT Encrypted</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              <span>Rate-Limited API</span>
            </div>
          </div>

        </div>

        {/* Footer Note */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Authorized personnel only. All access and package scans are logged and audited.
        </p>
      </div>
    </div>
  );
}
