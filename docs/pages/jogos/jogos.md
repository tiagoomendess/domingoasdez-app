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
- An "Atualizar resultados" button to the admin app for users with `score_update` (today only).

## How it works

- No `?date` (or an invalid one) means today in `Europe/Lisbon`. Links to today always drop the query (`/jogos`), other days use `?date=`.
- Game status comes from `gameStatus`: **warm-up** from 30 min before kick-off, **live** for 3 h after kick-off, unless the game is marked finished or postponed.
- On today, live and warm-up games are pulled out of the day list into the live section, so a game never appears twice.
- Groups are sorted by competition priority (highest first), then competition id, then the earliest kick-off in the group.
- While today is selected and the tab is visible, the page polls `GET /api/jogos/dia` **every 5 s** (the legacy `/direto` cadence) and swaps the live and day lists in place. It also flips today's rail dot between live and normal.
- Scrolling near either end of the rail loads 14 more days and their dots from `GET /api/jogos/dias`. Changing month in the picker loads that month's dots too.
- Tapping a **live** game opens a small sheet: "Enviar resultado" (score report) or "Detalhes do jogo". Other games link straight to the game page.

## Edge cases and pitfalls

- **The poll runs every 5 s, not 30 s** as [`DESIGN_SYSTEM.md`](../../DESIGN_SYSTEM.md) says. That's a deliberate match with the legacy page. It stops when the tab is hidden or another day is selected.
- Rail days and markers are seeded once from the first load and then kept in local state. A tap on a day that's already on the rail keeps the rail as it is (it just slides). A far jump from the calendar replaces the window. If you change how `data.days` is built, check both cases.
- The live split only happens for **today**. Viewing yesterday shows every game in the day list, even if one is still "live" by the clock.
- Scores: `games.goals_home/away` win when set. Otherwise the score is counted from `goals` rows. Scores only show for live and finished games. Penalties only show when the score is level and both penalty values are set.
- The skeleton only shows while navigating to `/jogos` itself (a date change). The global navigation loader skips query-only changes here.
- The marker endpoints refuse ranges over 62 days and `from > to` (400).
- The Games tab's red pulse in the tab bar is a separate check: `AppShell` polls `GET /api/jogos/live` every 30 s.
- Legacy `/hoje?date=…` and `/direto` redirect here (301).
