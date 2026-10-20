# Sondagem (poll)

- **Route:** `/sondagens/{slug}`
- **Tab:** Início
- **Files:** `src/routes/sondagens/[slug=slug]/`, `src/lib/server/polls.ts`, `src/lib/polls.ts`, `src/lib/server/feed/pollState.ts`

One poll. Depending on its state it shows the voting form, a "results from {date}" message, or the results.

## What's on the page

- A "Sondagem" label and a status pill (open, with "ends in …", or closed).
- The question.
- One of three bodies:
  - **open**: radio list of answers, reCAPTCHA for guests, and a "Votar" button.
  - **pending**: "Resultados a partir de {date}".
  - **results**: answers ranked by votes with percentage bars. The leading answer is gold.
- End date line, partner grid, and an "Editar" admin link for users with `polls.edit`.

## How it works

The state follows the legacy rules (`pollState`):

| Voted? | Closed? | Results date passed? | State   |
| ------ | ------- | -------------------- | ------- |
| yes    | any     | yes                  | results |
| yes    | any     | no                   | pending |
| no     | yes     | yes                  | results |
| no     | yes     | no                   | pending |
| no     | no      | any                  | open    |

"Voted" means a `poll{id}` cookie exists, or the logged-in user has a vote on one of the answers.

Voting (`voteOnPoll` / `decidePollVote`):

- Logged-in users and visitors with the `poll{id}` cookie can't vote twice.
- The same IP may vote twice (shared networks). A third vote from that IP is refused and treated as "already voted".
- Guests must pass reCAPTCHA. Logged-in users skip it.
- A successful vote sets the cookie and redirects back to the poll, which then shows pending or results.

## Edge cases and pitfalls

- **Cookie ↔ localStorage sync.** Like the legacy site, the page copies `poll{id}` between the cookie and `localStorage`. If the cookie was cleared but `localStorage` still has it, the page restores the cookie and **reloads once** (guarded by a `sessionStorage` flag so it can't loop). Don't be surprised by that reload when testing.
- The cookie isn't `httpOnly` on purpose, because the page script reads it. It lives for about 400 days (576,000 minutes, the legacy value).
- "Closed" and "already voted" errors don't show a message. They just redirect back, and the page shows the right state.
- Vote counts are only queried in the results state, so the open state never leaks them.
- Hidden polls (`visible = false`) return 404.
- A poll with no image uses the legacy `/images/poll_default.png` for `og:image`.
- The reCAPTCHA token is single-use. After a failed submit the widget is remounted (`captchaEpoch`), otherwise the second try would send a used token.
