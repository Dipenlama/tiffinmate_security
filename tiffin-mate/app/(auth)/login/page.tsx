"use client";

import React, { useState } from "react";
import {
  ArrowRight,
  Clock3,
  Eye,
  EyeOff,
  Leaf,
  Lock,
  Mail,
  ShieldCheck,
  Utensils,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { postLogin, postMfaLoginVerify } from "../../../lib/api";
import { setSessionMarkers } from "../../../lib/session-markers";

type SessionUser = {
  role?: string;
  [key: string]: unknown;
};

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

const LoginPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const router = useRouter();

  const completeLogin = (userData?: SessionUser | null) => {
    const role = userData?.role || "user";
    setSessionMarkers(role);
    try {
      localStorage.setItem("user", JSON.stringify(userData || {}));
    } catch {}

    const requestedPath = (() => {
      if (typeof window === "undefined") return null;
      const next = new URLSearchParams(window.location.search).get("next");
      return next && next.startsWith("/") && !next.startsWith("//") ? next : null;
    })();

    if (role === "admin") {
      router.replace(requestedPath || "/admin/dashboard");
    } else if (requestedPath && !requestedPath.startsWith("/admin")) {
      router.replace(requestedPath);
    } else {
      router.replace("/dashboard");
    }
    router.refresh();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const json = await postLogin(email, password);
      if (json?.mfaRequired) {
        setMfaToken(json.mfaToken);
        return;
      }
      completeLogin(json?.data);
    } catch (err: unknown) {
      setError(errorMessage(err, "Login failed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMfaSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!mfaToken) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const json = await postMfaLoginVerify(mfaToken, mfaCode);
      completeLogin(json?.data);
    } catch (err: unknown) {
      setError(errorMessage(err, "Invalid authentication code"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-73px)] overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute -left-28 top-20 h-72 w-72 rounded-full bg-emerald-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-4 h-80 w-80 rounded-full bg-orange-200/40 blur-3xl" />

      <div className="relative mx-auto grid min-h-[680px] w-full max-w-6xl overflow-hidden rounded-[2rem] border border-emerald-900/10 bg-[#fffef9] shadow-[0_30px_90px_-45px_rgba(6,78,59,0.55)] lg:grid-cols-[1.05fr_0.95fr]">
        <aside className="relative hidden overflow-hidden bg-emerald-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -right-32 -top-28 h-96 w-96 rounded-full border-[70px] border-emerald-700/30" />
          <div className="absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-orange-500/15 blur-2xl" />
          <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(20,184,166,0.08)_100%)]" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 shadow-lg shadow-emerald-950/30">
                <Utensils size={24} />
              </span>
              <span className="text-2xl font-extrabold tracking-tight">Tiffin Mate</span>
            </div>
          </div>

          <div className="relative z-10 max-w-lg">
            <span className="inline-flex rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">
              Fresh food, familiar comfort
            </span>
            <h1 className="mt-7 text-5xl font-extrabold leading-[1.08] tracking-tight">
              Home-style meals,
              <span className="block text-emerald-300">ready when you are.</span>
            </h1>
            <p className="mt-6 max-w-md text-base leading-7 text-emerald-100/75">
              Sign in to plan your tiffin, manage bookings, and enjoy wholesome meals prepared for your routine.
            </p>

            <div className="mt-9 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm">
                <Leaf size={20} className="text-emerald-300" />
                <p className="mt-3 text-sm font-semibold">Freshly prepared</p>
                <p className="mt-1 text-xs leading-5 text-emerald-100/60">Balanced meals made daily.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm">
                <Clock3 size={20} className="text-orange-300" />
                <p className="mt-3 text-sm font-semibold">Made for your day</p>
                <p className="mt-1 text-xs leading-5 text-emerald-100/60">Lunch and dinner on schedule.</p>
              </div>
            </div>
          </div>

          <p className="relative z-10 text-xs tracking-wide text-emerald-100/45">
            Simple meals. Reliable delivery. Better days.
          </p>
        </aside>

        <main className="flex items-center px-6 py-10 sm:px-12 lg:px-16">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-9 flex items-center gap-3 lg:hidden">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-200">
                <Utensils size={22} />
              </span>
              <span className="text-2xl font-extrabold tracking-tight text-emerald-950">Tiffin Mate</span>
            </div>

            {mfaToken ? (
              <>
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <ShieldCheck size={24} />
                </span>
                <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-emerald-950">Verify it&apos;s you</h2>
                <p className="mt-2 text-sm leading-6 text-neutral-600">
                  Enter the six-digit code from your authenticator app to continue.
                </p>

                <form onSubmit={handleMfaSubmit} className="mt-8 space-y-5">
                  <div>
                    <label htmlFor="mfa-code" className="mb-2 block text-sm font-semibold text-neutral-800">
                      Authentication code
                    </label>
                    <div className="relative">
                      <ShieldCheck size={19} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                      <input
                        id="mfa-code"
                        type="text"
                        inputMode="numeric"
                        autoFocus
                        required
                        maxLength={6}
                        className="w-full rounded-xl border border-neutral-300 bg-white py-3.5 pl-12 pr-4 text-lg font-semibold tracking-[0.35em] text-neutral-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                        placeholder="123456"
                        value={mfaCode}
                        onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
                      />
                    </div>
                  </div>

                  {error && (
                    <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting || mfaCode.length !== 6}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3.5 font-bold text-white shadow-lg shadow-emerald-200/70 transition hover:-translate-y-0.5 hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                  >
                    {isSubmitting ? "Verifying..." : "Verify and continue"}
                    {!isSubmitting && <ArrowRight size={18} />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMfaToken(null);
                      setMfaCode("");
                      setError(null);
                    }}
                    className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900"
                  >
                    Back to login
                  </button>
                </form>
              </>
            ) : (
              <>
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-emerald-600">Welcome back</p>
                <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-emerald-950">Sign in to your account</h2>
                <p className="mt-3 text-sm leading-6 text-neutral-600">
                  Continue to your meals, bookings, and delivery schedule.
                </p>

                <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                  <div>
                    <label htmlFor="login-email" className="mb-2 block text-sm font-semibold text-neutral-800">
                      Email address
                    </label>
                    <div className="relative">
                      <Mail size={19} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                      <input
                        id="login-email"
                        type="email"
                        required
                        autoComplete="email"
                        className="w-full rounded-xl border border-neutral-300 bg-white py-3.5 pl-12 pr-4 text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label htmlFor="login-password" className="text-sm font-semibold text-neutral-800">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => router.push("/forgot-password")}
                        className="text-sm font-semibold text-emerald-700 transition hover:text-emerald-900"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock size={19} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                      <input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        required
                        autoComplete="current-password"
                        className="w-full rounded-xl border border-neutral-300 bg-white py-3.5 pl-12 pr-12 text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-neutral-400 transition hover:text-neutral-700"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3.5 font-bold text-white shadow-lg shadow-emerald-200/70 transition hover:-translate-y-0.5 hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                  >
                    {isSubmitting ? "Signing in..." : "Sign in"}
                    {!isSubmitting && <ArrowRight size={18} />}
                  </button>
                </form>

                <div className="mt-8 border-t border-neutral-200 pt-6 text-center">
                  <p className="text-sm text-neutral-600">
                    New to Tiffin Mate?
                    <button
                      type="button"
                      onClick={() => router.push("/register")}
                      className="ml-2 font-bold text-emerald-700 transition hover:text-emerald-900 hover:underline"
                    >
                      Create an account
                    </button>
                  </p>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default LoginPage;
