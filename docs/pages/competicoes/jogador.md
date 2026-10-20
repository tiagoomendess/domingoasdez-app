# Jogador (player)

- **Route:** `/jogadores/{id}/{slug}`
- **Tab:** Competições
- **Files:** `src/routes/jogadores/[id=id]/[slug]/`, `src/lib/server/player-page.ts`, `src/lib/players.ts`

A player's profile: photo, nickname, position, a few numbers, current club and transfer history. Ports `PlayersController@show`. Reached from club pages, transfers and game pages.

## What's on the page

- Photo (128), name, nickname and position pill.
- Three stats: age, goals, man-of-the-match votes.
- **Clube atual**: the club and team, or "Sem clube".
- **Histórico**: transfers, newest first, with the club emblem and month/year.
- For guests with more than 2 transfers: "+N transferências" and a login button.
- An admin "Editar" link for `players.edit`.

## How it works

- The player is found by id. The slug is only cosmetic: a wrong slug redirects (301) to `slugify(name)`, keeping the query.
- Age comes from the birth date. Without one, it shows "Desconhecida".

## Edge cases and pitfalls

- **Under-18 players have no photo** unless the user has the `players` permission. That also applies to `og:image`, so a minor's photo never ends up in a link preview.
- A player without a birth date counts as a minor for the photo rule (`isAdult` needs a known age of 18+).
- **Guests see only the 2 latest transfers.** The rest is hidden behind a login prompt, matching the legacy site.
- History rows link to the club page, except for users with `transfers.edit`: their rows link to the transfer in the admin app **instead**, so editors can't tap through to the club from here.
- Only visible transfers are listed.
- Hidden players (`visible = false`) return 404.
- Goals and MVP votes are counted live on every view, not cached.
