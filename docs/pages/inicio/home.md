# Início (home feed)

- **Route:** `/`
- **Tab:** Início (tab root, no back button)
- **Files:** `src/routes/+page.server.ts`, `src/routes/+page.svelte`, `src/lib/components/feed/HomeFeed.svelte`, `src/lib/server/feed/`

A social-media style feed that mixes news articles, polls and transfer days, newest first. It replaces the legacy home page and the `/noticias` index.

## What's on the page

- Brand title (logo + wordmark). Below 360 px the title shrinks to `title-1` so it stays on one line.
- A chip row to pick which content types to show: Artigos, Sondagens, Transferências. The chips come from `feedTypes` in `src/lib/components/feed/registry.ts`.
- The feed itself: `ArticleCard`, `PollCard` and `TransferDayCard`, 12 per page, with infinite scroll.
- Inserts between cards: an AdSense unit (first item, then every 10th from the 10th), a partner card after every 3rd item, and the "new site" disclaimer card.
- Pull down at the top to refresh. The shell's `PullToRefresh` runs `refreshAll()`, and Home shows skeleton cards while `pullRefresh.refreshing` is true.

## How it works

- The selected types live in `?tipos=` (Portuguese values: `artigos,sondagens,transferencias`). Changing a chip does a `goto(..., { replace: true })` wrapped in `withNavigationLoader`, so the global loader shows even though only the query changes.
- The server merges the selected sources (`getFeedPage`), sorts by date, then type, then id, and returns a cursor `date|type|id` for the next page. Later pages come from `GET /api/feed?tipos=…&cursor=…`.
- Articles and transfer days come from an in-process stale-while-revalidate cache (`swrCache` in `src/lib/server/cache.ts`): fresh for 60 s, then served stale for up to 5 more minutes while one background load replaces them. Articles are keyed by cursor, transfers by locale and the cursor's day. Without it the transfer query costs about 0.5 s per request.
- Polls are never cached: their state depends on the visitor's vote cookie and the clock.
- Poll cards decide between open / pending / results using the legacy `poll{id}` cookie (see [sondagem.md](sondagem.md)).
- Transfers show as **one card per day**, never one per transfer. Only real moves count (see [transferencias.md](../competicoes/transferencias.md)).

## Edge cases and pitfalls

- **At least one chip is always selected.** The ChipGroup refuses to deselect the last chip (it shakes). On the server, a missing, empty or fully invalid `?tipos=` falls back to _all_ types, and unknown tokens are ignored.
- The feed is wrapped in `{#key feedKey}`, where the key combines the types, cursor, first item and item count. That resets the infinite-scroll state after a chip change or a refresh. If you add state to `HomeFeed`, remember it gets thrown away on every key change.
- Paging uses a keyset cursor, not an offset. Two items with the same date are ordered by type name and then id, so a new content type needs to be part of `compareFeedKeys` or pages can skip or repeat items.
- The disclaimer card only shows when `NEW_SITE_DISCLAIMER_ENABLED` is on **and** a legacy origin (`LEGACY_BASE_URL` or `MEDIA_BASE_URL`) is set. It sits after the first item, or at the end when the feed has a single item. `FEEDBACK_FORM_URL` adds a feedback link to it.
- Pull-to-refresh ignores sideways swipes, so the transfer carousel can be swiped without triggering a refresh.
- **Admin changes show up late.** A new, edited or hidden article or transfer can take a minute (longer after a quiet spell) to appear on the feed, and pull-to-refresh doesn't skip the cache. This also applies when you change the local database to test something: wait a minute or restart the dev server. The cache lives in one Node process (prod runs a single PM2 instance); with more instances, each keeps its own copy.
- Cached items are shared between requests, so nothing may mutate them, and they must never hold visitor-specific data (like poll state or edit links).
- **Adding a new content type:** add a source in `src/lib/server/feed/sources/`, a branch in `getFeedPage`, a card component, a `feedTypes` entry, and the `?tipos=` value in `src/lib/feed.ts`. The chip appears on its own.
