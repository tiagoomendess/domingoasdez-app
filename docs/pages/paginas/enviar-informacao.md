# Enviar informação (info reports)

- **Route:** `/conta/informacao` (optional `?codigo=` / `?code=`, `?enviado=`, `?anonimo=0`)
- **Tab:** Páginas (it lives under `/conta` for legacy links, but `navigation.svelte.ts` maps it to Páginas)
- **Files:** `src/routes/conta/informacao/`, `src/lib/server/info-reports.ts`, `src/lib/info-reports.ts`

A form for readers to send news tips (a result, a transfer, a rumour…) to the editorial team, plus a way to check a tip's status with its code. Ports `InfoReportsController` (create, store, show, delete), without the email notification.

## What's on the page

- **Send form**: an "anonymous" switch, the information (10–500 characters), the source (5–155 characters), reCAPTCHA for guests, and a send button.
- After sending: a success message. Anonymous tips also show their 9-character code with a copy button.
- **Check a code**: a code field and the result: code, status (Enviada, Vista, Usada, Arquivada), date and content. Your own tips have a delete button.
- **As minhas informações** (logged in only): your non-anonymous tips. Tapping one asks to delete it.

## How it works

- Three form actions on the same page: `?/send`, `?/lookup` and `?/delete`, all with `use:enhance`.
- Codes are 9 characters from an alphabet without look-alikes (no `I`, `O`, `0`, `1`). Lookup trims and upper-cases what you type.
- `?codigo=` (or `?code=`) on the URL runs a lookup on load, so a code can be shared as a link.

## Edge cases and pitfalls

- **Guests are always anonymous.** The switch is disabled when logged out, and the server forces `anonymous = true` for guests whatever the form says.
- **Anonymous tips can never be deleted**, not even by the person who sent them: they have no user id, so "mine" is always false. Only a logged-in user's own non-anonymous tips can be deleted.
- Anyone who has a code can read that tip's content and status. The code is the only secret.
- Delete is a soft delete (`status = 'deleted'`). Deleted tips disappear from lookups and from the user's list.
- The reCAPTCHA token is single-use, so the widget is remounted after every submit. The comment in the component explains why that reset lives in the `enhance` callback and **not** in an `$effect`: doing it in an effect makes the effect read and write the same state and loop until Svelte throws `effect_update_depth_exceeded`.
- On a failed send, the typed content and source are echoed back so nothing is lost.
- Code generation retries 5 times on a collision, then fails with a "code" error.
