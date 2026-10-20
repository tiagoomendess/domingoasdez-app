# Conta (account)

- **Route:** `/conta`
- **Tab:** Conta (tab root)
- **Files:** `src/routes/conta/+page.server.ts`, `src/routes/conta/+page.svelte`, `src/lib/components/account/`

The account hub. Logged out, it invites the user to log in or register. Logged in, it shows a profile card and Settings-style links. The preferences group is there in both cases.

## What's on the page

**Logged out**

- A hero card with the logo, "Entra na tua conta", a line about the benefits, and "Entrar" / "Criar conta" buttons.

**Logged in**

- A profile card: avatar (72), name, email and "Editar foto", which opens the ProfilePhotoSheet (upload or remove).
- "Terminar sessão" (destructive row).
- "Perfil" → [`/conta/perfil`](perfil.md).
- "Backoffice" → the admin app, only with the `dashboard` permission.
- "Conta e privacidade" → "Alterar palavra-passe" → [`/conta/palavra-passe`](palavra-passe.md), only when the account has a password.

**Always**

- **Preferências**: Appearance (Automatic / Light / Dark), Language (pt-PT, en, fr), and switches to show or hide the floating back button and theme button.

## How it works

- Actions on this page: `?/picture` (upload), `?/removePicture`, `?/logout`.
- Photos are re-encoded on the server as a 400×400 JPEG (metadata stripped, rotation fixed) and uploaded to object storage (R2). The browser shrinks them first, and the server refuses anything above 9 MB.
- Logout clears the `dad_session` cookie and reloads `/conta`.
- Preferences are cookies (`theme`, back button, theme button, and Paraglide's locale cookie), so they work without an account.

## Edge cases and pitfalls

- **"Terminar sessão" logs out straight away.** The design system calls for a confirmation sheet, but the row just submits the logout form.
- Users who only ever logged in with Google have no password, so the change-password row is hidden (and the page itself redirects back here).
- Removing a photo only deletes files this feature uploaded. Social-login photo URLs and old legacy paths are left alone.
- Photo upload returns "unavailable" when object storage isn't configured, which is the normal state in a local setup without R2 keys.
- The legacy "Download my data" and "Delete account" flows aren't built yet.
- Language changes go through Paraglide's `setLocale`, which reloads the page. The locale is picked from the cookie, then the browser language, then pt-PT.
