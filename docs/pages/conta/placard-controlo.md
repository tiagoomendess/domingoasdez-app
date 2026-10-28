# Controlar o placard (stadium screen controller)

- **Routes:** `/placard/controlo` (your screens), `/placard/controlo/{id}` (the controller)
- **Tab:** Conta (linked from Conta as "Placard eletrónico")
- **Files:**
  - Routes: `src/routes/placard/controlo/`
  - Client: `src/lib/placard-poll.svelte.ts`
  - Shared logic: `src/lib/placard.ts` (actions, clock)
  - Server: `src/lib/server/placard/` (`store.ts`, `score-push.ts`, `access.ts`)
  - API: `src/routes/api/placard/[id]/` and `…/acoes`

The phone side of a stadium screen: the score and clock buttons of the old `react-scoreboard` admin page.

## What's on the page

- **`/placard/controlo`:** the screens the user is controlling (game and score), plus "Ligar um ecrã".
- **`/placard/controlo/{id}`:**
  - A mini scoreboard: clock, score and period.
  - One row per team with `−` and `+` (the `+` is the big accent button).
  - A note saying what happens to the game's score.
  - The clock row: −1′, reset, play/pause, Intervalo (45:00), +1′.
  - "Terminar", with a confirmation Sheet.
  - When the screen has left the game: an empty state that links back to the list.

## How it works

- **Who:** the user who paired the screen, or anyone with `score_update`. Others get a 404. The check runs again on the locked row for every action.
- **Actions:**
  - Each one is `POST /api/placard/{id}/acoes` with a JSON `PlacardAction`, applied on the stored state in a transaction (`SELECT … FOR UPDATE`).
  - The transaction bumps `version` and logs a `placard_events` row with the user.
  - The old controller sent the whole object on every tap, so two phones, or quick taps, overwrote each other.
- **Optimistic UI.** The page applies the action locally first (`applyAction`), then takes the server's answer. A failure shows a Toast and reloads the state; the page never navigates away.
- **Polling:** every 2 s while the tab is visible. The old controller never re-read the state.
- **Clock rules** (`applyAction`):
  - Start and pause use server time.
  - ±1′ is clamped at 00:00 and keeps the clock running or paused. The old −1′ produced a negative clock when paused, and stopped and reset the clock under 1:00.
  - Intervalo sets 45:00, paused, and only works in the first half. The next start is the second half.
  - Reset goes back to 00:00, paused, first half.
- **Scores** are 0–99.
- **Score push.** Only score actions push to the game, never clock taps. The push goes through `pushPlacardScore`, the same core as the legacy `PUT /api/games/{game}/scoreboard-updated`:
  - it needs the game started and not finished;
  - it writes a `placard` score report with the `user_id`, deduped over 5 minutes;
  - when `games.scoreboard_updates` is on, it sets `goals_home` / `goals_away`.
  - It pushes the score stored _after_ the transaction, so concurrent taps settle on the latest.
- **Terminar** releases the screen: back to pairing with a clean state, a new code on the TV, and an `end` event. The game's score on the site is left as it is.
- **Publicidade** (ad breaks), with the home club's ads from [its setup page](../competicoes/clube-placard.md):
  - A row of thumbnails with their duration. The ad preselected for the next break is outlined (`controls.nextAdId`); tapping another one picks it instead.
  - "Mostrar anúncio (N s)" sends `{ type: 'show_ad', adId }`. The server checks the ad belongs to the game's **home** club, that no break started in the last 2 minutes, and that no overlay is still on.
  - It then sets the overlay, stamps `last_ad_at`, logs a `show_ad` event, and preselects the next ad in position order (wrapping) in `next_ad_id`, so next time a single tap is enough.
  - Ad breaks are only ever started by hand.
  - While the ad is on, the button counts down "No ecrã… N s". During the cooldown it's disabled with "Disponível em m:ss". Both are computed from server time.
  - Refusals come back as 409 with a `reason`: `ad_cooldown`, `busy` or `ad_not_found`, each with its own toast.
  - A home club without ads gets a short hint instead of the row.

## Edge cases and pitfalls

- Actions are limited to 20 per 5 s per user (429, "Demasiados toques seguidos").
- A score correction (going down) is pushed too, like the old screen, and it can lower the game's score.
- The controller polls with `?v=`. A 404 (screen released or taken over) shows the "no longer on a game" state.
- The `−` button is disabled at 0, and Intervalo is disabled outside the first half.
