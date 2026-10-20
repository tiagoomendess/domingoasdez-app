# Perfil (profile)

- **Route:** `/conta/perfil` (optional `?saved=1`)
- **Tab:** Conta
- **Files:** `src/routes/conta/perfil/`, `src/lib/server/auth/profile.ts`

The user's profile details. A small, focused replacement for part of the legacy `/perfil/editar`.

## What's on the page

- Read-only: name, email, member since.
- Editable: phone and bio.
- A save button, with a "saved" message after a successful save.

## How it works

- Logged-out visitors are redirected to the login page with `redirectTo=/conta/perfil`.
- Validation (both fields optional): phone 6–14 characters, bio 3–500 characters, after trimming.
- On success it redirects to `?saved=1` (post/redirect/get), so a refresh doesn't resubmit.

## Edge cases and pitfalls

- **Name and email can't be changed here.** They're shown as read-only fields with `tabindex=-1`.
- The phone isn't checked as a phone number, only by length.
- An empty phone or bio is allowed and clears the value.
- Accounts without a `user_profiles` row still work: the page shows empty phone and bio, and the first save creates the row. The 404 ("Profile not found") only happens when the user row has no email.
- The "saved" message comes from the query string, so it shows again if the user reloads `?saved=1`.
