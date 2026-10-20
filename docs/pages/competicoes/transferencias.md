# Transferências (transfers by day)

- **Route:** `/transferencias` (optional `?date=YYYY-MM-DD`)
- **Tab:** Competições
- **Files:** `src/routes/transferencias/`, `src/lib/server/transfers.ts`, `src/lib/transfers.ts`

Player transfers, one day at a time, in the same shape as the [Jogos](../jogos/jogos.md) page.

## What's on the page

- "Transferências" title.
- A DateRail with dots on days that have transfers, and a calendar Sheet.
- That day's transfers: avatar, player name, "From → To", and the destination emblem. Each row links to the player.
- An empty state with "Transferências anteriores: {date}" pointing at the previous day that has any.

## How it works

- **Without `?date`, the page opens on the latest day that has transfers**, not today, because transfers are sparse. If there are none at all, it falls back to today.
- The day is the calendar date of `transfers.date`, the date entered in the backoffice.
- The rail loads more days near its ends from `GET /api/transferencias/dias` (max 62 days per request), like the games rail.
- There's no login wall.

## Edge cases and pitfalls

- **Repeats are never published.** The backoffice never checked for them, so some rows move a player to the team they were already in, or from no team to no team. A transfer only counts when it's a real move compared with the player's previous transfer (the latest earlier one, ignoring `visible`; no previous transfer means "no team"). Days with only repeats get no dot and no feed card. The rows stay in the database until the data is fixed.
- The same rule drives the home feed's TransferDayCard, so a fix to it changes both.
- Under-18 photos are hidden unless the user has `players`.
- The server builds an `editHref` (admin app) for users with `transfers.edit`, but the page doesn't render it yet. Rows always link to the player.
- **Nothing in the Competições tab links here yet.** The only way in is the "N transferências" link on a home-feed transfer card.
- Selecting a day is a query-only navigation, so this page shows its own skeleton and the global loader stays out of the way.
