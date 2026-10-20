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

| Route        | Forwards to                             | Why                                                                                           |
| ------------ | --------------------------------------- | --------------------------------------------------------------------------------------------- |
| `/api/*`     | same path on the legacy site            | Unmigrated API endpoints stay on Laravel. More specific routes below win over this catch-all. |
| `/storage/*` | same path on the legacy site            | Media still lives on the legacy filesystem.                                                   |
| `/antigo/*`  | the rest of the path on the legacy site | Escape hatch: `/antigo/perfil/editar` opens the old page.                                     |

All three use `legacyUrl()`, which reads `LEGACY_BASE_URL`, then `MEDIA_BASE_URL`. If neither is set they return a 500 instead of redirecting to a relative URL.

## Other redirects

| Route                                       | What it does                                                                                                                                           |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/parceiros/{id}`                           | Counts a click for a visible partner (with the referrer), then 302s to the partner's URL with `from` set to this site. Unknown or hidden partners 404. |
| `/conta/entrar/{provider}` and `…/callback` | Social login. See [entrar.md](pages/conta/entrar.md).                                                                                                  |
| `/conta/registar/verificar/{email}/{token}` | Email verification link. See [verificar-email.md](pages/conta/verificar-email.md).                                                                     |

## JSON endpoints

| Route                                    | Used by                                    | Notes                                         |
| ---------------------------------------- | ------------------------------------------ | --------------------------------------------- |
| `GET /api/feed?tipos=&cursor=`           | Home feed infinite scroll                  | Same `getFeedPage` as the home page load.     |
| `GET /api/jogos/dia?date=`               | `/jogos` live polling (every 5 s on today) | `no-store`. An invalid date means today.      |
| `GET /api/jogos/dias?from=&to=`          | Games date rail and month picker dots      | Max 62 days; `from` must be ≤ `to`, else 400. |
| `GET /api/jogos/live`                    | Tab bar live pulse (every 30 s)            | `no-store`. Returns `{ live: boolean }`.      |
| `GET /api/transferencias/dias?from=&to=` | Transfers date rail dots                   | Same limits as `/api/jogos/dias`.             |

## Pitfalls

- **New API routes shadow the legacy catch-all.** Adding any `src/routes/api/…` route takes that path away from Laravel. Check that nothing (old mobile apps, widgets, cron jobs) still calls the Laravel endpoint with the same path.
- The `/api/*` and `/storage/*` shims cost an extra round trip per request. The current `nginx.conf` sends everything to the Node app, so every `/storage/…` URL still printed in old article HTML goes through this redirect.
- `/arbitros/…` is mapped to the Competições tab in `navigation.svelte.ts` and linked from game pages, but there is **no route for it yet**, so those links 404.
