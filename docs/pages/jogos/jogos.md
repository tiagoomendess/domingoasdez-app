# Jogos (games by day)

- **Route:** `/jogos` (optional `?date=YYYY-MM-DD`)
- **Tab:** Jogos (tab root)
- **Files:** `src/routes/jogos/`, `src/lib/server/games.ts`, `src/lib/games.ts`, `src/lib/components/games/`

Merges the legacy "jogos do dia" (`/hoje`) and "em direto" (`/direto`) pages into one. You pick a day on a date rail and see that day's games, grouped by competition.

## What's on the page

- **DateRail**: a horizontal row of days, ±14 days around the selected one, with "Hoje" for today. A dot marks days with games; a red dot marks today when something is live. A calendar pill opens a month picker in a Sheet.
- **A decorrer** (today only, when games are live): live and warm-up games, grouped by competition.
- **Jogos do dia** (or "Outros jogos de hoje" when there's a live section): the rest of the day's games, grouped by competition, in a 2-column masonry from 1024 px.
- **Empty day**: an empty state with a "Próximo jogo: {date}" button when there's a later game day, or "Voltar a hoje".
- **Swipe between days**: swipe left anywhere on the page for the next day, right for the previous one, including the empty space just above the tab bar.
- An "Atualizar resultados" button to the admin app for users with `score_update` (today only).

## How it works

- No `?date` (or an invalid one) means today in `Europe/Lisbon`. Links to today always drop the query (`/jogos`), other days use `?date=`.
- Game status comes from `gameStatus`: **warm-up** from 30 min before kick-off, **live** for 3 h after kick-off, unless the game is marked finished or postponed.
- On today, live and warm-up games are pulled out of the day list into the live section, so a game never appears twice.
- Groups are sorted by competition priority (highest first), then competition id, then the earliest kick-off in the group.
- While today is selected and the tab is visible, the page polls `GET /api/jogos/dia` **every 5 s** (the legacy `/direto` cadence) and swaps the live and day lists in place. It also flips today's rail dot between live and normal.
- Scrolling near either end of the rail loads 14 more days and their dots from `GET /api/jogos/dias`. Changing month in the picker loads that month's dots too.
- **Goal feedback**: each poll is compared with the previous one, by match id. A live game whose score changed is highlighted. The row flashes red, holds for about 3 s and has faded out by 7 s. For 10 s its status reads "Golo!", and the scorer's number is red. If any score went **up** and the "Som dos golos" preference is on, a short sound plays once (`src/lib/goal-sound.ts`).
- **Day swipe** (`SwipePager` in `src/lib/swipe-pager.svelte.ts`, the same gesture and slide as the competition rounds). It listens on the whole document and only takes touches inside `<main>`, so the tab bar and floating buttons never trigger it.
  - A touch is a swipe only after 10 px of mostly sideways travel. Taps still open games, and the click at the end of a swipe is swallowed.
  - As soon as the direction is known, the next day is preloaded (`preloadData`).
  - On commit the rail switches to the new day at once (`pendingDay`, shown before the day has loaded) and slides to centre it, while the content below the rail slides out. Then the page jumps to the top if it was scrolled, `goto` loads the day like a rail tap (a history entry, `reset: false`), and the new day (or its skeleton) slides in.
  - The sliding content sits in an `overflow-x: clip` box that reaches the screen edge, so a day sliding out never widens the page.
- Tapping a **live** game opens a small sheet: "Enviar resultado" (score report) or "Detalhes do jogo". Other games link straight to the game page.

## Edge cases and pitfalls

- **The poll runs every 5 s, not 30 s** as [`DESIGN_SYSTEM.md`](../../DESIGN_SYSTEM.md) says. That's a deliberate match with the legacy page. It stops when the tab is hidden or another day is selected.
- Rail days and markers are seeded once from the first load and then kept in local state. A tap on a day that's already on the rail keeps the rail as it is (it just slides). A far jump from the calendar replaces the window. If you change how `data.days` is built, check both cases.
- The live split only happens for **today**. Viewing yesterday shows every game in the day list, even if one is still "live" by the clock.
- Scores: `games.goals_home/away` win when set. Otherwise the score is counted from `goals` rows. Scores only show for live and finished games. Penalties only show when the score is level and both penalty values are set.
- A swipe that starts on the date rail scrolls the rail (it scrolls sideways itself), and touches in sheets are ignored. Swiping past the days on the rail loads the next 14 at once, so the new pill is there.
- `pendingDay` is cleared when its navigation settles. If a newer swipe or a tap took over, the newer one wins. If the load fails, the rail goes back to the shown day.
- The skeleton only shows while navigating to `/jogos` itself (a date change). The global navigation loader skips query-only changes here.
- The marker endpoints refuse ranges over 62 days and `from > to` (400).
- The Games tab's red pulse in the tab bar is a separate check: `AppShell` polls `GET /api/jogos/live` every 30 s.
- Goals are only detected between two polls. The first load, a day change and coming back to a hidden tab never flash, but a goal scored while the tab was hidden does flash on the first poll after it's visible again. Games must be `live` in both snapshots, so warm-up → live never counts.
- Browsers only allow sound after a gesture. The page unlocks audio on any pointerdown or keydown, and turning the switch on in `/conta` also does. Chrome and Android also allow it after any earlier tap in the app (sticky activation). Until then a goal still flashes, but silently. iOS also mutes it with the silent switch.
- To test, use the game in the `variables.test_game_id` row: move its date to about 20 minutes ago (UTC), set `finished=0`, and change `goals_home`/`goals_away` while `/jogos` is open.
- Legacy `/hoje?date=…` and `/direto` redirect here (301).
