# Previsões (leaderboard)

- **Route:** `/previsoes`
- **Tab:** none yet (falls back to Início)
- **Files:** `src/routes/previsoes/+page.server.ts`, `src/routes/previsoes/+page.svelte`, `src/lib/server/prediction-leaderboard.ts`, `predictionPoints` / `rankLeaderboard` in `src/lib/predictions.ts`

Ranks the people who predict scores on the game page (`#previsao`). New in this app; the legacy site had no predictions. **Hidden for now:** nothing links to it and it's `noindex`. Remove the `robots` meta when it gets linked.

## What's on the page

- "Previsões" title and one line with the scoring rules.
- A SegmentedControl: **7 dias · 30 dias · Sempre** (short so they fit at 320 px).
- The top 50 as a ListGroup: position (top 3 on a gold tint), Avatar, name, "N exatos · N certos · N jogos" (exact scores, other right outcomes, predictions counted) and the points. The viewer's own row is tinted.
- A signed-in viewer ranked outside the top 50 gets their row in a second group, "A tua posição".
- An empty state when nobody has points in that period.

## How it works

- **Points**: 3 for the exact score, 1 for the right winner or draw, 0 otherwise. In a knockout game, an exact level score with the wrong side through on penalties gets 0; with no penalties on file (no winner, `void`) an exact score still gets 3.
- **Ranking**: points, then exact scores, then fewest predictions (better hit rate). People still level share a position ("1, 2, 2, 4") and are listed by name.
- **Periods** are rolling (now minus 7 or 30 × 24 h) and use the game's kick-off, not when the prediction was made. Only finished, visible, non-postponed games count.
- Every period is loaded at once. Switching only rewrites `?periodo=30d|sempre` with `replaceState` (no param = 7 days), so nothing is refetched.
- Games are judged on the score the game page shows: `goals_home/away`, falling back to the goal events when empty (`resolveScores`), with penalties only when level.
- The board is the same for everyone, so it's built once and cached in memory for 2 minutes per server process.

## Edge cases and pitfalls

- A score corrected after the game, or a game finished late, shows up on the board within the 2-minute cache.
- Deleted accounts (name and email blanked by the legacy job) are left out, like in comments.
- The whole all-time set of predictions on finished games is read on each rebuild. Fine at today's volume; if it grows a lot, move the aggregation into SQL or store points per prediction.
- Changing a group's rules after the game changes how its predictions are judged (draw vs. penalties), here and on the game page alike.
