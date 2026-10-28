# Routes without a page

Routes that render nothing themselves: legacy redirects, small JSON endpoints, and shims that hand requests to the legacy Laravel site. They're listed here so the page docs stay about pages.

## Legacy redirects (301)

| Route                                                         | Goes to                                 | Notes                                                                   |
| ------------------------------------------------------------- | --------------------------------------- | ----------------------------------------------------------------------- |
| `/home`                                                       | `/`                                     |                                                                         |
| `/noticias`                                                   | `/`                                     | Only the index. Article URLs under `/noticias/…` are real pages.        |
| `/hoje`                                                       | `/jogos`                                | Keeps `?date=`.                                                         |
| `/direto`                                                     | `/jogos`                                |                                                                         |
| `/competicoes/{competition}/{season}/{group}/{round}/{clubs}` | `/competicoes/{season}/{competition}/…` | Old competition-first game URL. Also shortens `2025-2026` to `2025-26`. |
| `/competicoes/{season}/{competition}/estatisticas`            | `…?vista=estatisticas`                  | Has an empty `+page.svelte`; the load function always redirects.        |

Season, competition, game, club, player and staff pages also 301 to their canonical slug. See each page's doc.

## Hand-offs to the legacy site (307)

`307` keeps the method and body, so POSTs still work.

| Route        | Forwards to                             | Why                                                       |
| ------------ | --------------------------------------- | --------------------------------------------------------- |
| `/storage/*` | same path on the legacy site            | Media still lives on the legacy filesystem.               |
| `/antigo/*`  | the rest of the path on the legacy site | Escape hatch: `/antigo/perfil/editar` opens the old page. |

Both use `legacyUrl()`, which reads `LEGACY_BASE_URL`, then `MEDIA_BASE_URL`. If neither is set they return a 500 instead of redirecting to a relative URL.

Any other `/api/*` path (`src/routes/api/[...path]`) returns a JSON 404 `{ "message": "Not Found" }`. It used to 307 to Laravel, but the legacy site is off in production.

## Other redirects

| Route                                       | What it does                                                                                                                                           |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/parceiros/{id}`                           | Counts a click for a visible partner (with the referrer), then 302s to the partner's URL with `from` set to this site. Unknown or hidden partners 404. |
| `/conta/entrar/{provider}` and `…/callback` | Social login. See [entrar.md](pages/conta/entrar.md).                                                                                                  |
| `/conta/registar/verificar/{email}/{token}` | Email verification link. See [verificar-email.md](pages/conta/verificar-email.md).                                                                     |

## JSON endpoints

| Route                                                | Used by                                    | Notes                                                                                                                                                                                                                                                                                                                                    |
| ---------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/feed?tipos=&cursor=`                       | Home feed infinite scroll                  | Same `getFeedPage` as the home page load.                                                                                                                                                                                                                                                                                                |
| `GET /api/jogos/dia?date=`                           | `/jogos` live polling (every 5 s on today) | `no-store`. An invalid date means today.                                                                                                                                                                                                                                                                                                 |
| `GET /api/jogos/dias?from=&to=`                      | Games date rail and month picker dots      | Max 62 days; `from` must be ≤ `to`, else 400.                                                                                                                                                                                                                                                                                            |
| `GET /api/jogos/live`                                | Tab bar live pulse (every 30 s)            | `no-store`. Returns `{ live: boolean }`.                                                                                                                                                                                                                                                                                                 |
| `GET /api/jogos/{id}/anteriores?offset=`             | Game page head to head, "Ver mais"         | Next 10 past meetings and `nextOffset` (null on the last page). Signed-in only (401); unknown or hidden game 404.                                                                                                                                                                                                                        |
| `GET /api/jogos/{id}/imagem?formato=quadrado\|story` | Game page "Imagem do jogo"                 | The game's square or story JPEG as an attachment (`{home}-vs-{away}-square.jpg`), drawn on request. Signed-in only (401); unknown format 400; unknown or hidden game 404. Writes an `audit` row.                                                                                                                                         |
| `POST /api/jogos/{id}/comentarios/{comment}/voto`    | Game page comment votes                    | JSON `{ value: 1 \| -1 \| 0 }` (0 removes the vote), returns `{ score, myVote }`. Only `application/json` (400 otherwise, or for a bad value). Guests 401, own comment 403, comment missing, deleted or on another game 404.                                                                                                             |
| `POST /api/noticias/{id}/comentarios/{comment}/voto` | Article comment votes                      | Same contract as the game comment vote above, on `article_comment_votes`.                                                                                                                                                                                                                                                                |
| `GET /api/transferencias/dias?from=&to=`             | Transfers date rail dots                   | Same limits as `/api/jogos/dias`.                                                                                                                                                                                                                                                                                                        |
| `GET /api/placard/estado?v=`                         | Stadium screen (TV), every 1 s             | `no-store`. Finds the screen by its `dad_placard` cookie, creating it on the first call (10 new screens per IP per hour, else 429). Renews the pairing code, releases stale screens, then `{ version, serverNow, unchanged: true }` while `v` is current, else the full state with the QR SVG. See [placard.md](pages/conta/placard.md). |
| `GET /api/placard/{id}?v=`                           | Placard controller, every 2 s              | `no-store`. Signed-in only (401); not the screen's controller (or `score_update`) 404. Same short answer while `v` is current.                                                                                                                                                                                                           |
| `POST /api/placard/{id}/acoes`                       | Placard controller buttons                 | JSON `PlacardAction` (`src/lib/placard.ts`), returns `{ state, scorePush }`. Only `application/json` (400 otherwise, or for an unknown action). Guests 401, not the controller 404, screen not on a game 409, more than 20 per 5 s 429.                                                                                                  |
| `GET /healthz`                                       | `scripts/deploy.sh`, uptime monitors       | `no-store`. Runs `SELECT 1`: `{ status: 'ok' }`, or 503 `{ status: 'error' }` when the database is down.                                                                                                                                                                                                                                 |

