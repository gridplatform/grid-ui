import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useBranding } from "@/contexts/BrandingContext";
import { useAuth } from "@/contexts/AuthContext";
import { GridLogo } from "@/components/GridLogo";

const LoginPage = () => {
  const { customLogoUrl, orgName } = useBranding();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: string } | null)?.from || "/dashboard";

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, from]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Panel - Branding */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12"
        style={{ background: "var(--gradient-login)" }}
      >
        <div>
          <div className="flex items-center gap-3 mb-16">
            {customLogoUrl ? (
              <img src={customLogoUrl} alt={orgName} className="w-10 h-10 rounded-lg object-contain" />
            ) : (
              <GridLogo className="w-10 h-10" alt={orgName} />
            )}
            <span className="text-foreground text-2xl font-semibold tracking-tight">{orgName}</span>
          </div>

          <h2 className="text-4xl font-bold text-foreground leading-tight mb-4">
            Infrastructure
            <br />
            at your fingertips.
          </h2>
          <p className="text-muted-foreground text-lg max-w-md">
            Deploy, manage, and monitor your infrastructure from a single console. Built for teams that move fast.
          </p>
        </div>

        {/* Decorative elements */}
        <div className="relative">
          <div className="grid grid-cols-3 gap-3 opacity-20">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="h-16 rounded-md border border-border"
                style={{ opacity: 0.3 + Math.random() * 0.7 }}
              />
            ))}
          </div>
        </div>

        <p className="text-muted-foreground text-sm">
          © 2026 Grid. All rights reserved.
        </p>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-12">
            {customLogoUrl ? (
              <img src={customLogoUrl} alt={orgName} className="w-8 h-8 rounded-lg object-contain" />
            ) : (
              <GridLogo className="w-8 h-8" alt={orgName} />
            )}
            <span className="text-foreground text-xl font-semibold">{orgName}</span>
          </div>

          <h1 className="text-2xl font-semibold text-foreground mb-2">Log in to {orgName}</h1>
          <p className="text-sm text-muted-foreground mb-8">
            New user?{" "}
            <button className="text-primary hover:underline">Sign up for free</button>
          </p>

          {/* Google Sign In */}
          <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md border border-border bg-secondary text-foreground text-sm font-medium hover:bg-accent transition-colors mb-3">
            <GoogleIcon />
            Sign in with Google
          </button>

          <button className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
            Using Single Sign-On?
          </button>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-background px-3 text-xs text-muted-foreground uppercase tracking-wider">or</span>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2">
                {error}
              </p>
            )}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full px-3 py-2 rounded-md bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 pr-10 rounded-md bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !email || !password}
              className="w-full py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {submitting ? "Signing in…" : "Log in"}
            </button>

            <div className="text-center">
              <button type="button" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Forgot password?
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const GoogleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

export default LoginPage;
