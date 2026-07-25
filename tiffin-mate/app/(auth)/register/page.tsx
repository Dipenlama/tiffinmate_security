"use client";

import React, { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  Leaf,
  Lock,
  Mail,
  User,
  Utensils,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { postRegister } from "../../../lib/api";
import { formatPasswordError, validatePassword } from "../../../lib/password-validation";

const SignupPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;
    if (!fullName || !email || !password || !confirmPassword) {
      setError("Please fill all fields.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setError(null);
    setSuccess(null);
    setIsSubmitting(true);
    try {
      await postRegister(fullName, email, password, confirmPassword);
      setSuccess("Account created successfully. You can now log in.");
      setTimeout(() => router.push("/login"), 800);
    } catch (err: unknown) {
      setError(formatPasswordError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-73px)] overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute -left-28 top-20 h-72 w-72 rounded-full bg-emerald-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-4 h-80 w-80 rounded-full bg-orange-200/40 blur-3xl" />

      <div className="relative mx-auto grid min-h-[760px] w-full max-w-6xl overflow-hidden rounded-[2rem] border border-emerald-900/10 bg-[#fffef9] shadow-[0_30px_90px_-45px_rgba(6,78,59,0.55)] lg:grid-cols-[1.05fr_0.95fr]">
        <aside className="relative hidden overflow-hidden bg-emerald-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -right-32 -top-28 h-96 w-96 rounded-full border-[70px] border-orange-500/20" />
          <div className="absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-rose-500/15 blur-2xl" />
          <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(249,115,22,0.08)_58%,rgba(225,29,72,0.08)_100%)]" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 via-orange-500 to-rose-500 shadow-lg shadow-emerald-950/30">
                <Utensils size={24} />
              </span>
              <span className="text-2xl font-extrabold tracking-tight">Tiffin Mate</span>
            </div>
          </div>

          <div className="relative z-10 max-w-lg">
            <span className="inline-flex rounded-full border border-orange-300/25 bg-orange-400/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-orange-200">
              Your daily meal, simplified
            </span>
            <h1 className="mt-7 text-5xl font-extrabold leading-[1.08] tracking-tight">
              Join for meals that
              <span className="block bg-gradient-to-r from-emerald-300 via-orange-300 to-rose-300 bg-clip-text text-transparent">
                feel like home.
              </span>
            </h1>
            <p className="mt-6 max-w-md text-base leading-7 text-emerald-100/75">
              Create your account to discover daily menus, choose flexible packages, and keep every delivery organized.
            </p>

            <div className="mt-9 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm">
                <Leaf size={20} className="text-emerald-300" />
                <p className="mt-3 text-sm font-semibold">Wholesome choices</p>
                <p className="mt-1 text-xs leading-5 text-emerald-100/60">Fresh menus for everyday eating.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm">
                <Clock3 size={20} className="text-orange-300" />
                <p className="mt-3 text-sm font-semibold">Flexible schedule</p>
                <p className="mt-1 text-xs leading-5 text-emerald-100/60">Book meals around your routine.</p>
              </div>
            </div>
          </div>

          <p className="relative z-10 text-xs tracking-wide text-emerald-100/45">
            Fresh choices. Easy bookings. Delicious routines.
          </p>
        </aside>

        <main className="flex items-center px-6 py-10 sm:px-12 lg:px-16">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 via-orange-500 to-rose-500 text-white shadow-md">
                <Utensils size={22} />
              </span>
              <span className="text-2xl font-extrabold tracking-tight text-emerald-950">Tiffin Mate</span>
            </div>

            <p className="text-sm font-bold uppercase tracking-[0.16em] text-orange-600">Create your account</p>
            <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-emerald-950">Start your meal journey</h2>
            <p className="mt-3 text-sm leading-6 text-neutral-600">
              Set up your account and choose meals that fit your day.
            </p>

            <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="signup-name" className="mb-2 block text-sm font-semibold text-neutral-800">
                  Full name
                </label>
                <div className="relative">
                  <User size={19} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    id="signup-name"
                    type="text"
                    required
                    autoComplete="name"
                    className="w-full rounded-xl border border-neutral-300 bg-white py-3.5 pl-12 pr-4 text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    placeholder="Your full name"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="signup-email" className="mb-2 block text-sm font-semibold text-neutral-800">
                  Email address
                </label>
                <div className="relative">
                  <Mail size={19} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    id="signup-email"
                    type="email"
                    required
                    autoComplete="email"
                    className="w-full rounded-xl border border-neutral-300 bg-white py-3.5 pl-12 pr-4 text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="signup-password" className="mb-2 block text-sm font-semibold text-neutral-800">
                    Password
                  </label>
                  <div className="relative">
                    <Lock size={19} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={9}
                      autoComplete="new-password"
                      className="w-full rounded-xl border border-neutral-300 bg-white py-3.5 pl-12 pr-11 text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                      placeholder="Create password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-neutral-400 transition hover:text-neutral-700"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="signup-confirm" className="mb-2 block text-sm font-semibold text-neutral-800">
                    Confirm
                  </label>
                  <div className="relative">
                    <Lock size={19} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                      id="signup-confirm"
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      minLength={9}
                      autoComplete="new-password"
                      className="w-full rounded-xl border border-neutral-300 bg-white py-3.5 pl-12 pr-11 text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                      placeholder="Repeat password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-neutral-400 transition hover:text-neutral-700"
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>

              <p className="rounded-xl bg-gradient-to-r from-emerald-50 via-orange-50 to-rose-50 px-4 py-3 text-xs leading-5 text-neutral-700">
                Use at least 9 characters with one number and one special character.
              </p>

              {error && (
                <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </p>
              )}
              {success && !error && (
                <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  <CheckCircle2 size={18} />
                  {success}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 via-orange-500 to-rose-500 px-4 py-3.5 font-bold text-white shadow-lg shadow-orange-200/60 transition hover:-translate-y-0.5 hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {isSubmitting ? "Creating account..." : "Create account"}
                {!isSubmitting && <ArrowRight size={18} />}
              </button>
            </form>

            <div className="mt-7 border-t border-neutral-200 pt-6 text-center">
              <p className="text-sm text-neutral-600">
                Already have an account?
                <Link href="/login" className="ml-2 font-bold text-emerald-700 transition hover:text-emerald-900 hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default SignupPage;
