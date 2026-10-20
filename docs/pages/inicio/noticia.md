# Notícia (article)

- **Route:** `/noticias/{year}/{month}/{day}/{slug}`
- **Tab:** Início
- **Files:** `src/routes/noticias/[year]/[month]/[day]/[slug]/`, `src/lib/server/articles/index.ts`, `src/lib/components/articles/ArticleMedia.svelte`

Shows one news article. Reached from an `ArticleCard` in the home feed or from a shared link.

## What's on the page

- The article media at the top, when there is any: an image, a video or a YouTube embed.
- Title, date and the first tag.
- The description (lead), when set.
- The article body, rendered as HTML in `prose rich-text`.
- An ad after the lead, an ad at the end, and the partner grid.

## How it works

- The URL keeps the legacy shape. The server looks for visible articles published on that Lisbon day, newest id first, and picks the first one whose `slugify(title)` equals the slug.
- The meta description is the article description, or the first 160 characters of the body with the HTML stripped.

## Edge cases and pitfalls

- **The slug is computed from the title, not stored.** If an editor changes a title in the backoffice, the old URL stops working (404). Unlike clubs and players, there is no redirect to a canonical URL here.
- Two articles on the same day with titles that slugify the same way: the one with the highest id wins.
- Media is dropped silently when it can't be shown: a YouTube URL with no readable video id, or an image/video row with no URL. The article still renders, just without media.
- The body is trusted HTML from the backoffice and goes through `{@html}`. Treat any change to `prepareArticleHtml` carefully.
- The ad units are wrapped in `{#key page.url.pathname}` so a fresh ad loads when you go from one article to another.
- `/noticias` on its own is not this page. It redirects (301) to `/`.
