"use client";

import React, { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle2, Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { postResetPassword } from '../../../lib/api';
import { formatPasswordError, validatePassword } from '../../../lib/password-validation';

// useSearchParams() opts the whole page out of static prerendering unless
// its usage is wrapped in a Suspense boundary - `next build` fails to
// prerender this route otherwise (see
// https://nextjs.org/docs/messages/missing-suspense-with-csr-bailout).
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params?.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      setErrorMessage('This reset link is invalid or incomplete.');
      setStatus('error');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      setStatus('error');
      return;
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      setErrorMessage(passwordError);
      setStatus('error');
      return;
    }
    setErrorMessage(null);
    setStatus('loading');
    try {
      const json = await postResetPassword(token, password);
      if (json && json.success) {
        setStatus('ok');
        setPassword('');
        setConfirmPassword('');
      } else {
        setErrorMessage(json?.message || 'Failed to reset password.');
        setStatus('error');
      }
    } catch (err) {
      setErrorMessage(formatPasswordError(err));
      setStatus('error');
    }
  }

  return (
    <div className="min-h-[calc(100vh-72px)] bg-[radial-gradient(circle_at_top_left,_#fff1e8,_#f8fafc_48%,_#f1f5f9)] px-5 py-14 flex items-center justify-center">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_24px_70px_-35px_rgba(15,23,42,0.45)]">
        <div className="h-2 bg-gradient-to-r from-orange-600 via-amber-500 to-orange-400" />
        <div className="p-7 sm:p-9">
          {status === 'ok' ? (
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <CheckCircle2 size={30} aria-hidden="true" />
              </div>
              <h2 className="mt-5 text-2xl font-bold text-neutral-950">Password updated</h2>
              <p className="mt-2 text-sm leading-6 text-neutral-600">
                Your password has been reset successfully. You can now sign in with your new password.
              </p>
              <button
                type="button"
                onClick={() => router.replace('/login')}
                className="mt-7 w-full rounded-lg bg-orange-600 px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
              >
                Continue to login
              </button>
            </div>
          ) : (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
                <LockKeyhole size={25} aria-hidden="true" />
              </div>
              <h2 className="mt-5 text-3xl font-bold tracking-tight text-neutral-950">Reset password</h2>
              <p className="mt-2 text-sm leading-6 text-neutral-600">
                Create a new password for your Tiffin Mate account.
              </p>

              {!token && (
                <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  This reset link is invalid or incomplete. Request a new reset link.
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-7 space-y-5">
                <div>
                  <label htmlFor="new-password" className="mb-2 block text-sm font-semibold text-neutral-800">
                    New password
                  </label>
                  <div className="relative">
                    <input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={9}
                      autoComplete="new-password"
                      placeholder="Enter your new password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-lg border border-neutral-300 bg-white px-4 py-3 pr-12 text-base text-neutral-950 placeholder:text-neutral-400 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-neutral-500 hover:text-neutral-800"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirm-password" className="mb-2 block text-sm font-semibold text-neutral-800">
                    Confirm new password
                  </label>
                  <div className="relative">
                    <input
                      id="confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      minLength={9}
                      autoComplete="new-password"
                      placeholder="Enter the password again"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full rounded-lg border border-neutral-300 bg-white px-4 py-3 pr-12 text-base text-neutral-950 placeholder:text-neutral-400 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((value) => !value)}
                      className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-neutral-500 hover:text-neutral-800"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <p className="rounded-lg bg-neutral-100 px-4 py-3 text-xs leading-5 text-neutral-700">
                  Use at least 9 characters with one number and one special character.
                </p>

                {status === 'error' && (
                  <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {errorMessage || 'Failed to reset password.'}
                  </p>
                )}

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="submit"
                    disabled={!token || status === 'loading'}
                    className="flex-1 rounded-lg bg-orange-600 px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {status === 'loading' ? 'Updating password...' : 'Reset password'}
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push('/login')}
                    className="rounded-lg border border-neutral-300 bg-white px-5 py-3 font-semibold text-neutral-800 transition hover:bg-neutral-100"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
