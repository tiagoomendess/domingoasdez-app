# Domingo às Dez — page docs

One file per page of the app: what the page does, how it works at a high level, and the edge cases and pitfalls worth knowing before you change it. They don't cover every line of logic; the code and its comments are the source of truth for that.

For the project rules (scope, database, media, product rules) see [`PROJECT.md`](PROJECT.md), for the visual language see [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md), and for what isn't built yet see [`known-gaps.md`](known-gaps.md).

## Pages

Grouped by the bottom tab that owns them (`tabFromPath` in `src/lib/navigation.svelte.ts`).

### Início

| Page                                 | Route                          |
| ------------------------------------ | ------------------------------ |
| [Home feed](pages/inicio/home.md)    | `/`                            |
| [Notícia](pages/inicio/noticia.md)   | `/noticias/{y}/{m}/{d}/{slug}` |
| [Sondagem](pages/inicio/sondagem.md) | `/sondagens/{slug}`            |

### Jogos

| Page                                                                           | Route                                          |
| ------------------------------------------------------------------------------ | ---------------------------------------------- |
| [Jogos](pages/jogos/jogos.md)                                                  | `/jogos`                                       |
| [Enviar resultado](pages/jogos/score-report.md)                                | `/score-reports/{gameId}`                      |
| [Flash interview](pages/jogos/flash-interview.md)                              | `/flash-interview/{uuid}`                      |
| [Flash interview — PIN](pages/jogos/flash-interview-pin.md)                    | `/flash-interview/{uuid}/pin`                  |
| [Flash interview — notifications](pages/jogos/flash-interview-notificacoes.md) | `/flash-interview/{uuid}/manage-notifications` |

### Competições

| Page                                                   | Route                                                                  |
| ------------------------------------------------------ | ---------------------------------------------------------------------- |
| [Competições](pages/competicoes/competicoes.md)        | `/competicoes`                                                         |
| [Competição](pages/competicoes/competicao.md)          | `/competicoes/{season}/{competition}`                                  |
| [Jogo](pages/competicoes/jogo.md)                      | `/competicoes/{season}/{competition}/{group}/{round}/{home}-vs-{away}` |
| [Clubes](pages/competicoes/clubes.md)                  | `/clubes`                                                              |
| [Clube](pages/competicoes/clube.md)                    | `/clubes/{slug}`                                                       |
| [Placard do clube](pages/competicoes/clube-placard.md) | `/clubes/{slug}/placard`                                               |
| [Jogadores](pages/competicoes/jogadores.md)            | `/jogadores`                                                           |
| [Jogador](pages/competicoes/jogador.md)                | `/jogadores/{id}/{slug}`                                               |
| [Técnico](pages/competicoes/tecnico.md)                | `/tecnicos/{id}/{slug}`                                                |
| [Campo](pages/competicoes/campo.md)                    | `/campos/{id}/{slug}`                                                  |
| [Transferências](pages/competicoes/transferencias.md)  | `/transferencias`                                                      |

### Páginas

| Page                                                                | Route                      |
| ------------------------------------------------------------------- | -------------------------- |
| [Páginas](pages/paginas/paginas.md)                                 | `/p`                       |
| [Página (CMS)](pages/paginas/pagina.md)                             | `/p/{slug}`                |
| [Enviar informação](pages/paginas/enviar-informacao.md)             | `/conta/informacao`        |
| [Política de privacidade](pages/paginas/politica-de-privacidade.md) | `/politica-de-privacidade` |
| [Termos e condições](pages/paginas/termos-e-condicoes.md)           | `/termos-e-condicoes`      |
| [RGPD](pages/paginas/rgpd.md)                                       | `/rgpd`                    |

### Conta

