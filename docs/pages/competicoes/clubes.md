# Clubes (club index)

- **Route:** `/clubes` (optional `?page=N`)
- **Tab:** Competições
- **Files:** `src/routes/clubes/+page.server.ts`, `src/routes/clubes/+page.svelte`

A plain paginated list of every visible club, 25 per page, newest first. Mostly there so the legacy `/clubes` URL keeps working and search engines can reach every club.

## What's on the page

- "Clubes" title, a list of emblem + name rows linking to each [club](clube.md), previous/next buttons with "page X of Y", and an ad.

## Edge cases and pitfalls

- **Nothing in the app links here.** It's only reachable by URL. Clubs are normally found through competitions and games.
- Ordered by id, newest first, not alphabetically. There's no search.
- `?page=` below 1 or not a number becomes 1. A page past the end is clamped to the last page (no 404).
- The query runs straight from the route file with Drizzle, not through a `src/lib/server` helper like most pages.
