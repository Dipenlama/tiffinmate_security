// Non-secret, frontend-origin marker cookies used only by middleware.ts to
// decide which page to redirect to. They carry no authority: the real
// session lives in httpOnly cookies set by the backend on its own origin,
// which the frontend cannot read or write (by design) and which every
// actual API call is authorized against server-side regardless of these
// markers. See the comment in middleware.ts for why this split exists.
const SESSION_VERSION = '2';

export function setSessionMarkers(role: string) {
  if (typeof document === 'undefined') return;
  // No Max-Age/Expires: these are browser-session cookies and disappear when
  // the browser session ends instead of remembering an account for seven days.
  document.cookie = 'logged_in=1; path=/; SameSite=Lax';
  document.cookie = `role=${role}; path=/; SameSite=Lax`;
  document.cookie = `session_version=${SESSION_VERSION}; path=/; SameSite=Lax`;
  window.dispatchEvent(new Event('auth-state-changed'));
}

export function clearSessionMarkers() {
  if (typeof document === 'undefined') return;
  document.cookie = 'logged_in=; path=/; max-age=0';
  document.cookie = 'role=; path=/; max-age=0';
  document.cookie = 'session_version=; path=/; max-age=0';
  window.dispatchEvent(new Event('auth-state-changed'));
}

// Client components use this to decide whether to bother rendering/fetching
// at all before the backend gets a chance to say so via a 401. It is a UX
// shortcut only - never a security check.
export function hasSessionMarker(): boolean {
  if (typeof document === 'undefined') return false;
  const cookies = document.cookie.split(';').map((cookie) => cookie.trim());
  const loggedIn = cookies.some((cookie) => cookie === 'logged_in=1');
  const currentVersion = cookies.some((cookie) => cookie === `session_version=${SESSION_VERSION}`);
  return loggedIn && currentVersion;
}

export function getSessionRole(): string | null {
  if (!hasSessionMarker()) return null;
  const roleCookie = document.cookie
    .split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith('role='));
  return roleCookie ? decodeURIComponent(roleCookie.slice('role='.length)) : null;
}