| Page                                                   | Route                                         |
| ------------------------------------------------------ | --------------------------------------------- |
| [Conta](pages/conta/conta.md)                          | `/conta`                                      |
| [Entrar](pages/conta/entrar.md)                        | `/conta/entrar`                               |
| [Registar](pages/conta/registar.md)                    | `/conta/registar`                             |
| [Verificar email](pages/conta/verificar-email.md)      | `/conta/registar/verificar/{email}`           |
| [Perfil](pages/conta/perfil.md)                        | `/conta/perfil`                               |
| [Alterar palavra-passe](pages/conta/palavra-passe.md)  | `/conta/palavra-passe`                        |
| [Placard (TV)](pages/conta/placard.md)                 | `/placard`                                    |
| [Ligar um ecrã](pages/conta/placard-ligar.md)          | `/placard/ligar`, `/placard/ligar/{code}`     |
| [Controlar o placard](pages/conta/placard-controlo.md) | `/placard/controlo`, `/placard/controlo/{id}` |

### Other

| Page                                                 | Route                       |
| ---------------------------------------------------- | --------------------------- |
| [Error page](pages/outras/erro.md)                   | any failing URL             |
| [Previsões (leaderboard)](pages/outras/previsoes.md) | `/previsoes` (hidden)       |
| [Design (style guide)](pages/outras/design.md)       | `/design`                   |
| [Demo pages](pages/outras/demo.md)                   | `/demo`, `/demo/playwright` |

Redirects, JSON endpoints and legacy hand-offs are in [routes-without-pages.md](routes-without-pages.md).

## Things every page shares

These apply across the app, so the page docs don't repeat them.

- **App shell.** `src/routes/+layout.svelte` wraps every page (except `/design` and the stadium screen `/placard`) in `AppShell`: the floating back and theme buttons, the bottom tab bar, the navigation loader, the toast region and pull-to-refresh (`refreshAll()`, so it reruns the page's loads). The root layout load (`+layout.server.ts`) provides the user, preferences, the "is anything live" flag and a one-off toast.
- **Active tab.** The tab the user last tapped stays active as they go deeper. On a fresh load it comes from the URL (`PATH_OWNERS` in `navigation.svelte.ts`, longest prefix wins). The back button falls back to that tab's root when there's no in-app history.
- **Flash toasts.** Some pages redirect after a POST and want to show a toast on the next page (score reports, flash interviews). They set a short-lived cookie, and the root layout load reads it once and clears it.
- **Auth.** `hooks.server.ts` reads the signed `dad_session` cookie into `locals.user` on every request. Pages that need a user redirect to `/conta/entrar?redirectTo=<path>`.
- **Permissions.** Admin links on public pages (edit game, edit club, update scores…) are only built when the user has the matching legacy permission, and they point at the new admin app (`ADMIN_BASE_URL`), not the legacy backoffice.
- **No photos of minors.** Player photos are hidden for anyone under 18, or with no birth date, unless the viewer has the `players` permission. This applies to lists, pages, pickers and `og:image`.
- **Guests get reCAPTCHA.** Polls, score reports, info reports and registration ask guests for reCAPTCHA v2 when keys are configured; logged-in users skip it. The widget is remounted after each submit because tokens are single-use.
- **Canonical URLs.** Pages with slugs 301 to the canonical slug. Slugs are computed from names (`slugify`), not stored, so renaming something in the backoffice can break old links. Each page's doc says how.
- **Time zone.** Days and kick-off times are always `Europe/Lisbon`, whatever the visitor's time zone.
- **Media.** The database stores paths like `/storage/images/x.png`. The server turns them into absolute URLs on the legacy site (`MEDIA_BASE_URL`, or the CDN when enabled).
- **Ads.** AdSense units are off site-wide with `ADSENSE_ENABLED=false`, and per user with the `disable_ads` permission.
- **Translations.** Every string is a Paraglide message (`messages/pt-PT.json`, `en.json`, `fr.json`). The locale comes from a cookie, then the browser language, then pt-PT.

## Adding a page doc

When you add a route, add a file under `docs/pages/<tab>/`, link it in the table above, and follow the same shape:

1. A header with the route, the owning tab and the main files.
2. One or two sentences on what the page is for.
3. **What's on the page**: the sections a user sees.
4. **How it works**: only the parts that aren't obvious from the markup.
5. **Edge cases and pitfalls**: what could surprise the next person to touch it.
