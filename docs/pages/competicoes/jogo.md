# Jogo (game)

- **Route:** `/competicoes/{season}/{competition}/{group}/{round}/{home}-vs-{away}`
- **Tab:** Competições on a deep link (the URL lives under `/competicoes`); otherwise the tab the user last tapped, usually Jogos
- **Files:** `src/routes/competicoes/[season=season]/[competition=slug]/[group=slug]/[round=round]/[clubs=clubs]/`, `src/lib/server/game-page.ts`, `src/lib/server/match-comments.ts`, `src/lib/comments.ts`, `src/lib/server/game-predictions.ts`, `src/lib/predictions.ts`, `src/lib/components/games/`, `src/lib/components/comments/`

The detail page of one game. Ports `GamesController@show` and `MvpVotesController@vote`.

## What's on the page

- A cover picture (the venue's), with a venue pill that opens a DirectionsSheet (Google Maps, Waze, and "Ver campo" to the [ground's page](campo.md)), and the competition, group and round at the bottom.
- **GameScoreboard**: both clubs (links to their pages), the score or kick-off time and status, penalties, recent form chips before the game (each opens a preview of that game, see below), the man of the match once decided, and a link to send the score.
- **Man of the match**: a "Votar" button that opens the MvpVoteSheet, a login button for guests, or "Votaste em X" once voted.
- **Flash interview** button, for the club's contact (see below).
- **Previsão** (`#previsao`): a score prediction for signed-in users before kick-off, then the community split and, once finished, a verdict (see below).
- Goals for each side, side by side from 768 px. Only once the game has started (see below).
- Referees.
- **HeadToHead**: stats and past games between the two teams.
- **Comments** (`#comentarios`): the article comments, plus up/down votes and a sort control (see below).
- Admin links to the admin app, by permission: edit game (`games.edit`), add goals (`goals.create`), score reports (`score_update`).

## How it works

