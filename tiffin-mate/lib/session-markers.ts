// Non-secret, frontend-origin marker cookies used only by middleware.ts to
// decide which page to redirect to. They carry no authority: the real
// session lives in httpOnly cookies set by the backend on its own origin,
// which the frontend cannot read or write (by design) and which every
// actual API call is authorized against server-side regardless of these
// markers. See the comment in middleware.ts for why this split exists.
const MARKER_MAX_AGE = 7 * 24 * 60 * 60; // 7 days - mirrors the backend refresh token lifetime

export function setSessionMarkers(role: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `logged_in=1; path=/; max-age=${MARKER_MAX_AGE}; SameSite=Lax`;
  document.cookie = `role=${role}; path=/; max-age=${MARKER_MAX_AGE}; SameSite=Lax`;
}

export function clearSessionMarkers() {
  if (typeof document === 'undefined') return;
  document.cookie = 'logged_in=; path=/; max-age=0';
  document.cookie = 'role=; path=/; max-age=0';
}

// Client components use this to decide whether to bother rendering/fetching
// at all before the backend gets a chance to say so via a 401. It is a UX
// shortcut only - never a security check.
export function hasSessionMarker(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie.split(';').some((c) => c.trim().startsWith('logged_in='));
}
