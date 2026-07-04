"use client";

export const dynamic = "force-dynamic";
import { FormEvent, Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n";

type AuthMode = "login" | "signup";

function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode = (searchParams.get("mode") as AuthMode) || "login";
  const { t } = useLang();
  const a = (t as { auth?: Record<string, string> }).auth ?? {};

  const [mode, setMode] = useState<AuthMode>(initialMode === "signup" ? "signup" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const heading = useMemo(() => (mode === "login" ? (a.loginHeading ?? "Welcome back") : (a.signupHeading ?? "Create your account")), [mode, a]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (mode === "login") {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      router.push("/member-portal");
      router.refresh();
      return;
    }

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    setMessage(a.signupSuccess ?? "Signup successful. Check your email for a confirmation link, then log in.");
    setMode("login");
    setPassword("");
    setLoading(false);
  }

  return (
    <div className="min-h-[80vh] bg-[#F8F5EC] px-4 py-16 sm:py-20">
      <div className="mx-auto max-w-md rounded-2xl border border-[#e5e0d2] bg-white p-8 sm:p-10 shadow-[0_24px_60px_-32px_rgba(13,31,53,0.18)]">
        <p className="eyebrow">{a.eyebrow ?? "HCCS access"}</p>
        <h1 className="font-display text-3xl text-[#0d1f35] leading-tight mb-3">{heading}</h1>
        <span className="rule-gold mb-5" />
        <p className="mb-7 text-sm text-slate-600 leading-relaxed">
          {mode === "login"
            ? (a.loginSubtitle ?? "Sign in to access your member workspace.")
            : (a.signupSubtitle ?? "Sign up with your email to start using HCCS member access.")}
        </p>

        <div className="mb-6 grid grid-cols-2 gap-1.5 rounded-xl bg-[#F8F5EC] border border-[#e5e0d2] p-1">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
              setMessage(null);
            }}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              mode === "login"
                ? "bg-white text-[#0d1f35] shadow-sm border border-[#e5e0d2]"
                : "text-slate-600 hover:text-[#1a3a52]"
            }`}
          >
            {a.loginTab ?? "Login"}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setError(null);
              setMessage(null);
            }}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              mode === "signup"
                ? "bg-white text-[#0d1f35] shadow-sm border border-[#e5e0d2]"
                : "text-slate-600 hover:text-[#1a3a52]"
            }`}
          >
            {a.signupTab ?? "Sign up"}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-[#1a3a52]"
              htmlFor="email"
            >
              {a.emailLabel ?? "Email"}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="w-full rounded-lg border border-[#e5e0d2] bg-white px-3 py-2.5 text-sm text-[#0d1f35] placeholder:text-slate-400 transition-colors"
              placeholder={a.emailPlaceholder ?? "you@company.com"}
            />
          </div>

          <div>
            <label
              className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-[#1a3a52]"
              htmlFor="password"
            >
              {a.passwordLabel ?? "Password"}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
              className="w-full rounded-lg border border-[#e5e0d2] bg-white px-3 py-2.5 text-sm text-[#0d1f35] placeholder:text-slate-400 transition-colors"
              placeholder={a.passwordPlaceholder ?? "At least 6 characters"}
            />
          </div>

          {error ? (
            <p className="text-sm text-[#b91c1c] bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="text-sm text-[#1a3a52] bg-[#F8F5EC] border border-[#e5e0d2] rounded-md px-3 py-2">
              {message}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (a.submitWait ?? "Please wait...") : mode === "login" ? (a.submitLoginIdle ?? "Login") : (a.submitSignupIdle ?? "Create account")}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          {a.homeLinkPre ?? "Return to "}
          <Link href="/" className="font-semibold text-[#1a3a52] hover:text-[#0d1f35] underline underline-offset-2">
            {a.homeLinkText ?? "home page"}
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[80vh] bg-[#F8F5EC] flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-[#d4a84b] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <AuthPageContent />
    </Suspense>
  );
}
