# Enviar resultado (score report)

- **Route:** `/score-reports/{gameId}` (optional `?returnTo=`)
- **Tab:** Jogos
- **Files:** `src/routes/score-reports/[id=id]/`, `ScoreReportEditor.svelte` (same folder), `src/lib/server/score-reports.ts`, `src/lib/score-reports.ts`

Lets anyone at a game send the current score, so live results can be updated by the crowd. Ports the legacy `ScoreReportsController` create + store.

Reached from the score on the game page and from the live-game sheet on `/jogos`.

## What's on the page

- Both club emblems and names with − / + steppers, and the score in the middle.
- A "Terminado" switch, only shown after 105 minutes from kick-off.
- "Já enviaste": the reports this visitor already sent for the game.
- A "Porquê a localização?" sheet, reCAPTCHA for guests, and the send button.
- Messages for closed, banned and every error case.

## How it works

1. The page makes sure the visitor has a long-lived `uuid` cookie (about one year), the same one the legacy site uses to track reporters.
2. The send button only enables once the score or the finished flag differs from the current one.
3. On submit, the editor first asks the browser for its location (8 s timeout, high accuracy) and writes it into hidden inputs, then submits again. No location is fine: the report is still saved, with a different success message.
4. The server checks, in order:
   - a valid `uuid` cookie;
   - reCAPTCHA for guests;
   - the scores: 0–32 is valid, but **either side above 20 creates a ban** (the legacy "ridiculous score" rule);
   - the report window: from kick-off until 6 h after;
   - active bans (by user, uuid, IP or user agent);
   - an identical report already sent by this user or uuid;
   - rate limits: one per user per minute, one per uuid per 4 min, three per IP per game per 4 min.
5. On success it sets a flash cookie and redirects to `returnTo`. The layout turns that cookie into a toast ("Resultado enviado: 2–1").

## Edge cases and pitfalls

- **Shadow bans look like success.** A shadow-banned reporter gets a success toast, but nothing is saved. Don't debug a "missing" report without checking `score_report_bans` first.
- The steppers stop at 31, but the server accepts up to 32 and bans above 20. The stepper limit isn't a security check, the server is.
- `returnTo` only accepts a path on this site (or an absolute URL on the same origin). Anything else falls back to the game page, which closes the open redirect the legacy site had.
- The location is written to the DOM **before** the resubmit on purpose. A plain state update would land after `FormData` is captured, and the coordinates would be lost. See the comment in `ScoreReportEditor.svelte`.
- A latitude or longitude of `0` is valid (the legacy PHP `empty()` check treated it as missing).
- After a failed submit the editor is re-keyed (`seedKey`) so the steppers reset to what the server echoed back, and the reCAPTCHA widget remounts.
- Logged-in users skip reCAPTCHA. Guests see a "log in to skip this" link.
