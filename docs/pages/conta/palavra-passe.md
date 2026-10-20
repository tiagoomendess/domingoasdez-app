# Alterar palavra-passe (change password)

- **Route:** `/conta/palavra-passe` (optional `?changed=1`)
- **Tab:** Conta
- **Files:** `src/routes/conta/palavra-passe/`, `src/lib/server/auth/profile.ts` (`changePassword`)

Lets a logged-in user change their password by entering the current one and the new one twice.

## How it works

- Logged-out visitors are redirected to the login page with `redirectTo=/conta/palavra-passe`.
- Accounts with no password (social-login only) are redirected to `/conta`. The link to this page is hidden for them too.
- The current password must be right. The new one has length limits (6–50 characters) and must match its confirmation.
- On success it redirects to `?changed=1` and shows a success message.

## Edge cases and pitfalls

- The form field names are the legacy ones (`password_atual`, `nova_password`, `nova_password_confirmation`) so the validation keys and the server code line up with the old controller. Don't rename them on one side only.
- The form is wrapped in `{#key}` on the error set, so the password fields are cleared after every failed attempt.
- **Changing the password doesn't log out other sessions.** Sessions are signed tokens in a cookie, not rows in a table, so there's nothing to revoke.
- There's no "forgot password" flow in this app yet.
