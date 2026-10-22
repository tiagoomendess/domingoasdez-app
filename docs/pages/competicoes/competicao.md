# Competição (competition season)

- **Route:** `/competicoes/{season}/{competition}` (optional `?vista=classificacao|estatisticas`, `?jornada=`)
- **Tab:** Competições
- **Files:** `src/routes/competicoes/[season=season]/[competition=slug]/`, `src/lib/server/competition-page.ts`, `src/lib/server/competition-stats.ts`, `src/lib/standings.ts`, `src/lib/components/competitions/`

One season of one competition, with three views: games by round, standings, and statistics. Ports `CompetitionsController@show` and `CompetitionStatsController`.

Example: `/competicoes/2025-26/campeonato-distrital`.

## What's on the page

- Header: emblem, name, and a season switcher (‹ season › buttons, and a tap on the label opens a SeasonSheet with every season).
- A SegmentedControl: **Jogos · Classificação · Estatísticas**.
- **Jogos**: for each group, a RoundNavigator and that round's games (MatchRow with dates).
- **Swipe between rounds** (Jogos and Classificação): swipe left for the next round, right for the previous one. The ‹ › buttons stay and slide the content the same way.
- **Classificação**: for each group, the table up to the selected round, with promotion/relegation zones and a legend.
- **Estatísticas**: top scorers, best/worst attack and defence.
- The season's `obs` note at the bottom.

## How it works

- The view is in `?vista=`. Jogos is the default and has no query. Switching uses `goto(..., { replace: true })`, so it doesn't add history entries. Season links keep the current view.
- Each group opens on its **default round**: the highest round with at least one finished game, or the first round.
- **The selected rounds are kept in `?jornada=`**, so going into a game and back (or reloading, or sharing the link) shows the same rounds. One value per group the user moved off its default, in group order: a bare round when the season has one group (`?jornada=5`), otherwise `{group slug}.{round}` (`?jornada=serie-a.24&jornada=serie-b.23`). Moving a group back to its default drops its value, so an untouched page keeps its clean URL. The helpers are `parseRoundParams` / `roundParams` in `src/lib/competitions.ts`.
- Each group's round card is a `RoundSwipe` (`src/lib/components/competitions/RoundSwipe.svelte`), which renders the RoundNavigator and wraps the games or the table.
  - A touch is a swipe only after 10 px of mostly sideways travel. Anything less is a tap, so a game row still opens, and the click at the end of a swipe is swallowed so it never opens the game under the finger.
  - It changes round past 30% of the card's width, or on a quick flick. Otherwise it springs back. At the first or last round it rubber-bands and returns. Under reduced motion the change is a short cross-fade.
  - The round changes through the same `shiftRound`, so `?jornada=` and the no-refetch rule are unchanged.
- Changing round rewrites the URL with `goto(..., { replace: true, reset: false })`. No load reads `jornada`, so nothing is refetched and no history entry is added. Both views share the selection, and switching view keeps the param. Season links drop it, since another season has other groups.
- Standings are built on the client from `standingsGroup` for the selected round, using the group's tie-breaker (AFPB 2018 or plain points). Zones come from `group_rules_positions` when set, otherwise the legacy promotes/relegates counts.
- The emblem is the season's picture, falling back to the competition's (legacy `Season::getDisplayPicture`). It's also the `og:image`, so a shared link previews the competition logo. Without it, Facebook picks a random club emblem from the table or games. A season and competition with no picture have no `og:image`.

### URL canonicalisation

The page redirects (301) to the canonical URL when:

- the season uses the legacy long form (`2025-2026` → `2025-26`);
- the competition slug doesn't match `slugify(season name or competition name)`;
- the season slug isn't the canonical short form.

The query string is kept on these redirects.

## Edge cases and pitfalls

- **Swipes and the standings table.** A touch that starts inside something that really scrolls sideways (the standings table when it's wider than the card) is left to it. On phones where the table fits, swiping on it changes round.
- **Don't change the DOM before a touch has become a swipe** (no `$state` flags, no `will-change` on touchstart). iOS Safari drops a scroll that has already started if a layer around it changes mid-touch. The same rule as PullToRefresh.
- A swipe right that starts at the very left edge of the screen is iOS Safari's own back gesture, and the page can't stop it.
- **Classificação only appears when a group uses points rules.** A cup-only season shows just Jogos and Estatísticas, and a `?vista=classificacao` link silently shows the standings view's "no standings" text for non-points groups.
- The group heading is hidden when there's a single group with the same name as the competition.
- `getSeasonGroups` loads every game of the season **without** a `games.visible` filter, matching the legacy page. Hidden games still count here.
- When the season changes (new `seasonId`), the selected rounds are re-seeded from the defaults and `?jornada=`. Within the same season they're kept, so switching views or a pull-to-refresh doesn't reset the round.
- `?jornada=` values for unknown groups or rounds are ignored (the group falls back to its default). Groups are matched by `nameSlug`, so renaming a group breaks its round in old links, and two groups with the same slug would share one value (the first wins).
- The rounds are read from `page.url` when the page mounts, not in the server load, which is what keeps round changes from refetching. Don't move the parsing into `+page.server.ts`.
- **The competition slug depends on the season's display name.** The lookup first matches `slugify(season name or competition name)`, then falls back to `slugify(competition name)`. So a link with the plain competition name still works and redirects to the season's own name. But renaming a season from one custom name to another breaks the old links (404), because the old slug matches neither.
- Only visible seasons of visible competitions are found. Hiding a season 404s its page.
- Old URLs:
  - `/competicoes/{season}/{competition}/estatisticas` → 301 to `?vista=estatisticas`.
  - Competition-first game URLs (`/competicoes/{competition}/{season}/…`) → 301 to season-first. See [jogo.md](jogo.md).
