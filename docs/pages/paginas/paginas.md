# Páginas (page list)

- **Route:** `/p`
- **Tab:** Páginas (tab root)
- **Files:** `src/routes/p/+page.server.ts`, `src/routes/p/+page.svelte`, `src/lib/server/pages.ts`

The list of CMS pages (the small "pages" CMS managed in the backoffice), plus a few fixed links.

## What's on the page

- "Páginas" title.
- One ListGroup with every visible CMS page, linking to [`/p/{slug}`](pagina.md). From 768 px it becomes a 2-column grid.
- **Informação** group:
  - "Enviar informação" → [`/conta/informacao`](enviar-informacao.md).
  - "Site antigo" → the legacy site's home page.
- **Legal** group: [Política de privacidade](politica-de-privacidade.md), [Termos e condições](termos-e-condicoes.md), [RGPD](rgpd.md).
- An ad at the bottom.

## Edge cases and pitfalls

- **Cached for 5 minutes.** The list comes from an in-process cache (`swrCache` in `src/lib/server/cache.ts`): fresh for 5 min, then served stale for up to 5 more while it reloads. A new or hidden page can take that long to show.
- CMS pages are sorted by id, like the legacy home page, not by name. There's no manual ordering field.
- With no visible pages, the empty state shows, but the Informação and Legal groups still render below it.
- The "Site antigo" link uses `legacyUrl('/')`. If the legacy origin env var is missing, it becomes a relative `/`, which just reloads this app's home page.
- Like `/competicoes`, the mobile list and the desktop grid are both in the DOM and share one snippet.
