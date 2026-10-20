# Clube (club)

- **Route:** `/clubes/{slug}` (optional `?equipa={teamId}`)
- **Tab:** Competições
- **Files:** `src/routes/clubes/[club=slug]/`, `src/lib/server/club-page.ts`, `src/lib/clubs.ts`

A club's page: its teams (senior, B team, youth…), each team's staff and players, and the club's recent transfers. Ports `ClubController@show`. Reached from club emblems and names on game pages.

## What's on the page

- A cover picture (the club's venue) with the emblem and name.
- **Equipas**: a team picker, then the selected team's staff (links to [técnico](tecnico.md) pages) and a grid of players (links to [jogador](jogador.md) pages).
  - 1 team: no picker.
  - 2–3 teams: a SegmentedControl.
  - 4 or more: a horizontally scrolling chip row.
- **Transferências** (side column on desktop): recent moves in and out, with a green ← for arrivals and a red → for departures.
- Admin links to the admin app: edit club (`clubs.edit.{clubId}`), edit team (`teams.edit.{teamId}`).

## How it works

- The club is found by comparing `slugify(name)` with the slug. If the URL's slug isn't the canonical one, it redirects (301), keeping the query.
- The selected team is in `?equipa=`. An unknown or missing id falls back to the first team. Switching teams uses `goto(..., { replace: true })`.
- Transfers: every transfer **into** one of the club's teams, plus each of those players' **next** transfer (the move out). Deduplicated, newest first, max 18.

## Edge cases and pitfalls

- **The slug lookup loads every club** and slugifies each name in JS (the legacy `findByNameSlug`). Fine at today's size, but it's a full table read on every club page view.
- When two clubs share a slug, the one with the lowest id wins. If that one is hidden, the page 404s **even if a later club with the same slug is visible**.
- Only visible teams and visible players are listed. Transfers of hidden players are skipped.
- Under-18 players have no photo unless the user has the `players` permission.
- The transfer list fixes a legacy bug where only the last team's transfers were kept.
- A team with no staff or no players shows a short message instead of an empty card.
- **Renaming a club breaks its old links.** The club is found by an exact `slugify(name)` match, so the canonical-slug redirect in the load function can't actually fire, and the old slug simply finds nothing (404). Unlike players and staff, clubs have no id in the URL to fall back on.
