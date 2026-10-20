# Notícia (article)

- **Route:** `/noticias/{year}/{month}/{day}/{slug}`
- **Tab:** Início
- **Files:** `src/routes/noticias/[year]/[month]/[day]/[slug]/`, `src/lib/server/articles/index.ts`, `src/lib/components/articles/ArticleMedia.svelte`, `src/lib/server/article-comments.ts`, `src/lib/article-comments.ts`, `src/lib/components/articles/ArticleComments.svelte` and `CommentComposer.svelte`

Shows one news article. Reached from an `ArticleCard` in the home feed or from a shared link.

## What's on the page

- The article media at the top, when there is any: an image, a video or a YouTube embed.
- Title, date and the first tag.
- The description (lead), when set.
- The article body, rendered as HTML in `prose rich-text`.
- An ad after the lead, an ad at the end, and the partner grid.
- **Comments** (`#comentarios`), after the end ad: threads oldest first, each with its replies indented below. Signed-in readers get a composer at the bottom of the card and a "Responder" link on every comment; guests get a "Entra para comentar" prompt that signs them in and brings them back to `#comentarios`.

## How it works

- The URL keeps the legacy shape. The server looks for visible articles published on that Lisbon day, newest id first, and picks the first one whose `slugify(title)` equals the slug.
- The meta description is the article description, or the first 160 characters of the body with the HTML stripped.

- Comments port the legacy `ArticleCommentsController`s on the shared `article_comments` table. The page load reads them with the article; posting and deleting are the `?/comment` and `?/deleteComment` form actions, which work without JavaScript too. With JavaScript, the list refreshes in place and a new comment flashes `accent-tint` once.
- Legacy rules kept: a comment is required and at most 255 characters (trimmed, counted in code points like Laravel's `max`); a user can post once every 10 seconds, across all articles; deleting is a soft delete (`deleted = 1`) by the author or a user with the `admin` permission.
- Replies use `article_comment_id`. Threads are one level deep: replying to a reply stores the thread's top-level comment as the parent. The legacy UI never offered replies, so old data has none.

## Edge cases and pitfalls

- **A deleted top-level comment hides its whole thread**, replies included, as on the legacy site (it only loaded non-deleted top-level comments). The delete sheet says so when there are replies.
- Unlike the legacy site, deleted replies stay hidden (Laravel loaded `child_comments` without the `deleted` filter), and comments with empty content are hidden. Laravel's account-deletion job (`ProcessDeleteRequest`) sets `content` to null rather than removing the row.
- Comment text is rendered as plain text with line breaks kept. The legacy page injected it as HTML.
- Comment dates are relative ("há 2 h"), with the full date in the `title`. Rows with no `created_at` sort by id anyway.

- **The slug is computed from the title, not stored.** If an editor changes a title in the backoffice, the old URL stops working (404). Unlike clubs and players, there is no redirect to a canonical URL here.
- Two articles on the same day with titles that slugify the same way: the one with the highest id wins.
- Media is dropped silently when it can't be shown: a YouTube URL with no readable video id, or an image/video row with no URL. The article still renders, just without media.
- The body is trusted HTML from the backoffice and goes through `{@html}`. Treat any change to `prepareArticleHtml` carefully.
- The ad units are wrapped in `{#key page.url.pathname}` so a fresh ad loads when you go from one article to another.
- `/noticias` on its own is not this page. It redirects (301) to `/`.