## Legacy public API

The Laravel `routes/api.php` endpoints that external clients use (mobile apps, the stadium scoreboard, the score-report bot, the player scraper), ported with the same contract: path, method, status codes, key names and order, value types, and which keys are present. The logic is in `src/lib/server/legacy-api/`, one module per Laravel controller.

| Route                                      | Auth  | Notes                                                                                                                                                                                                                                                                  |
| ------------------------------------------ | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/competitions`                    | —     | Competitions of the latest visible season.                                                                                                                                                                                                                             |
| `GET /api/competitions/{season_slug}`      | —     | `2025`, `2025-26` or `2025-2026`. 404 when no visible season matches.                                                                                                                                                                                                  |
| `GET /api/games/today`                     | —     | Visible games of the **UTC** day (legacy timezone). The `test_game_id` variable appends that game.                                                                                                                                                                     |
| `GET /api/games/live`                      | —     | Today's (UTC) games in their live window (kick-off −30 min to +3 h, finished included), grouped by game group in id order. Cached 30 s. `*_club_name_small` copies the legacy byte-level regex (`legacy-api/live.ts`). Used by external scripts as well as the old UI. |
| `GET /api/games/next/{team_id}`            | —     | The team's next visible game; `date` is `Y/m/d H:i` in Lisbon.                                                                                                                                                                                                         |
| `PUT /api/games/{game}/scoreboard-updated` | token | Scoreboard push: logs a `placard` score report (deduped over 5 min) and, if the game allows it, sets the score. 304 when unchanged. The core (`pushPlacardScore` in `src/lib/server/placard/score-push.ts`) is shared with the `/placard` screens.                     |
| `POST /api/score-reports/{game}`           | token | Score report with `source` `api_{source}`.                                                                                                                                                                                                                             |
| `GET /api/players?page=&per_page=`         | token | Visible players by id, Laravel pagination. `per_page` 15 by default, max 100.                                                                                                                                                                                          |
| `GET /api/clubs/search?name=`              | token | The legacy fuzzy match score, byte for byte like PHP.                                                                                                                                                                                                                  |
| `POST /api/player-update-requests`         | token | Create (no `player_id`) or update request, `pending`. 400 with Laravel-style `errors`, 200 for a duplicate in the last 10 days.                                                                                                                                        |
| `GET /api/player-update-requests/{id}`     | —     | Status of a request.                                                                                                                                                                                                                                                   |

- **Token:** the `Authorization` header (`Bearer` optional) must equal `variables.api_access_token` (cached 120 s). Missing: 401; wrong: 401 plus an `audit` row (`login_failed`). An unknown `{game}` is a 404 before the token is checked, as in Laravel.
- **Throttle:** 240 requests per minute per IP across these routes, with `X-RateLimit-*` headers and a 429.
- **Media** paths are returned as stored (relative, no `mediaUrl()` prefix), with the legacy default emblem.
- **Validation** is a port of the Laravel 5.8 rules these endpoints use (`legacy-api/validate.ts`), with the legacy messages.
- **Deliberate differences**, all legacy bugs: a validation error in `POST /api/score-reports` is a 400 (legacy threw a 500); `reviewed_at` on a reviewed request no longer 500s; `games/next` compares with UTC now (legacy skipped games starting within the next hour), falls back to `Desconhecido` without a playground, and 404s a non-numeric id; the score-report location is a bound parameter; a bad `per_page` uses 15; error pages are JSON instead of HTML; in `games/live`, a short club name with a stray byte gets a `?` (legacy failed with a 500) and a game with no group name links to its canonical URL.
- **Not ported**, so they 404: `GET /api/games/{id}`, `GET /api/games/is_live`, `GET /api/seasons/{id}/games` and `GET /api/competitions/{id}/seasons` (only the old UI used them), and `GET /api/user`, `POST /api/games/live/update_match` and `GET /api/seasons/{id}` (they never worked).

## Pitfalls

- **Legacy API paths are a public contract.** External apps call the routes in "Legacy public API" above; don't change their shape, and don't reuse those paths for the new UI.
- The `/storage/*` shim costs an extra round trip per request. The current `nginx.conf` sends everything to the Node app, so every `/storage/…` URL still printed in old article HTML goes through this redirect.
- `/arbitros/…` is mapped to the Competições tab in `navigation.svelte.ts` and linked from game pages, but there is **no route for it yet**, so those links 404.
