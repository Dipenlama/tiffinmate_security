"use client";

import React, { useState } from 'react';
import { postForgotPassword } from '../../../lib/api';
import { useRouter } from 'next/navigation';


export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage(null);
    try {
      const json = await postForgotPassword(email);
      if (json && json.success) setStatus('sent');
      else {
        setStatus('error');
        setErrorMessage(json?.message || 'Could not send reset link');
      }
    } catch (err) {
      setStatus('error');
      setErrorMessage((err as Error)?.message || 'Network error');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-sm border border-neutral-200">
        <h2 className="text-2xl font-semibold text-neutral-900 mb-4">Forgot Password</h2>
        <p className="text-sm text-neutral-600 mb-4">Enter your account email and we'll send a reset link.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-neutral-300 px-3 py-2 rounded bg-white text-neutral-900 placeholder:text-neutral-400"
          />
          <div className="flex gap-2">
            <button type="submit" disabled={status === 'loading'} className="bg-orange-600 text-white px-4 py-2 rounded disabled:opacity-50">
              {status === 'loading' ? 'Sending…' : 'Send reset link'}
            </button>
            <button type="button" onClick={() => router.back()} className="px-4 py-2 rounded border">
              Cancel
            </button>
          </div>
        </form>
        {status === 'sent' && <p className="mt-4 text-green-600">If that email exists, a reset link was sent.</p>}
        {status === 'error' && (
          <p className="mt-4 text-red-600">{errorMessage || "Couldn't send reset link."}</p>
        )}
      </div>
    </div>
  );
}
