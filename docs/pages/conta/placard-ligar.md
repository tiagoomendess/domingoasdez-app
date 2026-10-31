# Ligar um ecrã (pair a stadium screen)

- **Routes:** `/placard/ligar` (type the code), `/placard/ligar/{code}` (choose the game; the TV's QR code opens this)
- **Tab:** Conta
- **Files:**
  - Routes: `src/routes/placard/ligar/`
  - Server: `src/lib/server/placard/games.ts` (`placardGames`), `src/lib/server/placard/store.ts` (`pairPlacard`, `isPairingCodeLive`)

Puts a stadium screen (see [placard.md](placard.md)) on one of today's games, controlled by the signed-in user.

## What's on the page

- `/placard/ligar`: a TextField for the 6-character code and "Continuar".
- `/placard/ligar/{code}`: "Ecrã ABC 23X: escolhe o jogo", then a ListGroup of today's games (emblems, "Home – Away", kick-off time and status). Tapping a row pairs the screen.
- Empty states for a dead code ("Código inválido ou expirado", with a link to type it) and for a day with no games.

## How it works

- **Signed-in only.** Guests are sent to `/conta/entrar?redirectTo=<this path>` and come back to the same code. Any signed-in user can pair a screen, unless banned from score reports (see the controller's doc): they get a 403.
- The typed code is normalised: spaces and dashes are dropped and it's upper-cased. A lower-case code in the URL redirects to the canonical form.
- **The games:** the visible games of today's **Lisbon** day, then the `test_game_id` variable's game, kept last as on the old screen. Legacy used the UTC day.
- **Pairing** is a locked update on the row with that code, still in `pairing`, and not expired. If two phones race for the same code, only one wins; the other sees "Código inválido ou expirado".
- The screen starts from the game's **current score** (`resolveScores`). The old one started at 0:0, so pairing mid-game showed a wrong score until someone fixed it.
- The clock starts at 00:00, paused, first half.
- A `pair` event is logged, then the user goes to the controller, `/placard/controlo/{id}`.

## Edge cases and pitfalls

- The POST checks the game against today's list again, so a stale page can't pair a game from yesterday.
- A code is single-use: pairing clears it. When the screen is released, the TV draws a new one.
- The old flow wrote the code into a phone cookie and created the scoreboard from whatever code that cookie held, so a stale cookie could pair the wrong TV. Nothing is stored on the phone now.
