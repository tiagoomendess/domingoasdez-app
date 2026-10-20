# Verificar email

- **Route:** `/conta/registar/verificar/{email}` (optional `?error=`), and the link endpoint `/conta/registar/verificar/{email}/{token}`
- **Tab:** Conta
- **Files:** `src/routes/conta/registar/verificar/[email]/`, `src/lib/server/auth/register.ts` (`verifyEmailToken`)

Two routes that make up email verification:

- **The page** shown right after registering: "We sent an email to {email}", and a button to log in.
- **The link** in the email (`…/{email}/{token}`, a `+server.ts`): verifies the account and redirects.

## How it works

- The link checks the token against `users.email_token`. On success it sets `verified = true`, clears the token and redirects to `/conta/entrar?verified=1`, which shows a success message.
- On failure it redirects back to the page with `?error=`:
  - `missing`: no such email, or an empty token;
  - `already_verified`: the account was verified before;
  - `token_mismatch`: wrong or old token.

## Edge cases and pitfalls

- The page trusts the email in the URL and only displays it. Anyone can open `/conta/registar/verificar/anything@example.com`; it reveals nothing about whether the account exists.
- **Clicking the link twice shows an error** (`already_verified`) even though the account is fine. The message tells the user to log in.
- The email lookup in `verifyEmailToken` is an exact match, unlike registration, which compares case-insensitively.
- There's no "resend email" action. A user who lost the email has to wait for the legacy cron to clear the unverified row (about 15 minutes) and register again.
- Unknown `?error=` values are ignored and the normal "check your email" text shows.
