# Campo (ground)

- **Route:** `/campos/{id}/{slug}`
- **Tab:** Competições
- **Files:** `src/routes/campos/[id=id]/[slug]/`, `src/lib/server/playground-page.ts`, `src/lib/playgrounds.ts`, `src/lib/components/venue/VenueMap.svelte`

The page of a ground (`playgrounds` table): what it is, where it is, its next game and the games played there. New in this app; the legacy site had no public page for grounds. Reached from the "Ver campo" button in a game page's directions sheet (the venue pill on the cover).

## What's on the page

- A 16:9 cover (the ground's picture, or a placeholder), the name, the owning club (link) and the surface.
- **A decorrer / Próximo jogo**: a game in its live window at this ground ("A decorrer", with the live dot), else the next scheduled one. Captioned with the competition and round. "Sem jogos marcados neste campo." when there's none.
- **Ficha**: surface, dimensions (`length × width m`), capacity and club. Each row only when it has a value; the group is hidden when none has. `obs` shows as text below it when filled.
- **Localização**: an OpenStreetMap embed with a marker, then the Google Maps and Waze buttons (the same `DirectionsButtons` as the sheet). Without coordinates, the "localização desconhecida" text.
- **Em números**: games played, goals per game and the month of the first game on record, then the home wins / draws / away wins bar (`ResultSplit`, shared with the head to head).
- **Jogos disputados**: finished games here, newest first, with an "Época 2025/26" header at each season change and the competition and round under each row (`PagedMatches`, shared with the head to head).
  - Signed-in users see 10, then "Ver mais" fetches 10 more from `GET /api/campos/{id}/jogos?offset=` and appends them, without a navigation.
  - Guests see 2 and an "Entra para ver todos" card with the number of games left, like the head to head.
- An "Editar campo" link to the admin app (`/playgrounds/{id}`) for users with the `playgrounds` permission.

One column at every width, in that order: the app's 640 px reading width leaves no room for a useful side column with the map and the numbers.

## How it works

- Found by id. A wrong slug redirects (301) to the canonical one, unless the name slugifies to an empty string. A hidden or unknown ground is a 404.
- `location` is a MySQL `POINT(lat lon)`, read with `ST_AsText` and `parsePointLatLon` (latitude first, as the legacy site stores it).
- Dimensions: `height` is the length and `width` the width, as the admin's playground form labels them.
- The games list and the stats count the same games: visible, finished, at this ground. Pages are ordered by date then id, so they never overlap.
- The next game is the earliest visible, unfinished, non-postponed game from 3 hours ago on; one inside its live window (`gameStatus`) wins over a later one.
- Scores come from `goals_home`/`goals_away`, or from the goal rows when those are null (about half of the finished games), in both the list and the stats.
- The game rows come from `selectGameRows` / `toMatch` in `src/lib/server/game-rows.ts`, shared with the game page.

## Edge cases and pitfalls

- **The map is a third-party frame.** `openstreetmap.org` loads only when the map nears the viewport (`loading="lazy"`), with no referrer. Its tiles are light only, so dark mode inverts them with a CSS filter.
- Past games never marked `finished` (old data has a few hundred) are left out of the list and the numbers, as in the head to head.
- The `/api/campos/{id}/jogos` endpoint answers 401 to guests, so the login wall can't be skipped by calling it directly.
- A hidden owning club isn't shown, since its page would 404.
- `surface` is free text in the database ("Pelado", "Relva Artificial", plus a few one-offs) and is shown as stored, untranslated.
- The pages loaded with "Ver mais" are keyed by the ground id, so they reset when you open another ground.
