# Página (CMS page)

- **Route:** `/p/{slug}`
- **Tab:** Páginas
- **Files:** `src/routes/p/[slug]/`, `src/lib/server/pages.ts`

Renders one CMS page created in the backoffice: an optional picture, the title and the HTML body.

## What's on the page

- The page picture (16:9), when set.
- The title.
- A horizontal ad, the body as HTML in `prose rich-text`, and an ad at the end.

## How it works

- Looked up by its stored `slug` (not computed from the title), visible pages only.
- The meta description is the first 160 characters of the body with HTML stripped.

## Edge cases and pitfalls

- **Cached for 5 minutes.** Each page comes from an in-process cache keyed by slug (`swrCache` in `src/lib/server/cache.ts`): fresh for 5 min, then served stale for up to 5 more while it reloads. Edits in the admin can take that long to show, and a slug that 404s keeps 404ing for that long after the page is created.
- **Hidden pages return 404.** That's stricter than the legacy site, which still served them by URL.
- The list shows the page's `name`, but this page's heading and `<title>` use its `title`. They're separate fields in the backoffice and can differ.
- The body is trusted backoffice HTML rendered with `{@html}` after `prepareCmsHtml`.
- The `[slug]` param has no matcher, so any string reaches the database lookup and 404s when nothing matches.
