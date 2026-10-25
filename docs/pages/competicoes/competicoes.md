# Competições (competition list)

- **Route:** `/competicoes`
- **Tab:** Competições (tab root)
- **Files:** `src/routes/competicoes/+page.server.ts`, `src/routes/competicoes/+page.svelte`, `src/lib/server/competitions.ts`

The list of competitions, replacing the legacy dropdown menu. Each row opens the competition's latest season.

## What's on the page

- "Competições" title and a horizontal ad.
- One ListGroup: emblem, competition name, current season as subtitle, chevron.
- From 768 px the rows become a 2-column grid of single-row cards.
- An empty state when there are no visible competitions.

## How it works

- Only visible competitions, sorted by `priority` (highest first), then id.
- For each one, the **latest visible season** (by start year, then id) gives the display name, emblem, season label and link. A season's own `name` overrides the competition name when set.

## Edge cases and pitfalls

- **Cached for 5 minutes.** The list comes from an in-process cache (`swrCache` in `src/lib/server/cache.ts`): fresh for 5 min, then served stale for up to 5 more while it reloads. A new competition or season can take that long to appear.
- A visible competition with **no visible season** still shows, but with no subtitle and no link. The row isn't tappable.
- The name shown is the season's name when it has one, so a competition can appear under a different name from one season to the next. Its URL slug changes with it (see [competicao.md](competicao.md)).
- The mobile list and the desktop grid are two separate blocks toggled with `md:hidden` / `hidden md:grid`. Both are in the DOM, so a change to one row needs to work in both (they share the `competitionRow` snippet).
- [`DESIGN_SYSTEM.md`](../../DESIGN_SYSTEM.md) mentions a Transferências row at the bottom of this page. It isn't there yet: `/transferencias` is currently only reachable from the transfer cards in the home feed.
