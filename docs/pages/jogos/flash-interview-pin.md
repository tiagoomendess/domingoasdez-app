# Flash interview — PIN

- **Route:** `/flash-interview/{uuid}/pin` (optional `?error=<attempted pin>`)
- **Tab:** Jogos
- **Files:** `src/routes/flash-interview/[uuid]/pin/`, `src/lib/server/flash-interview.ts`

The gate in front of the [flash interview](flash-interview.md). Asks for the interview's 4-digit PIN when the visitor opened the link without one, or with a wrong one.

## What's on the page

- A short explanation, one numeric field (4 characters, `one-time-code` autocomplete) and a submit button.
- An error message that repeats the PIN that was tried.

## How it works

- A correct PIN is stored in an `httpOnly` cookie scoped to this interview, then the visitor is redirected to the interview.
- A wrong PIN re-renders the page with the error.

## Edge cases and pitfalls

- Unknown `uuid` → 404, before any PIN is asked.
- The PIN check is a strict, trimmed string comparison, like the legacy `$pin !== $gameComment->pin`. `0123` and `123` are different PINs.
- The attempted PIN comes back either through `?error=` (when another page redirected here) or through the form result (after a POST). The page reads both.
- There's no rate limit on PIN attempts. With 4-digit PINs that's worth keeping in mind.
