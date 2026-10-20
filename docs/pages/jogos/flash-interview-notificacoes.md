# Flash interview — notifications

- **Route:** `/flash-interview/{uuid}/manage-notifications?pin=1234`
- **Tab:** Jogos
- **Files:** `src/routes/flash-interview/[uuid]/manage-notifications/`, `src/lib/server/flash-interview.ts`

Lets a club choose whether it gets the flash-interview emails, and which address they go to. The link comes from those emails.

## What's on the page

- A line naming the club.
- A switch to turn the notifications on or off.
- The contact email field (required, max 64 characters).
- A save button and a short note.

## How it works

- The PIN travels in the URL (`?pin=`) and as a hidden field. Unlike the interview page, it isn't stored in a cookie.
- The page only loads when `?pin=` matches the interview's PIN.
- Saving checks the PIN again, validates the email (Laravel `required|email|min:10|max:64`), saves, and redirects back to the same URL with a "saved" toast.

## Edge cases and pitfalls

- A missing or wrong `?pin=` returns **404**, the same as an unknown interview. There's no PIN form on this page, so a bad link just looks broken. A bad PIN on save (a tampered hidden field) shows an "invalid PIN" toast and returns 403.
- **The setting is club-wide.** `notifications_enabled` is stored on the club, so turning it off for one team turns it off for every team of that club.
- The email goes to the team's contact email when the team has one, otherwise to the club's. The page shows the same fallback (team first, then club).
- The email must be **at least 10 characters**, which is stricter than a normal email check. Short but valid addresses are refused.
- The switch submits through a hidden `notifications_enabled` input (`true`/`false`). The server reads it with checkbox semantics: present and non-empty.
- A failed save puts the typed email back in the field. The effect that does this only reads `form` and only writes `email`, so it can't loop. Keep it that way if you edit it.
