# Jogadores (player index)

- **Route:** `/jogadores` (optional `?page=N`)
- **Tab:** Competições
- **Files:** `src/routes/jogadores/+page.server.ts`, `src/routes/jogadores/+page.svelte`

A plain paginated list of every visible player, 25 per page, newest first. Like [clubes.md](clubes.md), it keeps the legacy URL alive and gives crawlers a path to every player.

## What's on the page

- "Jogadores" title, a list of avatar + name rows linking to each [player](jogador.md), previous/next buttons, and an ad.

## Edge cases and pitfalls

- **Nothing in the app links here.** Players are normally reached from club and game pages.
- Names use the nickname when there is one (`playerDisplayName`).
- Under-18 players have no photo unless the user has the `players` permission. Because of that, this page reads the user's permissions on every load.
- Paging is clamped the same way as `/clubes`: invalid → 1, too high → last page.
- Queries live in the route file, not in a `src/lib/server` helper.
