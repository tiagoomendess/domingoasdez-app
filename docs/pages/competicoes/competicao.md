# Competição (competition season)

- **Route:** `/competicoes/{season}/{competition}` (optional `?vista=classificacao|estatisticas`)
- **Tab:** Competições
- **Files:** `src/routes/competicoes/[season=season]/[competition=slug]/`, `src/lib/server/competition-page.ts`, `src/lib/server/competition-stats.ts`, `src/lib/standings.ts`, `src/lib/components/competitions/`

One season of one competition, with three views: games by round, standings, and statistics. Ports `CompetitionsController@show` and `CompetitionStatsController`.

Example: `/competicoes/2025-26/campeonato-distrital`.

## What's on the page

- Header: emblem, name, and a season switcher (‹ season › buttons, and a tap on the label opens a SeasonSheet with every season).
- A SegmentedControl: **Jogos · Classificação · Estatísticas**.
- **Jogos**: for each group, a RoundNavigator and that round's games (MatchRow with dates).
- **Classificação**: for each group, the table up to the selected round, with promotion/relegation zones and a legend.
- **Estatísticas**: top scorers, best/worst attack and defence.
- A live banner ("results aren't updated automatically, see Jogos") while games are live, and the season's `obs` note at the bottom.

## How it works

- The view is in `?vista=`. Jogos is the default and has no query. Switching uses `goto(..., { replace: true })`, so it doesn't add history entries. Season links keep the current view.
- Each group opens on its **default round**: the highest round with at least one finished game, or the first round. The round is local state, not in the URL.
- Standings are built on the client from `standingsGroup` for the selected round, using the group's tie-breaker (AFPB 2018 or plain points). Zones come from `group_rules_positions` when set, otherwise the legacy promotes/relegates counts.
- The emblem is the season's picture, falling back to the competition's (legacy `Season::getDisplayPicture`). It's also the `og:image`, so a shared link previews the competition logo. Without it, Facebook picks a random club emblem from the table or games. A season and competition with no picture have no `og:image`.

### URL canonicalisation

The page redirects (301) to the canonical URL when:

- the season uses the legacy long form (`2025-2026` → `2025-26`);
- the competition slug doesn't match `slugify(season name or competition name)`;
- the season slug isn't the canonical short form.

The query string is kept on these redirects.

## Edge cases and pitfalls

- **Classificação only appears when a group uses points rules.** A cup-only season shows just Jogos and Estatísticas, and a `?vista=classificacao` link silently shows the standings view's "no standings" text for non-points groups.
- The group heading is hidden when there's a single group with the same name as the competition.
- **The live banner is global.** `hasLiveGames` is true when _any_ visible game today is live, not just one in this competition.
- `getSeasonGroups` loads every game of the season **without** a `games.visible` filter, matching the legacy page. Hidden games still count here.
- When the season changes (new `seasonId`), the selected rounds are re-seeded. Within the same season they're kept, so navigating views doesn't reset the round.
- **The competition slug depends on the season's display name.** The lookup first matches `slugify(season name or competition name)`, then falls back to `slugify(competition name)`. So a link with the plain competition name still works and redirects to the season's own name. But renaming a season from one custom name to another breaks the old links (404), because the old slug matches neither.
- Only visible seasons of visible competitions are found. Hiding a season 404s its page.
- Old URLs:
  - `/competicoes/{season}/{competition}/estatisticas` → 301 to `?vista=estatisticas`.
  - Competition-first game URLs (`/competicoes/{competition}/{season}/…`) → 301 to season-first. See [jogo.md](jogo.md).