- While the game is in warm-up or live and the tab is visible, the page calls `invalidate('app:game')` every **30 s**. The scoreboard also triggers a reload at kick-off.
- **Score visibility:** shown once kick-off has passed, unless the game is postponed. The goal cards follow the same rule (`showScore`): before kick-off, and for postponed games, they're not rendered at all. Admins still have the add-goal links in the admin group at the bottom.
- **MVP vote window:** from kick-off + 65 min to kick-off + 240 min. One vote per user per game, and the player must belong to one of the two teams. Voting needs an account.
- **MVP winner:** shown once the game is finished and the vote has closed, if there's at least one vote.
- **Score report link:** from kick-off until 6 h after.
- **Flash interview link:** shown only when the logged-in user's email matches the home or away team's contact email (falling back to the club's), and a `game_comments` row exists for that team. The link already carries the PIN.
- **Head to head:** the past meetings of the two teams (visible, finished, before this game's date), newest first, as in the legacy site.
  - The stats bar counts **all** of them, from a light query with no joins. The list rows are loaded a page at a time.
  - Guests see the last 2 and a login prompt with the count of the rest.
  - Logged-in users see the first **10**, then a "Ver mais" button with "10 de 24 jogos" above it. Each tap fetches the next 10 from `GET /api/jogos/{id}/anteriores?offset=` and appends them, without a navigation (so no NavigationLoader). On a failed fetch the line shows an error and the button becomes "Tentar novamente". The button disappears after the last page.

### Predictions

- Stored in `game_predictions` (owned by the admin's migrations): one row per user and game, goals for each side (0–20) and, only for a level pick in a knockout game, `penalty_winner`.
- **Kind of game:** `group_rules.type = 'elimination'` is a knockout game (no draw; a level score asks who goes through on penalties). `points`, `friendly` and `other` allow a draw.
- **Window:** opens **7 days before kick-off** (`PREDICTION_WINDOW_DAYS` in `src/lib/predictions.ts`) and stays open until kick-off, unless the game is finished or postponed (`predictionWindow`). Before that the card only says when predictions open. The `?/predict` action checks it again on the server: too early or closed → 403 (`not_open` / `closed`), a bad score or a missing penalty pick → 400. Saving again replaces the prediction (upsert on the unique key). The reload at kick-off and the 30 s live refresh close the card on their own.
- **Community split:** the share of each outcome and the three most predicted scores. It's only sent to the page once you've predicted, or after kick-off for everyone (guests included), so it can't be read early from the page data. With no predictions at all, the card is hidden once closed.
- **Judging** (`judgePrediction` in `src/lib/predictions.ts`), on the score the page shows once the game is finished:
  - "Resultado exato" when both goals match; it wins over everything else.
  - The winner otherwise. Points games: a level score is a draw even when penalties were taken. Knockout games: a level score goes to the penalties winner.
  - A knockout game that ended level with **no penalties on file** has no winner: "Sem vencedor apurado", and only an exact score counts.
  - A level pick saved without a penalty winner (possible only if the group's rules changed to elimination afterwards) counts as a draw, so it's wrong.

### Comments

- Stored in `match_comments` and `match_comment_votes` (owned by the admin's migrations). The legacy site had no game comments; `game_comments` is the flash-interview table, not this.
- Posting and deleting follow the article comments: 255 characters, one comment per user every 10 s (counted on `match_comments`), one level of replies, soft delete by the author or `admin`. They are the `?/comment` and `?/deleteComment` actions on the game page, which resolve the game from the URL (a non-canonical URL gives 404).
- Comments are open before, during and after the game. They load with the page, so the 30 s live refresh also refreshes them and their scores.
- **Votes:** one per user and comment, +1 or -1. Tapping the active arrow removes it. The score is the sum, computed on read (nothing is stored on the comment). You can't vote on your own comment (arrows disabled, the endpoint answers 403). Guests' arrows link to the login page.
- Votes go to `POST /api/jogos/{id}/comentarios/{comment}/voto` (JSON; articles use the same component with `/api/noticias/…`), not a form action, so a vote doesn't re-run the page load. The vote shows straight away and rolls back with an error toast if the request fails.
- **Sort:** Mais votados (default; ties go to the oldest), Recentes, Antigos. Shown from 2 threads. It's local state: no URL change, and it resets on reload. Replies always stay oldest first.

### URL canonicalisation

- Legacy long seasons (`2025-2026`) redirect (301) to the short form.
- If the competition, season, group or clubs slug doesn't match what the game's data produces, the page redirects (301) to the canonical URL.
- The legacy competition-first shape `/competicoes/{competition}/{season}/{group}/{round}/{clubs}` is caught by a `+server.ts` and redirected to the season-first shape.

## Edge cases and pitfalls

- **Referee links are broken.** Referee rows link to `/arbitros/{id}/{slug}`, but that route doesn't exist yet in this app, so they 404.
- The group slug falls back to the competition's display name when the game has no group name. Single-group competitions have URLs like `/competicoes/2025-26/taca/taca/3/a-vs-b`.
- The scores come from `games.goals_home/away` when set, otherwise from counting `goals` rows.
- Form chips are only loaded before the game starts.
- **Form chip preview:** tapping a chip opens the FormGameSheet instead of leaving the page: "{team} venceu / empatou / perdeu", the competition and round, that game as a static MatchRow (date, status, score, penalties), then "Ver jogo" (goes to it) and "Fechar". The chips stay real links, so Ctrl/⌘/Shift/middle click still open the game in a new tab, and without JavaScript they navigate as before. Each chip's accessible name spells out the result, the opponent and the score.
- The pages loaded with "Ver mais" live in the HeadToHead component, which is keyed by the game id: they survive the 30 s live refresh but reset when you open another game from the list. Past games are ordered by date and then id, so pages never overlap when two games share a kick-off time.
- The `/api/jogos/{id}/anteriores` endpoint answers 401 to guests, so the login wall can't be skipped by calling it directly.
- The MVP "already voted" case returns 409, "closed" 403, and "player not in either team" 400. The sheet handles these, but a stale page (opened before the window closed) can still hit "closed".
- The MVP squad pickers hide photos of under-18 players unless the user has the `players` permission.
- Admin links point at the **new admin app** (`ADMIN_BASE_URL`), not the legacy backoffice.
- **Group and club names drive the URL, and they must match exactly.** The game is found by `slugify(group)`, `slugify(home club)` and `slugify(away club)`, so renaming a group or a club breaks every old link to its games (404). The canonicalisation redirect only really helps with the season form and the competition-name fallback described in [competicao.md](competicao.md).
- Hidden games (`games.visible = false`) 404, even though they still show on the competition page.
- **Elimination isn't always reliable in the data.** Pre-season ("Pré Época") groups use elimination rules but their games often end level with no penalties, and two-legged ties exist (a first leg can be level). Both are judged "Sem vencedor apurado" for the winner, and users there can't pick a draw.
- **"Mais votados" sorts by the server's scores, not your optimistic vote**, so a comment doesn't jump away when you vote on it. It moves on the next load (live refresh or a post). An optimistic vote is dropped once fresh page data arrives, since that data already has it.
- **Deleted accounts:** the legacy `ProcessDeleteRequest` job blanks the user's name and email but only wipes `article_comments`, so match comments by users with neither a name nor an email are hidden on read. Their votes still count.
