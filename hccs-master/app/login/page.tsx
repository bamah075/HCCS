"use client";

export const dynamic = "force-dynamic";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase/client"; // only used for setSession after sign-in
import { useLang } from "@/lib/i18n";

function LoginPageContent() {
  const { t } = useLang();
  const l = t.login;
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [form, setForm] = useState({ email: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const urlMode = searchParams.get("mode");
    setMode(urlMode === "register" ? "register" : "signin");
  }, [searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
    setNotice("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");

    if (mode === "register") {
      if (form.password.length < 6) {
        setLoading(false);
        setError(l.errors.passwordLength);
        return;
      }

      if (form.password !== form.confirmPassword) {
        setLoading(false);
        setError(l.errors.passwordMismatch);
        return;
      }

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });

      const data = (await res.json()) as { ok?: boolean; access_token?: string; refresh_token?: string; error?: string };
      setLoading(false);

      if (!res.ok) {
        setError(data.error || l.errors.registrationFailed);
        return;
      }

      if (data.access_token && data.refresh_token) {
        await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });
        router.push("/member-portal");
        return;
      }

      setNotice(l.notices.registrationSuccess);
      setMode("signin");
      setForm((prev) => ({ ...prev, password: "", confirmPassword: "" }));
      return;
    }

    const res = await fetch("/api/auth/signin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.email, password: form.password }),
    });

    const data = (await res.json()) as { access_token?: string; refresh_token?: string; error?: string };
    setLoading(false);

    if (!res.ok) {
      setError(data.error || l.errors.loginFailed);
      return;
    }

    await supabase.auth.setSession({
      access_token: data.access_token!,
      refresh_token: data.refresh_token!,
    });

    router.push("/member-portal");
  };

  return (
    <div className="min-h-screen bg-[#F8F5EC] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <Image
              src="/images/hccs_logo.png"
              alt="HCCS"
              width={120}
              height={40}
              className="h-10 w-auto object-contain mx-auto mb-5"
              priority
            />
          </Link>
          <p className="eyebrow">Member access</p>
          <h1 className="font-display text-2xl sm:text-3xl text-[#0d1f35] leading-tight">
            {mode === "signin" ? l.signInTitle : l.registerTitle}
          </h1>
          <span className="rule-gold mx-auto mt-4" />
          <p className="text-sm text-slate-600 mt-4 leading-relaxed max-w-sm mx-auto">
            {mode === "signin" ? t.memberPortal.welcomeDesc : l.registerTitle}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-[0_24px_60px_-32px_rgba(13,31,53,0.18)] border border-[#e5e0d2] p-8 sm:p-10">
          <div className="mb-6 grid grid-cols-2 gap-1.5 rounded-xl bg-[#F8F5EC] border border-[#e5e0d2] p-1">
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setError("");
                setNotice("");
              }}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                mode === "signin"
                  ? "bg-white text-[#0d1f35] shadow-sm border border-[#e5e0d2]"
                  : "text-slate-600 hover:text-[#1a3a52]"
              }`}
            >
              {l.tabSignIn}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setError("");
                setNotice("");
              }}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                mode === "register"
                  ? "bg-white text-[#0d1f35] shadow-sm border border-[#e5e0d2]"
                  : "text-slate-600 hover:text-[#1a3a52]"
              }`}
            >
              {l.tabRegister}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#1a3a52] mb-1.5">
                {l.emailLabel}
              </label>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={handleChange}
                placeholder={l.emailPlaceholder}
                className="w-full border border-[#e5e0d2] bg-white rounded-lg px-4 py-2.5 text-sm text-[#0d1f35] placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#1a3a52] mb-1.5">
                {l.passwordLabel}
              </label>
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
                value={form.password}
                onChange={handleChange}
                placeholder={l.passwordPlaceholder}
                className="w-full border border-[#e5e0d2] bg-white rounded-lg px-4 py-2.5 text-sm text-[#0d1f35] placeholder:text-slate-400"
              />
            </div>

            {mode === "register" && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#1a3a52] mb-1.5">
                  {l.confirmPasswordLabel}
                </label>
                <input
                  name="confirmPassword"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder={l.confirmPasswordPlaceholder}
                  className="w-full border border-[#e5e0d2] bg-white rounded-lg px-4 py-2.5 text-sm text-[#0d1f35] placeholder:text-slate-400"
                />
              </div>
            )}

            {error && (
              <p className="text-sm text-[#b91c1c] bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                {error}
              </p>
            )}

            {notice && (
              <p className="text-sm text-[#1a3a52] bg-[#F8F5EC] border border-[#e5e0d2] rounded-lg px-4 py-2">
                {notice}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? mode === "signin"
                  ? l.signingIn
                  : l.registering
                : mode === "signin"
                ? l.signInButton
                : l.registerButton}
            </button>
          </form>

          <p className="text-xs text-slate-500 text-center mt-6">
            {mode === "signin" ? (
              <button
                type="button"
                onClick={() => setMode("register")}
                className="font-semibold text-[#1a3a52] hover:text-[#0d1f35] underline underline-offset-2"
              >
                {l.tabRegister}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setMode("signin")}
                className="font-semibold text-[#1a3a52] hover:text-[#0d1f35] underline underline-offset-2"
              >
                {l.tabSignIn}
              </button>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8F5EC] flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-[#d4a84b] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
