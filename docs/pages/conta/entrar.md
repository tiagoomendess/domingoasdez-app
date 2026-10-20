# Entrar (log in)

- **Route:** `/conta/entrar` (optional `?redirectTo=`, `?verified=1`, `?error=`)
- **Tab:** Conta
- **Files:** `src/routes/conta/entrar/`, `src/lib/server/auth/` (`users.ts`, `session.ts`, `throttle.ts`, `google.ts`, `social.ts`)

Email and password login, plus the social logins that are turned on. Works with the accounts and password hashes already in the legacy database.

## What's on the page

- Email, password, "Lembrar-me" checkbox and the submit button.
- A success message after email verification (`?verified=1`).
- Error messages for a wrong login, too many attempts, and social-login failures.
- One outlined button per enabled social provider.

## How it works

- **Password login**: on success it sets a signed `dad_session` cookie, valid 30 days, or 365 days with "Lembrar-me". Then it redirects to `?redirectTo=` when that's a safe path, otherwise to `/conta`.
- **Google login**:
  1. `/conta/entrar/google` stores a random `state` in a 10-minute `httpOnly` cookie and redirects to Google.
  2. `/conta/entrar/google/callback` checks the state, exchanges the code, and finds the **existing** user (by linked Google account, then by verified email).
  3. On success it sets a remembered (365-day) session and goes to `/conta`.
- Already logged in? The page and both social endpoints redirect to `/conta`.

## Edge cases and pitfalls

- **Social login never creates an account.** A Google user with no matching account gets "no account" and has to register first. Unverified Google emails are refused too.
- **Only Google is implemented.** `FACEBOOK_LOGIN_ENABLED` / `APPLE_LOGIN_ENABLED` would show their buttons, but those endpoints redirect back with `?error=unconfigured`. Keep them off.
- `?redirectTo=` comes from the **page URL**. The form also posts a hidden `redirectTo=/conta`, but the URL value wins. Both accept only paths starting with one `/` (no `//host`), so there's no open redirect.
- Missing, unverified and banned accounts get the same "wrong email or password" message as a wrong password, on purpose (same as the legacy site).
- **The throttle is in memory**: 5 failed attempts per IP + email per minute. It resets when the server restarts and isn't shared between processes (fine today with one PM2 instance).
- Google's redirect URI is built from the request origin, so it has to be registered in the Google console for every origin you test on.
