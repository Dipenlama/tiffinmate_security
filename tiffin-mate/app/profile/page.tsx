'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  changePassword,
  fetchProfile,
  fetchUserById,
  postLogout,
  postMfaDisable,
  postMfaSetup,
  postMfaVerifySetup,
  updateProfile,
} from '../../lib/api';
import { clearSessionMarkers } from '../../lib/session-markers';

type Profile = {
  name?: string;
  fullName?: string;
  email?: string;
  mfaEnabled?: boolean;
};

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pwSaving, setPwSaving] = useState(false);

  // MFA (TOTP) enrollment/disablement. `mfaSetupData` holds the QR code +
  // secret while enrollment is in progress but not yet confirmed - MFA only
  // actually turns on server-side once the user proves they can generate a
  // valid code with an authenticator app (see confirmMfaSetup in the backend).
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaSetupData, setMfaSetupData] = useState<{ qrCodeDataUrl: string; secret: string } | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaMsg, setMfaMsg] = useState<string | null>(null);
  const [mfaBusy, setMfaBusy] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    const load = async () => {
      try {
        // Identity now comes from the non-sensitive cached user object
        // (see lib/session-markers.ts comment on login/page.tsx) or the
        // /auth/me-style endpoints in fetchProfile() below - both of which
        // rely on the backend's httpOnly session cookie for the actual
        // authorization, not a JS-readable token.
        const cachedUser = (() => {
          try {
            const raw = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
            return raw ? JSON.parse(raw) : null;
          } catch {
            return null;
          }
        })();

        const candidateId = cachedUser?._id || cachedUser?.id;

        const profile = candidateId
          ? await fetchUserById(undefined, candidateId).then((r) => (r.ok ? (r.data?.data || r.data) : null)).catch(() => null)
          : null;

        const fallbackProfile = profile || await fetchProfile().catch(() => null) || cachedUser;

        if (!mounted) return;
        setUser(fallbackProfile || null);
        setName(fallbackProfile?.name || fallbackProfile?.fullName || fallbackProfile?.username || '');
        setMfaEnabled(Boolean(fallbackProfile?.mfaEnabled));
      } catch (e) {
        if (!mounted) return;
        setError('Failed to load profile');
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };

    load();

    return () => { mounted = false; };
  }, []);

  const displayName = useMemo(() => {
    return user?.name || user?.fullName || 'User';
  }, [user]);

  const logout = async () => {
    try {
      // Revokes the server-side refresh token and clears the httpOnly
      // cookies via Set-Cookie - client-side storage clearing alone (the
      // previous implementation) cannot touch those cookies at all.
      await postLogout();
    } catch (e) {}
    clearSessionMarkers();
    try { localStorage.removeItem('user'); } catch (e) {}
    try { sessionStorage.clear(); } catch (e) {}
    try {
      window.location.replace('/login');
      return;
    } catch (e) {}
    router.replace('/login');
    router.refresh();
  };

  const onSaveProfile = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const res: any = await updateProfile({ name });
      if (!res.ok) {
        setSaveMsg(res?.data?.message || res?.data?.error || 'Failed to update profile');
        return;
      }
      setSaveMsg('Profile updated');
      setUser((u) => ({ ...(u || {}), name }));
    } finally {
      setSaving(false);
    }
  };

  const onChangePassword = async () => {
    setPwMsg(null);
    if (!currentPassword || !newPassword) {
      setPwMsg('Enter current and new password');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwMsg('Passwords do not match');
      return;
    }
    setPwSaving(true);
    try {
      const res: any = await changePassword(currentPassword, newPassword);
      if (!res.ok) {
        setPwMsg(res?.data?.message || res?.data?.error || 'Failed to change password');
        return;
      }
      setPwMsg('Password changed');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } finally {
      setPwSaving(false);
    }
  };

  const onStartMfaSetup = async () => {
    setMfaMsg(null);
    setMfaBusy(true);
    try {
      const res: any = await postMfaSetup();
      if (!res?.data) {
        setMfaMsg(res?.message || 'Failed to start MFA setup');
        return;
      }
      setMfaSetupData(res.data);
    } catch (err: any) {
      setMfaMsg(err?.message || 'Failed to start MFA setup');
    } finally {
      setMfaBusy(false);
    }
  };

  const onConfirmMfaSetup = async () => {
    if (!mfaCode) return;
    setMfaMsg(null);
    setMfaBusy(true);
    try {
      await postMfaVerifySetup(mfaCode);
      setMfaEnabled(true);
      setMfaSetupData(null);
      setMfaCode('');
      setMfaMsg('Two-factor authentication is now enabled.');
    } catch (err: any) {
      setMfaMsg(err?.message || 'Invalid code - please try again.');
    } finally {
      setMfaBusy(false);
    }
  };

  const onDisableMfa = async () => {
    if (!mfaCode) {
      setMfaMsg('Enter your current authenticator code to disable MFA.');
      return;
    }
    setMfaMsg(null);
    setMfaBusy(true);
    try {
      await postMfaDisable(mfaCode);
      setMfaEnabled(false);
      setMfaCode('');
      setMfaMsg('Two-factor authentication has been disabled.');
    } catch (err: any) {
      setMfaMsg(err?.message || 'Invalid code - please try again.');
    } finally {
      setMfaBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Profile</h1>
            <p className="text-sm text-neutral-700">Manage your account and preferences.</p>
          </div>
          <button onClick={logout} className="px-4 py-2 rounded bg-neutral-900 text-white text-sm">
            Logout
          </button>
        </div>

      {loading && <div className="text-neutral-600">Loading profile…</div>}
      {!loading && error && <div className="text-red-600">{error}</div>}

      {!loading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2 bg-white border border-neutral-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-neutral-900">Account Details</h2>
            <p className="text-sm text-neutral-600 mt-1">Update your profile information.</p>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-neutral-600 mb-1">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-neutral-300 rounded px-3 py-2 bg-white text-neutral-900 placeholder:text-neutral-400"
                  placeholder="Your name"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm text-neutral-600 mb-1">Email</label>
                <input
                  value={user?.email || ''}
                  readOnly
                  className="w-full border border-neutral-200 bg-neutral-50 rounded px-3 py-2 text-neutral-800"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={onSaveProfile}
                disabled={saving}
                className="px-4 py-2 rounded bg-orange-600 text-white text-sm disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              {saveMsg && <span className="text-sm text-neutral-600">{saveMsg}</span>}
            </div>
          </section>

          <section className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-neutral-900">Quick Info</h2>
            <div className="mt-4 text-sm text-neutral-700 space-y-2">
              <div><span className="text-neutral-500">Name:</span> {displayName}</div>
              <div><span className="text-neutral-500">Email:</span> {user?.email || '-'}</div>
            </div>
          </section>

          <section className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-neutral-900">Change Password</h2>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-sm text-neutral-600 mb-1">Current password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full border border-neutral-300 rounded px-3 py-2 bg-white text-neutral-900 placeholder:text-neutral-400"
                  placeholder="Enter current password"
                />
              </div>
              <div>
                <label className="block text-sm text-neutral-600 mb-1">New password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full border border-neutral-300 rounded px-3 py-2 bg-white text-neutral-900 placeholder:text-neutral-400"
                  placeholder="Enter new password"
                />
              </div>
              <div>
                <label className="block text-sm text-neutral-600 mb-1">Confirm new password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full border border-neutral-300 rounded px-3 py-2 bg-white text-neutral-900 placeholder:text-neutral-400"
                  placeholder="Re-enter new password"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={onChangePassword}
                disabled={pwSaving}
                className="px-4 py-2 rounded bg-orange-600 text-white text-sm disabled:opacity-60"
              >
                {pwSaving ? 'Saving…' : 'Update password'}
              </button>
              {pwMsg && <span className="text-sm text-neutral-600">{pwMsg}</span>}
            </div>
          </section>

          <section className="lg:col-span-3 bg-white border border-neutral-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900">Two-Factor Authentication</h2>
                <p className="text-sm text-neutral-600 mt-1">
                  Require a 6-digit code from an authenticator app (Google Authenticator, Authy, etc.) at login,
                  in addition to your password.
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  mfaEnabled ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-600'
                }`}
              >
                {mfaEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>

            {mfaMsg && <div className="mt-3 text-sm text-neutral-700">{mfaMsg}</div>}

            {!mfaEnabled && !mfaSetupData && (
              <div className="mt-4">
                <button
                  onClick={onStartMfaSetup}
                  disabled={mfaBusy}
                  className="px-4 py-2 rounded bg-orange-600 text-white text-sm disabled:opacity-60"
                >
                  {mfaBusy ? 'Starting…' : 'Enable two-factor authentication'}
                </button>
              </div>
            )}

            {!mfaEnabled && mfaSetupData && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
                <div>
                  <p className="text-sm text-neutral-700 mb-2">
                    Scan this QR code with your authenticator app, or enter the setup key manually:
                  </p>
                  {/* Backend-rendered PNG data URL - no client QR library needed */}
                  <img src={mfaSetupData.qrCodeDataUrl} alt="MFA QR code" className="w-40 h-40 border rounded" />
                  <p className="mt-2 text-xs text-neutral-500 break-all">Setup key: {mfaSetupData.secret}</p>
                </div>
                <div>
                  <label className="block text-sm text-neutral-600 mb-1">Enter the 6-digit code to confirm</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full border border-neutral-300 rounded px-3 py-2 bg-white text-neutral-900 tracking-widest"
                    placeholder="123456"
                  />
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={onConfirmMfaSetup}
                      disabled={mfaBusy || mfaCode.length !== 6}
                      className="px-4 py-2 rounded bg-orange-600 text-white text-sm disabled:opacity-60"
                    >
                      {mfaBusy ? 'Verifying…' : 'Confirm & enable'}
                    </button>
                    <button
                      onClick={() => { setMfaSetupData(null); setMfaCode(''); setMfaMsg(null); }}
                      className="px-4 py-2 rounded border text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {mfaEnabled && (
              <div className="mt-4 max-w-sm">
                <label className="block text-sm text-neutral-600 mb-1">
                  Enter a current authenticator code to disable
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full border border-neutral-300 rounded px-3 py-2 bg-white text-neutral-900 tracking-widest"
                  placeholder="123456"
                />
                <button
                  onClick={onDisableMfa}
                  disabled={mfaBusy || mfaCode.length !== 6}
                  className="mt-3 px-4 py-2 rounded border border-red-300 text-red-700 text-sm disabled:opacity-60 hover:bg-red-50"
                >
                  {mfaBusy ? 'Disabling…' : 'Disable two-factor authentication'}
                </button>
              </div>
            )}
          </section>
        </div>
      )}
      </main>
    </div>
  );
}
