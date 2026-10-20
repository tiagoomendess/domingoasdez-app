# Jogo (game)

- **Route:** `/competicoes/{season}/{competition}/{group}/{round}/{home}-vs-{away}`
- **Tab:** Competições on a deep link (the URL lives under `/competicoes`); otherwise the tab the user last tapped, usually Jogos
- **Files:** `src/routes/competicoes/[season=season]/[competition=slug]/[group=slug]/[round=round]/[clubs=clubs]/`, `src/lib/server/game-page.ts`, `src/lib/components/games/`

The detail page of one game. Ports `GamesController@show` and `MvpVotesController@vote`.

## What's on the page

- A cover picture (the venue's), with a venue pill that opens a DirectionsSheet, and the competition, group and round at the bottom.
- **GameScoreboard**: both clubs (links to their pages), the score or kick-off time and status, penalties, recent form chips before the game, the man of the match once decided, and a link to send the score.
- **Man of the match**: a "Votar" button that opens the MvpVoteSheet, a login button for guests, or "Votaste em X" once voted.
- **Flash interview** button, for the club's contact (see below).
- Goals for each side, side by side from 768 px.
- Referees.
- **HeadToHead**: stats and past games between the two teams.
- Admin links to the admin app, by permission: edit game (`games.edit`), add goals (`goals.create`), score reports (`score_update`).

## How it works

- While the game is in warm-up or live and the tab is visible, the page calls `invalidate('app:game')` every **30 s**. The scoreboard also triggers a reload at kick-off.
- **Score visibility:** shown once kick-off has passed, unless the game is postponed.
- **MVP vote window:** from kick-off + 65 min to kick-off + 240 min. One vote per user per game, and the player must belong to one of the two teams. Voting needs an account.
- **MVP winner:** shown once the game is finished and the vote has closed, if there's at least one vote.
- **Score report link:** from kick-off until 6 h after.
- **Flash interview link:** shown only when the logged-in user's email matches the home or away team's contact email (falling back to the club's), and a `game_comments` row exists for that team. The link already carries the PIN.
- **Head to head:** guests see the last 2 past games and a login prompt for the rest; logged-in users see all of them.

### URL canonicalisation

- Legacy long seasons (`2025-2026`) redirect (301) to the short form.
- If the competition, season, group or clubs slug doesn't match what the game's data produces, the page redirects (301) to the canonical URL.
- The legacy competition-first shape `/competicoes/{competition}/{season}/{group}/{round}/{clubs}` is caught by a `+server.ts` and redirected to the season-first shape.

## Edge cases and pitfalls

- **Referee links are broken.** Referee rows link to `/arbitros/{id}/{slug}`, but that route doesn't exist yet in this app, so they 404.
- The group slug falls back to the competition's display name when the game has no group name. Single-group competitions have URLs like `/competicoes/2025-26/taca/taca/3/a-vs-b`.
- The scores come from `games.goals_home/away` when set, otherwise from counting `goals` rows.
- Form chips are only loaded before the game starts.
- The MVP "already voted" case returns 409, "closed" 403, and "player not in either team" 400. The sheet handles these, but a stale page (opened before the window closed) can still hit "closed".
- The MVP squad pickers hide photos of under-18 players unless the user has the `players` permission.
- Admin links point at the **new admin app** (`ADMIN_BASE_URL`), not the legacy backoffice.
- **Group and club names drive the URL, and they must match exactly.** The game is found by `slugify(group)`, `slugify(home club)` and `slugify(away club)`, so renaming a group or a club breaks every old link to its games (404). The canonicalisation redirect only really helps with the season form and the competition-name fallback described in [competicao.md](competicao.md).
- Hidden games (`games.visible = false`) 404, even though they still show on the competition page.
