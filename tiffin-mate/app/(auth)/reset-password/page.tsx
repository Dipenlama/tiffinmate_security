"use client";

import React, { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { postResetPassword } from '../../../lib/api';

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
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!token) setStatus('missing');
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    try {
      const json = await postResetPassword(token, password);
      if (json && json.success) {
        setStatus('ok');
      } else {
        setStatus('error');
      }
    } catch (err) {
      setStatus('error');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow">
        <h2 className="text-2xl font-semibold mb-4">Reset Password</h2>
        {!token && <p className="text-red-600">Missing reset token.</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            required
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border px-3 py-2 rounded"
          />
          <div className="flex gap-2">
            <button type="submit" className="bg-orange-600 text-white px-4 py-2 rounded">
              Reset password
            </button>
            <button type="button" onClick={() => router.push('/login')} className="px-4 py-2 rounded border">
              Cancel
            </button>
          </div>
        </form>
        {status === 'ok' && <p className="mt-4 text-green-600">Password reset successful.</p>}
        {status === 'error' && <p className="mt-4 text-red-600">Failed to reset password.</p>}
      </div>
    </div>
  );
}
