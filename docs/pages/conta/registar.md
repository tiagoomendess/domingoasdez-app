# Registar (create account)

- **Route:** `/conta/registar`
- **Tab:** Conta
- **Files:** `src/routes/conta/registar/+page.server.ts`, `src/routes/conta/registar/+page.svelte`, `src/lib/server/auth/register.ts`, `src/lib/server/mail.ts`

Creates a new account and sends the verification email. The account can't log in until the email is verified.

## What's on the page

- Name, email, password and password confirmation.
- Two required checkboxes: the terms and privacy policy, and the RGPD consent.
- reCAPTCHA, when keys are configured.
- A submit button and a link to log in.

## How it works

- Validation: name up to 155 characters, a valid email up to 155, password at least 6 characters and matching, both checkboxes ticked.
- The email must not exist already (case-insensitive).
- It creates the user (`verified = false`, a 16-character email token) and a profile row with `account_data_consent` set to now, then sends the verification email.
- On success it redirects to [`/conta/registar/verificar/{email}`](verificar-email.md).
- Logged-in users are sent to `/conta`.

## Edge cases and pitfalls

- **If the email fails to send, the user row is deleted again** (best effort), so the person can retry with the same address. If that rollback fails, the legacy cron also clears unverified rows after about 15 minutes.
- A duplicate-key error from MySQL (two submits racing) is reported as "email already taken".
- reCAPTCHA is only enforced when **both** the site key and the secret are set. With only the site key, the widget shows but the server doesn't check it.
- The submit button stays disabled until the reCAPTCHA is solved, and the widget remounts after every submit because tokens are single-use.
- Passwords are hashed in a format the legacy Laravel site can read, so accounts created here also work there.
- The verification link is built from the request origin, so an account registered on a dev host gets a dev-host link.
