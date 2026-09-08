import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, UserCheck, Building2, Briefcase, Mail, User, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

export default function OnboardingPage() {
  const { user, updateProfile, isProfileComplete } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [designation, setDesignation] = useState('Compliance Officer');
  const [organization, setOrganization] = useState('Legal Metrology Dept');
  const [role, setRole] = useState('Inspector');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setFullName(user.name || '');
      setEmail(user.email || '');
      if (user.designation) setDesignation(user.designation);
      if (user.organization) setOrganization(user.organization);
      if (user.role) setRole(user.role);
    }
    // If profile is already marked complete, redirect directly to dashboard
    if (isProfileComplete) {
      navigate('/', { replace: true });
    }
  }, [user, isProfileComplete, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('Please provide your Full Name.');
      return;
    }
    if (!designation.trim()) {
      setError('Please specify your Role or Designation.');
      return;
    }
    if (!organization.trim()) {
      setError('Please provide your Organization / Department.');
      return;
    }

    setLoading(true);
    setError('');

    const res = await updateProfile({
      name: fullName.trim(),
      designation: designation.trim(),
      organization: organization.trim(),
      role: role
    });

    setLoading(false);

    if (res.success) {
      navigate('/', { replace: true });
    } else {
      setError(res.error || 'Failed to save profile details');
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 p-6 relative overflow-hidden">
      {/* Decorative Glows */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-xl relative z-10">
        <div className="bg-white/90 dark:bg-card/90 backdrop-blur-2xl border border-border/80 rounded-3xl p-8 shadow-2xl space-y-6">
          
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 rounded-2xl bg-primary/10 text-primary mb-1">
              <UserCheck className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              Officer Profile Setup
            </h1>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Welcome to PackSure AI! Please complete your official credentials and department information to activate your enforcement scanner.
            </p>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-primary" />
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Saikiran Busa"
                  className="w-full px-4 py-3 border border-border rounded-xl bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm font-medium"
                />
              </div>

              {/* Email Address */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-primary" />
                  Email Address
                </label>
                <input
                  type="email"
                  disabled
                  value={email}
                  className="w-full px-4 py-3 border border-border/60 rounded-xl bg-black/5 dark:bg-white/5 text-muted-foreground cursor-not-allowed text-sm font-medium"
                />
              </div>

              {/* Role / Designation */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-primary" />
                  Role / Designation
                </label>
                <input
                  type="text"
                  required
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="e.g. Compliance Officer"
                  className="w-full px-4 py-3 border border-border rounded-xl bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm font-medium"
                />
              </div>

              {/* Organization */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-primary" />
                  Organization / Dept
                </label>
                <input
                  type="text"
                  required
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="e.g. Legal Metrology Dept"
                  className="w-full px-4 py-3 border border-border rounded-xl bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm font-medium"
                />
              </div>

            </div>

            {/* Officer Authority Level */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                Access Permission Level
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-4 py-3 border border-border rounded-xl bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm font-medium"
              >
                <option value="Inspector">Inspector (Field Inspection & Audits)</option>
                <option value="Officer">Enforcement Officer (Rules Enforcement & Citations)</option>
                <option value="Admin">Department Admin (Full Access & Rule Controls)</option>
                <option value="Manufacturer">Manufacturer / Compliance Auditor</option>
              </select>
            </div>

            {/* Submit Action */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-sm transition-all duration-200 shadow-lg shadow-primary/25 flex items-center justify-center gap-2 group"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Complete Profile & Open Dashboard</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}
