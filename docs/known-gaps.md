# Known gaps

Things the legacy site had, or that `docs/DESIGN_SYSTEM.md` asks for, that this app doesn't do yet. They were left over when the migration plan was retired (October 2026). Remove an item when it's built, or when you decide it won't be.

Each item's page doc has more detail where relevant.

## Legacy features not ported

| Legacy route                                                    | What it did                                             | Now                                                         |
| --------------------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------- |
| `/arbitros/{id}/{slug}`                                         | Referee page                                            | No route. Game pages link here, so those links 404.         |
| `/password/reset`, `/password/email` (Laravel `Auth::routes()`) | Forgot password                                         | No way to reset a password.                                 |
| `/utilizador/perfil/download`                                   | Download my data (RGPD)                                 | Missing.                                                    |
| `/perfil/apagar` (+ `/verificar`, `/cancelar`)                  | Delete account, with the request / verify / cancel flow | Missing.                                                    |
| `POST /rgpd`                                                    | Save RGPD settings                                      | `/rgpd` is a static page with no settings.                  |
| `/scores`                                                       | Scores aggregator                                       | Missing.                                                    |
| `POST /game/{game}/generate_image`                              | Match image generator                                   | Missing. Check whether it belongs in the admin app instead. |

Admin-only legacy pages on the public site (`/hoje/edit`, `/jogos/{game}/resultados-enviados`, marking score reports as fake) are now the admin app's job, and public pages link there.

## Legacy URLs with no redirect

These old URLs 404 here. Old emails, bookmarks and search results may still use them.

- `/login`, `/register`, `/logout` → `/conta/entrar`, `/conta/registar`, a logout.
- `/login/{provider}` and its callback → `/conta/entrar/{provider}`.
- `/register/verify/{email}` and `/register/verify/{email}/{token}` → `/conta/registar/verificar/…`. Emails sent by Laravel before the switch use the old shape.
- `/info` → `/conta/informacao`.
- `/perfil/editar` → `/conta/perfil`.
- `/competicoes/{slug}` (competition with no season) → the latest season. Laravel also special-cased `/competicoes/1a-divisao-afpb` → `1a-divisao-agribar`.
- `/competicoes/{competition}/{season}/estatisticas` (the competition-first form) → the competition page with `?vista=estatisticas`. Only the season-first form and competition-first **game** URLs redirect today.

`/antigo/{path}` still opens any of these on the legacy site while it's running.

## Design system items not built

- **Logout confirmation**: "Terminar sessão" logs out straight away instead of opening a confirmation sheet.
- **Transferências row** at the bottom of the Competições root. `/transferencias` is only reachable from home-feed transfer cards.
- **Notifications** under Conta → Preferências.
- **Facebook and Apple login**: the flags exist, but only Google is implemented. Keep `FACEBOOK_LOGIN_ENABLED` and `APPLE_LOGIN_ENABLED` off.
- **Compact tab bar while scrolling** (marked "optional, later" in the design system).

## Smaller loose ends

- `/clubes` and `/jogadores` exist but nothing in the app links to them.
- `/transferencias` gets an admin `editHref` for users with `transfers.edit` from the server, but the page doesn't show it.
- No "resend verification email" on `/conta/registar/verificar/{email}`.
- The legal pages (privacy, terms, RGPD) are Portuguese only, and their text is hard-coded in `src/lib/content/legal.ts`.
- The error page shows the same copy for every 404; the specific messages from load functions aren't displayed.
- **Comment moderation:** the admin app has no page for article or match comments. Only the author or a user with `admin` can delete one, from the public page.
- **Account deletion and comments:** the Laravel `ProcessDeleteRequest` job wipes `article_comments` content but not `match_comments`, and leaves the votes (`match_comment_votes`, `article_comment_votes`) in place. The app hides match comments by anonymised accounts in the meantime; fix it when the background jobs move off Laravel.
- **Predictions have no points or leaderboard.** Each game shows a verdict, but nothing adds them up per user yet.
- **Two-legged ties aren't modelled.** Their legs are judged one game at a time, so a level first leg has "no winner" for predictions.
- `/demo` and `/demo/playwright` are scaffold leftovers, and the Playwright test there is the only e2e test.
